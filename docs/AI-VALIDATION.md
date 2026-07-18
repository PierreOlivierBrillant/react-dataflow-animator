# Have the rendering validated by an AI

How to ask an AI (vision or otherwise) to judge whether an animation is
**clear** and **fluid**, exploiting the fact that the engine is a pure
function `evaluate(timeline, t)`.

## Principle: time is addressable data

Having an AI watch the animation "live" is the worst medium: a model
reads video poorly, and live playback adds unnecessary flakiness. Since everything
stems from `evaluate(timeline, t)`, we transform time into data and separate two
unrelated questions:

| Question                                   | Good medium                      | Tool                            |
| ------------------------------------------ | -------------------------------- | ------------------------------- |
| "Is it **clear**?" (overlaps, readability) | still images                     | Vite harness → contact sheet    |
| "Is it **fluid**?" (`set_content`, `move`) | **curve of the value-over-time** | Vite harness → curve panels     |
| Structural safeguard (CI, pre-commit)      | JSON                             | `extract-curves.mjs` (headless) |

Fluidity **is not in a frame**: it is a property of the derivative. A
screenshot cannot reveal it; the curve must be drawn.

## Tool 1 — visual harness (both channels)

Vite serves a harness that, for a given demo, renders **a frozen `Stage` at each
`timeline.stops[]`** (contact sheet) and, for each `set_content`, plots
the **actual crossfade opacity** (`clipOpacity`, which also drives the geometry
lerp) against the same curve passed through `easeInOutCubic`.

```bash
npm run harness -w react-dataflow-animator
# → http://localhost:5199/?demo=spa&mode=light
```

