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

The harness imports `Stage`, `clipOpacity`, `easeInOutCubic` **from `src`**
(they are not public): a single source of truth, no duplication to
resync. The DOM measurement is real → we also see the **re-layout** of a
`set_content` (font refit, ResizeObserver), not just the movement
"intended" by the engine.

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

## Ideas to go further

- **Automate in CI**: a Playwright script (use `channel: 'chrome'`
  to reuse the system Chrome, without downloading Chromium) that loads the
  harness, waits for measurement, screenshots, and reads `__VALIDATION__`.
- **Visual regression**: since the rendering is deterministic, reference
  contact sheets (golden) + a pixel diff (`odiff`, `pixelmatch`,
  `jest-image-snapshot`) provide **non-flaky** snapshots — the usual pain
  point disappears.