URL parameters: `?demo=<id>` (see the navigation bar for the list),
`?mode=light|dark` and `?theme=<palette>` (`default` | `dots` | `blueprint` |
`pcb` | `chalk` | `terminal` | `paper` | `neon` — the same two axes as the
player's props, so a palette can be eyeballed on any demo).

The harness imports `Stage` from the package's own `src`, and `compile`,
`clipOpacity`/`contentCrossfade` from `@react-dataflow-animator/core` (none of
them public): a single source of truth, no duplication to resync. The DOM
measurement is real → we also see the **re-layout** of a `set_content` (font
refit, ResizeObserver), not just the movement "intended" by the engine.

### How an AI consumes it

Via the **chrome-devtools** MCP server already in place:

1. `navigate_page` / `new_page` → the URL above.
2. `take_screenshot` (`fullPage: true`) → **a single image** provides the
   contact sheet + the curves. The AI judges clarity and fluidity at once.
3. `evaluate_script` → `window.__VALIDATION__` exposes the numerical series
   (`stops`, and per `set_content` the `{ t, actual, eased }` samples), to
   reason about the numbers without OCR-ing the curve.

## Tool 2 — headless extractor (structure, no browser)

Detects defects that are decided at compile time, without rendering pixels:
cut/short explicit fades, overlap of two contents on the same
node. Fast signal for CI.

```bash
npm run build:lib                                   # dist must exist
node scripts/extract-curves.mjs --demo spa          # readable summary
node scripts/extract-curves.mjs --demo spa --json   # JSON
```

> Intentionally limited to the public API (`compile`): it **does not reimplement**
> `clipOpacity`. The DEFAULT fade duration is therefore not visible here — if the
> spec does not set `fadeInMs`/`fadeOutMs`, it's up to the harness to show the real
> curve. The tool invents no fade numbers.

## Worked case: "the `set_content` lacks fluidity"

The harness makes it obvious. The **red** curve (actual opacity) is a
**linear trapezoid**: constant velocity then sharp cut at the corners
(`max discontinuity ≈ 4/s`). The **green** curve shows the same crossfade passed
through `easeInOutCubic` — softened start and arrival. The engine already has the
easing function; `clipOpacity`'s crossfade, however, is linear. This is where
fluidity is won, and the AI immediately sees what to change and where.

The contrast is most telling on a **short window** (little hold): the
`spa` demo has a second `set_content` of ~750 ms that illustrates it well.

## Tool 3 — A/B harness, pixel-diff gate and perf baseline

Ahead of reimplementing `Stage.tsx`'s rendering as a framework-agnostic DOM
renderer (`@react-dataflow-animator/core/dom/mount`), the harness gained a
measurement instrument: a side-by-side comparison mode, a pixel-diff gate
calibrated against its own noise floor, and a perf baseline to catch a
regression once the real renderer replaces today's placeholder.

### A/B mode (`?ab=1`)

```bash
npm run harness -w react-dataflow-animator
# → http://localhost:5199/?ab=1&demo=spa&probePct=0.5
```

Renders two fixed-size (480×320), frozen-`t` panels side by side:

- **panel A** — the real React `Stage`;
- **panel B** — `mountVanillaStage` (default), or a SECOND independent React
  `Stage` mount of the identical spec (`panelB=react`), used to calibrate the
  gate itself (see self-test below).

Extra URL parameters, on top of `?demo=`/`?mode=`/`?theme=`/`?locale=` from
the normal harness: `?probeT=<ms>` or `?probePct=<0..1>` (fraction of the
compiled duration — lets a script ask for "25%" without first looking up that
demo's own duration) freeze the instant both panels render at; the default is
the timeline's midpoint. `window.__AB__` exposes `{ demo, t, durationMs,
panelB, ready }` for scripts to poll.

### Self-test — calibrating the gate against itself

```bash
npm run harness:selftest -w react-dataflow-animator
```

`selftest.ab.spec.ts` proves the MEASUREMENT has zero noise floor before
trusting it to judge anything, over every risk demo (`riskDemos.ts`, the same
list `harness.visual.spec.ts` golden-tests) × both themes:

- **successive capture** — screenshot panel A twice in a row (same mount, no
  time change): must be 0.00%, or something is still settling (fonts,
  ResizeObserver, a wall-clock CSS animation);
- **cross-mount** — screenshot panel A against panel B mounted as a SECOND,
  independent React `Stage` (`panelB=react`) of the identical spec/`t`: must
  be 0.00%, or DOM measurement itself is nondeterministic across mounts.

Both checks require EXACTLY 0.00% on every demo × theme (20 checks). While
building this, the self-test caught a real bug: a `loading` spinner is a
native CSS `@keyframes` animation, driven by the browser's wall clock rather
than React's `t` — so two successive captures drifted even with `t` frozen.
The fix is `animations: 'disabled'` on the `.screenshot()` calls (the same
mechanism `expect(page).toHaveScreenshot()` already applies by default in
`harness.visual.spec.ts` — just not, until then, on a raw `.screenshot()`
call). Until this suite reports 0.00% everywhere, don't trust `compare`'s
numbers.

### Compare — the actual A/B pixel-diff gate

```bash
npm run harness:compare -w react-dataflow-animator
COMPARE_THRESHOLD=0.005 npm run harness:compare -w react-dataflow-animator  # override the 0.1% default
```

`compare.ab.spec.ts` walks every risk demo × 5 instants (0/25/50/75/100% of
duration) × 2 themes (50 cells), diffs panel A against panel B with
`pixelmatch`, and fails any cell whose diff ratio exceeds a threshold
(`COMPARE_THRESHOLD` env var, default 0.1%). **Panel B is currently the
documented placeholder** (`core/dom/mount.ts`): every cell is expected to
fail today (an empty box vs. a real diagram) — that is normal, not a
regression. This gate starts being meaningful once the real renderer replaces
the placeholder; it is deliberately NOT wired into the root `npm run` check
sequence or CI yet.

Both `compare.ab.spec.ts` and `selftest.ab.spec.ts` run under
`playwright.compare.config.ts` — a config dedicated to these two files, never
`test:visual`'s goldens: its own port (5198, distinct from the interactive
harness's default 5199) and `reuseExistingServer: false` unconditionally, so
a developer's already-running `npm run harness` session is never silently
reused mid-measurement (the documented port-5199 trap). Because every cell of
`compare.ab.spec.ts` currently fails, and Playwright restarts the worker
process after each failing test (fresh module state), per-cell rows are
accumulated on disk (`abResults.ts`, gitignored scratch) rather than in an
in-memory array; the final table is printed from `globalTeardown.ts`, which
Playwright guarantees runs exactly once, in the main process, regardless of
worker restarts.

### Perf baseline

```bash
npm run harness:bench -w react-dataflow-animator
```

`scripts/bench-perf.mjs` drives the harness's `?bench=1&demo=<id>` page — a
single `Stage`, autoPlay + loop via the SAME `useClock` hook `DataFlowPlayer`
uses (not a reimplementation) — for ~300 frames on `circuit` (heavy: dense
orthogonal routing) and `clientServer` (average), and records, via Playwright

- CDP:

* the wall-clock gap between successive `requestAnimationFrame` callbacks
  (mean/median/p95/min/max) — the cadence a user actually experiences;
* the CDP `Performance` domain's script/layout/style/task duration deltas
  over the whole run — a breakdown by phase, useful once there is a second
  (vanilla) renderer to compare against.

Results are saved to the versioned
`scripts/validation-harness/bench-baseline.json` — the baseline the step-2.6
gate (vanilla renderer vs. this number) will compare against. Two caveats:

- at these demos' sizes, render cost is comfortably under the 16.7ms frame
  budget, so the wall-clock frame time reads as vsync-locked (~16.7ms)
  regardless of renderer cost — the CDP script/layout/style breakdown is the
  more sensitive signal;
- the numbers are machine-dependent: a future CI-run comparison should either
  regenerate the baseline in that same environment or compare both renderers
  within the SAME run, not diff raw milliseconds captured on different
  machines.

## Ideas to go further

- **Automate in CI**: a Playwright script (use `channel: 'chrome'`
  to reuse the system Chrome, without downloading Chromium) that loads the
  harness, waits for measurement, screenshots, and reads `__VALIDATION__`.
- **Visual regression**: since the rendering is deterministic, reference
  contact sheets (golden) + a pixel diff (`odiff`, `pixelmatch`,
  `jest-image-snapshot`) provide **non-flaky** snapshots — the usual pain
  point disappears.
