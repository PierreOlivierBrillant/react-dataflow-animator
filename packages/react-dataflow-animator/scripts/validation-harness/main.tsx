/**
 * Visual validation harness — not a published component.
 *
 * Two channels, both deterministic (the engine is `evaluate(timeline, t)`):
 *
 *  - CLARITY → a "contact sheet": a frozen Stage at each `timeline.stops[]`.
 *    A vision AI judges at a glance overlaps, readability, out-of-bounds,
 *    across the whole scenario. Real DOM measurement → we also see the
 *    re-layout of a `set_content` (font refit, ResizeObserver), not
 *    just the "intended" movement.
 *
 *  - FLUIDITY → the curve of the value-over-time. Fluidity is NOT in
 *    a frame: it's a property of the derivative. For each `set_content`, we
 *    plot the REALLY rendered opacity (`contentCrossfade`, which also drives the
 *    geometry lerp on the Stage side) against the old linear crossfade
 *    (`clipOpacity` raw) as a reference. The rendered curve is now an S of
 *    `easeInOutCubic` — slowed down start and arrival; the displayed jerk quantifies
 *    the gain compared to linear.
 *
 * We reuse the TRUE render functions (`contentCrossfade`, `clipOpacity`,
 * `compile`, `Stage`) imported from `src`: a single source of truth, no
 * duplication to manually resync.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { compile } from '@react-dataflow-animator/core/engine/compiler';
import {
  evaluate,
  type Clip,
  type SetContentClip,
  type Timeline,
} from '@react-dataflow-animator/core/engine/timeline';
import {
  clipOpacity,
  contentCrossfade,
} from '@react-dataflow-animator/core/render/clipOpacity';
import { mountVanillaStage } from '@react-dataflow-animator/core/dom/mount';
import { mountVanillaPlayer } from '@react-dataflow-animator/core/dom/player';
import {
  firstDifference,
  normalizeStageHtml,
} from '@react-dataflow-animator/core/dom/normalizeHtml';
import { DataFlowPlayer } from '../../src/DataFlowPlayer';
import { Stage } from '../../src/components/Stage';
import { Controls } from '../../src/components/Controls';
import { useClock, type Clock } from '../../src/hooks/useClock';
import { highlightCode } from '@react-dataflow-animator/core/highlight/highlight';
import type { DataFlowSpec, PlayerTheme } from '../../src/types';
import {
  demosById,
  getSpec,
} from '../../../../apps/docs/src/site-content/demos';
import '../../src/styles/dataflow.css';
import './harness.css';

const params = new URLSearchParams(window.location.search);
const demoId = params.get('demo') ?? 'spa';
// `mode` = light/dark, `theme` = palette — same two axes as the player props.
const mode = params.get('mode') === 'dark' ? 'dark' : 'light';
const THEMES = [
  'default',
  'dots',
  'blueprint',
  'pcb',
  'chalk',
  'terminal',
  'paper',
  'neon',
] as const satisfies readonly PlayerTheme[];
const isTheme = (v: string | null): v is PlayerTheme =>
  (THEMES as readonly string[]).includes(v ?? '');
const themeParam = params.get('theme');
const theme: PlayerTheme = isTheme(themeParam) ? themeParam : 'default';
const locale = params.get('locale') === 'fr' ? 'fr' : 'en';

// demosById maps id → Demo (gallery metadata). `Demo.spec` may be a localized
// BUILDER `(locale) => DataFlowSpec`, so we resolve it through `getSpec` rather
// than passing the raw function to `compile` (which expects a DataFlowSpec).
const catalog = demosById;
const demo = catalog[demoId];
const spec: DataFlowSpec | undefined = demo ? getSpec(demo, locale) : undefined;

// ─── A/B mode (?ab=1) ──────────────────────────────────────────────────────
// Side-by-side, fixed-size, frozen-`t` comparison of the React `Stage` against
// the framework-agnostic DOM renderer being built in
// `@react-dataflow-animator/core/dom/mount` — see docs/AI-VALIDATION.md and
// scripts/validation-harness/compare.ab.spec.ts (the pixel-diff gate that
// drives this page).
const isAB = params.has('ab');
// Mount-vs-update mode (?mu=1). Both panels are the VANILLA renderer: panel A
// is mounted fresh at `t`, panel B is mounted at the start of the timeline and
// walked to `t` with `update()`. It is the proof that retained mode does not
// drift, and — unlike the A/B gate — it does not involve React at all, so it
// stays meaningful after the 2.6 switchover. See mountUpdate.ab.spec.ts.
const isMU = params.has('mu');
// `?chrome=1` widens the A/B comparison from the stage alone to the WHOLE
// player: control bar included. The diff target is already
// `[data-ab-panel="x"] .rdfa-player`, so the chrome enters the comparison
// without changing the selector.
const isChrome = params.has('chrome');
// `?walk=1` drives BOTH panels through the same sequence of instants before
// capturing, instead of mounting each at a frozen `t`. It is the only mode that
// reproduces the real playback scenario on both sides — and therefore the only
// one that compares React and the vanilla renderer on states that depend on the
// PATH taken (`iconGeomByNode`), which a frozen mount cannot reach.
const isWalk = params.has('walk');
// `panelB=react` mounts a SECOND, independent React `Stage` instead of the
// vanilla renderer: two mounts of the identical spec/t, used by
// selftest.ab.spec.ts to calibrate the gate itself (0.00% expected) before
// it's trusted to judge the real (React vs. vanilla) diff.
// `panelB=player` drives panel B with the PUBLISHED React component instead of
// calling `mountVanillaPlayer` by hand. Same expected markup as `vanilla` in
// chrome mode — which is the point: any difference is overhead or drift the
// wrapper introduced between the props and the core's options.
const panelBMode: 'vanilla' | 'react' | 'player' =
  params.get('panelB') === 'react'
    ? 'react'
    : params.get('panelB') === 'player'
      ? 'player'
      : 'vanilla';

/**
 * Resolves the single frozen instant the A/B page renders at, in priority
 * order: an explicit `?probeT=<ms>`, an explicit `?probePct=<0..1>` (fraction
 * of the compiled timeline duration — lets the compare grid ask for "25%"
 * without first having to look up each demo's duration), or the midpoint of
 * the timeline as a representative, non-trivial default frame.
 */
function resolveFrozenT(durationMs: number): number {
  const probeTParam = params.get('probeT');
  if (probeTParam != null) return Number(probeTParam);
  const probePctParam = params.get('probePct');
  if (probePctParam != null) {
    const pct = Math.min(1, Math.max(0, Number(probePctParam)));
    return durationMs * pct;
  }
  return durationMs * 0.5;
}

// ─── Perf bench mode (?bench=1) ────────────────────────────────────────────
// A minimal page — one `Stage`, no filmstrip/curves chrome — driven by the
// SAME `useClock` hook `DataFlowPlayer` uses (autoPlay + loop), so the
// measured cadence is the real player's, not a reimplementation of it. See
// scripts/bench-perf.mjs and docs/AI-VALIDATION.md.
const isBench = params.has('bench');
const benchFrames = Number(params.get('frames') ?? '300');
const BENCH_PANEL = { width: 640, height: 420 };
// Which renderer the bench drives. Both are measured in the SAME run (see
// scripts/bench-perf.mjs) because these figures are machine-dependent.
// `wrapper` measures the published `DataFlowPlayer` — the vanilla renderer plus
// whatever the React wrapper costs per frame (expected: nothing, since the
// wrapper renders nothing once mounted).
const benchRenderer =
  params.get('renderer') === 'vanilla'
    ? 'vanilla'
    : params.get('renderer') === 'wrapper'
      ? 'wrapper'
      : 'react';

/**
 * The passive rAF sampler, shared by both bench renderers.
 *
 * It only records the wall-clock gap between frames; the renderer's own loop is
 * what advances `t`. Both callbacks land in the same animation-frame batch, so
 * the gap still reflects the real per-frame cost.
 */
function useBenchSampler(): void {
  useEffect(() => {
    const samples: number[] = [];
    let last: number | null = null;
    let raf = 0;
    const sample = (now: number) => {
      if (last != null) samples.push(now - last);
      last = now;
      if (samples.length >= benchFrames) {
        (window as unknown as { __BENCH__: unknown }).__BENCH__ = {
          demo: demoId,
          renderer: benchRenderer,
          frames: samples.length,
          samples,
          done: true,
        };
        return;
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, []);
}

/**
 * The published component under the same protocol as `VanillaBenchApp`.
 *
 * Identical panel, identical options — it IS `VanillaBenchApp` with
 * `<DataFlowPlayer>` in place of the imperative mount, which is exactly the
 * delta being measured.
 */
function WrapperBenchApp() {
  useBenchSampler();
  if (!spec) return null;
  return (
    <DataFlowPlayer
      spec={spec}
      height={BENCH_PANEL.height}
      width={BENCH_PANEL.width}
      controls={false}
      autoPlay
      loop
      theme={theme}
      mode={mode}
    />
  );
}

/** The vanilla player under the same protocol as `BenchApp`: autoplay + loop. */
function VanillaBenchApp() {
  const slotRef = useRef<HTMLDivElement | null>(null);
  useBenchSampler();
  useEffect(() => {
    const container = slotRef.current;
    if (!container || !spec) return;
    const player = mountVanillaPlayer(container, spec, {
      height: BENCH_PANEL.height,
      width: BENCH_PANEL.width,
      // No chrome, so the measurement compares the RENDERER against the React
      // bench's bare `Stage`, not two different amounts of furniture.
      controls: false,
      autoPlay: true,
      loop: true,
      theme,
      mode,
    });
    return () => player.destroy();
  }, []);
  if (!spec) return <div className="harness-error">Unknown demo: {demoId}</div>;
  return <div ref={slotRef} />;
}

function BenchApp() {
  if (!spec) {
    return (
      <div className="harness-error">
        Unknown demo: <code>{demoId}</code>. Available demos:{' '}
        {Object.keys(catalog).sort().join(', ')}
      </div>
    );
  }
  const { timeline } = compile(spec);
  const clock = useClock({
    durationMs: timeline.durationMs,
    autoPlay: true,
    loop: true,
  });

  // A SEPARATE, passive rAF loop just measures the wall-clock gap between
  // successive frames; `useClock`'s own rAF loop (started by `autoPlay`)
  // is what actually advances `t` and re-renders `Stage` below. Both
  // callbacks are scheduled in the same browser animation-frame batch, so
  // the gap this loop measures still reflects the real per-frame cost
  // (React re-render + DOM commit + layout/paint) the player pays.
  useEffect(() => {
    const samples: number[] = [];
    let last: number | null = null;
    let raf = 0;
    const sample = (now: number) => {
      if (last != null) samples.push(now - last);
      last = now;
      if (samples.length >= benchFrames) {
        (window as unknown as { __BENCH__: unknown }).__BENCH__ = {
          demo: demoId,
          frames: samples.length,
          samples,
          done: true,
        };
        return;
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="rdfa-player"
      data-theme={theme}
      data-mode={mode}
      style={{ width: BENCH_PANEL.width, height: BENCH_PANEL.height }}
    >
      <Stage
        spec={spec}
        timeline={timeline}
        t={clock.t}
        highlight={highlightCode}
        density="comfortable"
      />
    </div>
  );
}

const AB_PANEL = { width: 480, height: 320 };

/**
 * Mounts the framework-agnostic renderer inside a flex slot sized like
 * `.rdfa-stage`.
 *
 * `path` is what the mount-vs-update gate drives: the renderer is mounted at
 * `path[0]` and then walked through the remaining instants with `update()`, so
 * the panel ends up at the same `t` a fresh mount would have been given — but
 * having got there the way playback actually gets there. Omitted (or a single
 * entry), it is a plain frozen-`t` mount, which is what the A/B gate uses.
 */
function VanillaPanel({
  spec,
  t,
  path,
}: {
  spec: DataFlowSpec;
  t: number;
  path?: readonly number[];
}) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const walk = path && path.length > 0 ? path : [t];
  // The array identity would change on every render and re-run the effect;
  // its CONTENT is what matters.
  const walkKey = walk.join(',');
  useEffect(() => {
    const container = slotRef.current;
    if (!container) return;
    const steps = walkKey.split(',').map(Number);
    const handle = mountVanillaStage(container, spec, steps[0]);
    for (let i = 1; i < steps.length; i++) handle.update(steps[i]);
    // The convergence diagnostic, republished for scripts to read. `converged:
    // false` means the measurement BUDGET stopped the loop rather than the
    // geometry settling — see core/src/dom/settle.ts for why that matters.
    const w = window as unknown as { __AB__?: Record<string, unknown> };
    if (w.__AB__) {
      w.__AB__.passes = handle.passes;
      w.__AB__.converged = handle.converged;
    }
    return () => handle.destroy();
  }, [spec, walkKey]);
  // `display:flex` is NOT cosmetic. Panel A puts `.rdfa-stage` directly under
  // `.rdfa-player` (itself `display:flex; flex-direction:column`), and the stage
  // gets ALL its height from `flex: 1 1 auto` — every one of its children is
  // absolutely positioned, so its content height is 0. This wrapper adds one
  // nesting level; left as a plain block it would not be a flex container, the
  // stage's `flex` would be ignored, and panel B's stage would compute to height
  // 0 — `measure()` would never see a size and the root would stay
  // `visibility:hidden`. Every cell would then fail for a reason having nothing
  // to do with the renderer.
  return (
    <div
      ref={slotRef}
      style={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    />
  );
}

function ABPanel({
  label,
  panelId,
  children,
  bare,
}: {
  label: string;
  panelId: 'a' | 'b';
  children: ReactNode;
  /** The child renders its OWN `.rdfa-player` — `mountVanillaPlayer` does. */
  bare?: boolean;
}) {
  return (
    <section className="ab-panel" data-ab-panel={panelId}>
      <h2>{label}</h2>
      {bare ? (
        children
      ) : (
        <div
          className="rdfa-player"
          data-theme={theme}
          data-mode={mode}
          style={{ width: AB_PANEL.width, height: AB_PANEL.height }}
        >
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * A `Clock` frozen at `t`.
 *
 * `DataFlowPlayer` owns its clock and cannot be told to stand still from the
 * outside, so the chrome comparison assembles `Stage` + `Controls` by hand — the
 * same approach the panels already take for the stage. Every command is a no-op:
 * the gate captures a still frame, and a control that moved would break the
 * self-test's successive-capture invariant.
 */
function frozenClock(t: number, durationMs: number): Clock {
  const noop = () => {};
  return {
    t,
    playing: false,
    durationMs,
    play: noop,
    pause: noop,
    toggle: noop,
    seek: noop,
    playTo: noop,
    restart: noop,
  };
}

/** Mounts the framework-agnostic PLAYER — stage plus chrome — paused at `t`. */
function VanillaPlayerPanel({
  spec,
  t,
  path,
}: {
  spec: DataFlowSpec;
  t: number;
  path?: readonly number[];
}) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const walk = path && path.length > 0 ? path : [t];
  const walkKey = walk.join(',');
  useEffect(() => {
    const container = slotRef.current;
    if (!container) return;
    const steps = walkKey.split(',').map(Number);
    const player = mountVanillaPlayer(container, spec, {
      height: AB_PANEL.height,
      width: AB_PANEL.width,
      theme,
      mode,
      controls: true,
      autoPlay: false,
      // Opens AT the first instant of the walk rather than at 0 and seeking:
      // the icon→panel anchor is captured on the first measurement, so where
      // the player opens is part of what it renders.
      initialT: steps[0],
    });
    for (const step of steps.slice(1)) player.clock.seek(step);
    return () => player.destroy();
  }, [spec, walkKey]);
  return <div ref={slotRef} />;
}

/**
 * Panel B driven by the PUBLISHED `DataFlowPlayer`.
 *
 * Deliberately declarative: props only, no handle, no imperative seek. That is
 * the whole assertion — if the component can be given the same instant and box
 * as `VanillaPlayerPanel` gets imperatively and produce the same pixels, then
 * the prop→option mapping is lossless.
 *
 * Frozen `t` only. The wrapper's clock is not reachable from outside, so a walk
 * cannot be replayed through it; asking for one is a harness error rather than
 * something to silently approximate.
 */
function WrapperPlayerPanel({ spec, t }: { spec: DataFlowSpec; t: number }) {
  // Loud on purpose: a silently-ignored `walk` would leave a cell measuring
  // something other than what its name claims.
  if (isWalk)
    throw new Error(
      'panelB=player cannot walk: the wrapper does not expose its clock. ' +
        'Drop &walk=1, or use panelB=vanilla for a walk cell.'
    );
  return (
    <DataFlowPlayer
      spec={spec}
      height={AB_PANEL.height}
      width={AB_PANEL.width}
      theme={theme}
      mode={mode}
      controls
      autoPlay={false}
      initialT={t}
    />
  );
}

/**
 * Panel A under `?walk=1`: re-renders `Stage` across the sequence, ONE COMMIT
 * PER STEP.
 *
 * The per-step commit is the whole point. React accumulates `iconGeomByNode`
 * from the geometry measured between renders, so only a real sequence of
 * renders reproduces what production does — a single render at the target `t`
 * lands on a different icon anchor. Publishing `ready` at the end is what keeps
 * the gate from capturing mid-walk.
 */
function StageWalk({
  spec,
  timeline,
  path,
}: {
  spec: DataFlowSpec;
  timeline: Timeline;
  path: readonly number[];
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= path.length - 1) {
      const w = window as unknown as { __AB__?: Record<string, unknown> };
      if (w.__AB__) w.__AB__.ready = true;
      return;
    }
    const raf = requestAnimationFrame(() => setI(i + 1));
    return () => cancelAnimationFrame(raf);
  }, [i, path.length]);

  return (
    <Stage
      spec={spec}
      timeline={timeline}
      t={path[i]}
      highlight={highlightCode}
      density="comfortable"
    />
  );
}

function ABApp() {
  if (!spec) {
    return (
      <div className="harness-error">
        Unknown demo: <code>{demoId}</code>. Available demos:{' '}
        {Object.keys(catalog).sort().join(', ')}
      </div>
    );
  }
  const { timeline } = compile(spec);
  const t = resolveFrozenT(timeline.durationMs);

  // Same inline-during-render publication style as `__VALIDATION__` below:
  // a plain diagnostic global, read by compare.ab.spec.ts / selftest.ab.spec.ts
  // via `page.evaluate`.
  (window as unknown as { __AB__: unknown }).__AB__ = {
    demo: demoId,
    t,
    durationMs: timeline.durationMs,
    panelB: panelBMode,
    chrome: isChrome,
    walk: isWalk,
    // A walk is only comparable once panel A has committed every step of it;
    // `StageWalk` flips this when it lands on the target.
    ready: !isWalk,
  };

  const path = isWalk
    ? cumulativePath(timeline.durationMs, t / (timeline.durationMs || 1))
    : undefined;

  const reactStage = isWalk ? (
    <StageWalk spec={spec} timeline={timeline} path={path!} />
  ) : (
    <Stage
      spec={spec}
      timeline={timeline}
      t={t}
      highlight={highlightCode}
      density="comfortable"
    />
  );

  // ONE definition of what a React panel contains, used by both sides. The
  // cross-mount self-test compares panel A against a second React mount, so an
  // asymmetry here would show up as a renderer difference that isn't one.
  const reactPanel = (
    <>
      {reactStage}
      {isChrome ? (
        <Controls
          clock={frozenClock(t, timeline.durationMs)}
          timeline={timeline}
          isFullscreen={false}
          onToggleFullscreen={() => {}}
        />
      ) : null}
    </>
  );

  return (
    <main className="harness ab-harness" data-theme={mode}>
      <header className="harness-bar">
        <h1>
          A/B — {demoId}{' '}
          <span>
            · t={Math.round(t)}ms · panel B = {panelBMode}
            {isChrome ? ' · chrome' : ''}
            {isWalk ? ' · walk' : ''}
          </span>
        </h1>
      </header>
      <div className="ab-grid">
        <ABPanel label="A — React (Stage.tsx)" panelId="a">
          {reactPanel}
        </ABPanel>
        <ABPanel
          label={
            panelBMode === 'react'
              ? 'B — React (self-test mount)'
              : panelBMode === 'player'
                ? 'B — react-dataflow-animator (DataFlowPlayer wrapper)'
                : 'B — Vanilla DOM (@react-dataflow-animator/core)'
          }
          panelId="b"
          // `bare` whenever the child builds its own `.rdfa-player` — which
          // `DataFlowPlayer` does, through the core.
          bare={isChrome && panelBMode !== 'react'}
        >
          {panelBMode === 'react' ? (
            reactPanel
          ) : panelBMode === 'player' ? (
            <WrapperPlayerPanel spec={spec} t={t} />
          ) : isChrome ? (
            <VanillaPlayerPanel spec={spec} t={t} path={path} />
          ) : (
            <VanillaPanel spec={spec} t={t} path={path} />
          )}
        </ABPanel>
      </div>
    </main>
  );
}

// ─── Mount-vs-update mode (?mu=1) ──────────────────────────────────────────

/**
 * The instants the walked panel passes through on its way to `t`: the compare
 * grid's own checkpoints, up to the target.
 *
 * Cumulative rather than a single jump on purpose. One `update()` would only
 * prove that a lone transition lands correctly; walking the whole grid is what
 * catches an error that ACCUMULATES over a sequence of frames, which is the
 * actual failure mode of a retained renderer.
 */
function cumulativePath(durationMs: number, pct: number): number[] {
  const checkpoints = [0, 0.25, 0.5, 0.75].filter((p) => p < pct);
  return [...checkpoints, pct].map((p) => durationMs * p);
}

function MUApp() {
  if (!spec) {
    return (
      <div className="harness-error">
        Unknown demo: <code>{demoId}</code>. Available demos:{' '}
        {Object.keys(catalog).sort().join(', ')}
      </div>
    );
  }
  const { timeline } = compile(spec);
  const pctParam = params.get('probePct');
  const pct =
    pctParam != null ? Math.min(1, Math.max(0, Number(pctParam))) : 0.5;
  const t = timeline.durationMs * pct;
  const path = cumulativePath(timeline.durationMs, pct);

  // A `set_content` caught MID-CROSSFADE is the one documented case where the
  // two paths legitimately disagree: the icon geometry anchoring the icon→panel
  // morph is captured once and never rewritten, so a fresh mount captures a
  // panel that has already partly grown while a walked mount captured the true
  // icon box. React has exactly the same path dependence — see the comment on
  // `iconGeomByNode` in core/src/dom/mount.ts. The gate reads this flag and
  // reports such a cell instead of asserting on it.
  const midCrossfade = evaluate(timeline, t).some((a) => {
    if (a.clip.kind !== 'set_content') return false;
    const p = contentCrossfade(a.clip as SetContentClip, t);
    return p > 0 && p < 1;
  });

  (window as unknown as { __AB__: unknown }).__AB__ = {
    demo: demoId,
    t,
    durationMs: timeline.durationMs,
    panelB: 'vanilla-updated',
    path,
    midCrossfade,
    ready: true,
  };

  // The gate reads the two subtrees through this, so the normaliser runs in the
  // page next to the DOM it describes rather than being reimplemented in the
  // Playwright process.
  (window as unknown as { __MU__: unknown }).__MU__ = {
    compare() {
      const read = (panel: 'a' | 'b'): string | null => {
        const stage = document.querySelector(
          `[data-ab-panel="${panel}"] .rdfa-stage`
        );
        return stage ? normalizeStageHtml(stage) : null;
      };
      const a = read('a');
      const b = read('b');
      if (a == null || b == null) return { ok: false, reason: 'missing-stage' };
      const diff = firstDifference(a, b);
      return diff == null
        ? { ok: true, length: a.length }
        : { ok: false, reason: 'diff', ...diff };
    },
  };

  return (
    <main className="harness ab-harness" data-theme={mode}>
      <header className="harness-bar">
        <h1>
          mount-vs-update — {demoId}{' '}
          <span>
            · t={Math.round(t)}ms · walk={path.map(Math.round).join('→')}
          </span>
        </h1>
      </header>
      <div className="ab-grid">
        <ABPanel label="A — Vanilla, fresh mount(t)" panelId="a">
          <VanillaPanel spec={spec} t={t} />
        </ABPanel>
        <ABPanel label="B — Vanilla, mount(0) + update(…)" panelId="b">
          <VanillaPanel spec={spec} t={t} path={path} />
        </ABPanel>
      </div>
    </main>
  );
}

// ─── Fluidity curve sampling ────────────────────────────────

interface CurveSample {
  t: number;
  /** What Stage displays: contentCrossfade (clipOpacity softened by easeInOutCubic). */
  rendered: number;
  /** "Before" reference: the linear crossfade of raw clipOpacity. */
  linear: number;
}

// We plot the FADE-IN REGION (the content's appearance + the geometry morph),
// not the clip's whole lifetime: a hold of several seconds
// would crush the ramp and proportional sampling would become too
// coarse to resolve the eased shape. Not fixed and fine → reliable metric.
const STEP_MS = 6;
const MAX_FADE_MS = 2000;

function sampleCrossfade(clip: Clip, durationMs: number): CurveSample[] {
  const start = Math.max(0, clip.startMs);
  const hardEnd = Math.min(durationMs, clip.visibleUntilMs);
  // End of fade = first instant the render reaches ~1 (capped).
  let fadeEnd = start;
  for (let t = start; t <= hardEnd && t <= start + MAX_FADE_MS; t += STEP_MS) {
    fadeEnd = t;
    if (contentCrossfade(clip, t) >= 0.999) break;
  }
  const end = Math.min(hardEnd, fadeEnd + 120); // margin: shows entry into the hold
  const out: CurveSample[] = [];
  for (let t = start; t <= end + 0.5; t += STEP_MS) {
    const tt = Math.min(t, end);
    out.push({
      t: tt,
      rendered: contentCrossfade(clip, tt),
      linear: clipOpacity(clip, tt),
    });
  }
  return out;
}

/**
 * Real duration of the fade-in, READ on the samples (therefore faithful to
 * the default fade of `clipOpacity`, which no spec field exposes).
 */
function riseMs(samples: CurveSample[]): number | null {
  if (samples.length === 0) return null;
  const start = samples[0].t;
  for (const s of samples)
    if (s.rendered >= 0.99) return Math.round(s.t - start);
  return null;
}

/** Largest velocity discontinuity (corner) on the series, in /second. */
function maxJerk(
  samples: CurveSample[],
  pick: (s: CurveSample) => number
): number {
  let prevV = 0;
  let max = 0;
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    if (dt <= 0) continue;
    const v = ((pick(samples[i]) - pick(samples[i - 1])) / dt) * 1000;
    max = Math.max(max, Math.abs(v - prevV));
    prevV = v;
  }
  return max;
}

// ─── Render ──────────────────────────────────────────────────────────────────

const W = 320;
const H = 90;

function path(
  samples: CurveSample[],
  pick: (s: CurveSample) => number
): string {
  if (samples.length === 0) return '';
  const t0 = samples[0].t;
  const span = Math.max(1, samples[samples.length - 1].t - t0);
  return samples
    .map((s, i) => {
      const x = ((s.t - t0) / span) * W;
      const y = H - pick(s) * H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function CurvePanel({ clip, timeline }: { clip: Clip; timeline: Timeline }) {
  const samples = sampleCrossfade(clip, timeline.durationMs);
  const objectId = 'objectId' in clip ? clip.objectId : '?';
  const rise = riseMs(samples);
  const jerkRendered = maxJerk(samples, (s) => s.rendered);
  const jerkLinear = maxJerk(samples, (s) => s.linear);
  return (
    <div className="curve">
      <div className="curve-head">
        <strong>set_content</strong> → <code>{objectId}</code>
        <span className="curve-meta">
          window {Math.round(clip.startMs)}–{Math.round(clip.visibleUntilMs)}ms
          {rise !== null ? ` · fade-in ≈ ${rise}ms` : ''}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="curve-svg"
        preserveAspectRatio="none"
      >
        <path d={path(samples, (s) => s.linear)} className="curve-linear" />
        <path d={path(samples, (s) => s.rendered)} className="curve-rendered" />
      </svg>
      <div className="curve-legend">
        <span className="dot dot-rendered" /> rendered (eased)
        <span className="dot dot-linear" /> before: linear
        <span className="curve-jerk">
          jerk: rendered ≈ {jerkRendered.toFixed(2)}/s · before ≈{' '}
          {jerkLinear.toFixed(2)}/s
        </span>
      </div>
    </div>
  );
}

function Filmstrip({
  spec,
  timeline,
}: {
  spec: DataFlowSpec;
  timeline: Timeline;
}) {
  return (
    <div className="filmstrip">
      {timeline.stops.map((stop, i) => (
        <figure className="frame" key={`${stop}-${i}`}>
          <figcaption>t={Math.round(stop)}ms</figcaption>
          <div
            className="rdfa-player"
            data-theme={theme}
            data-mode={mode}
            style={{ height: 280, width: 440 }}
          >
            <Stage
              spec={spec}
              timeline={timeline}
              t={stop}
              highlight={highlightCode}
              density="comfortable"
            />
          </div>
        </figure>
      ))}
    </div>
  );
}

// LIVE probe: a single Stage that continuously PLAYS (rAF) a short loop around
// the set_content. The icon→panel geometry morph is emergent from the
// frame-by-frame choreography (capturing `iconGeomByNode` when the clip
// becomes active, then forceRemeasure/ResizeObserver) — a frozen Stage or
// jumps in `t` do not reproduce it. The loop passes through the icon state at
// each cycle, which properly re-captures the geometry. We read the top edge
// as it plays (DOM poll) to verify the anchoring.
const PROBE_PRE_MS = 700;
const PROBE_POST_MS = 700;
const PROBE_SPEED = 0.18;

function LiveProbe({
  spec,
  timeline,
  clip,
}: {
  spec: DataFlowSpec;
  timeline: Timeline;
  clip: Clip;
}) {
  const lo = Math.max(0, clip.startMs - PROBE_PRE_MS);
  const hi = clip.startMs + PROBE_POST_MS;
  // ?probeT=<ms> freezes the probe at a precise instant (deterministic capture of a
  // mid-point); otherwise it loops.
  const frozenParam = params.get('probeT');
  const frozen = frozenParam != null ? Number(frozenParam) : null;
  const [t, setT] = useState(frozen ?? lo);
  useEffect(() => {
    const w = window as unknown as {
      __probe?: { start: number; objectId: string };
    };
    w.__probe = {
      start: clip.startMs,
      objectId: 'objectId' in clip ? clip.objectId : '?',
    };
    if (frozen != null) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      setT((prev) => {
        const next = prev + dt * PROBE_SPEED;
        return next > hi ? lo : next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [clip, lo, hi, frozen]);
  return (
    <div className="probe">
      <div className="probe-head">
        live probe · <code>{'objectId' in clip ? clip.objectId : '?'}</code> ·
        t=
        {Math.round(t)}ms
      </div>
      <div
        className="rdfa-player"
        data-theme={theme}
        data-mode={mode}
        style={{ height: 380, width: 560 }}
      >
        <Stage
          spec={spec}
          timeline={timeline}
          t={t}
          highlight={highlightCode}
          density="comfortable"
        />
      </div>
    </div>
  );
}

function App() {
  if (!spec) {
    return (
      <div className="harness-error">
        Unknown demo: <code>{demoId}</code>. Available demos:{' '}
        {Object.keys(catalog).sort().join(', ')}
      </div>
    );
  }
  const { timeline } = compile(spec);
  const setContentClips = timeline.clips.filter(
    (c) => c.kind === 'set_content'
  );

  // Exposed for machine reading (chrome-devtools MCP → evaluate_script,
  // or a Playwright script) without having to OCR the contact sheet.
  (window as unknown as { __VALIDATION__: unknown }).__VALIDATION__ = {
    demo: demoId,
    durationMs: timeline.durationMs,
    stops: timeline.stops,
    setContent: setContentClips.map((c) => ({
      objectId: 'objectId' in c ? c.objectId : null,
      window: [c.startMs, c.visibleUntilMs],
      samples: sampleCrossfade(c, timeline.durationMs),
    })),
  };

  return (
    // `data-theme` here emulates a themed HOST (the Docusaurus convention), so
    // it carries the light/dark mode — not one of the player's palette names.
    <main className="harness" data-theme={mode}>
      <header className="harness-bar">
        <h1>
          {demoId}{' '}
          <span>
            · {Math.round(timeline.durationMs)}ms · {timeline.stops.length}{' '}
            stops
          </span>
        </h1>
        <nav>
          {Object.keys(catalog)
            .sort()
            .map((id) => (
              <a
                key={id}
                href={`?demo=${id}&mode=${mode}&theme=${theme}`}
                aria-current={id === demoId}
              >
                {id}
              </a>
            ))}
        </nav>
      </header>

      <section>
        <h2>Clarity — contact sheet (one frozen Stage per stop)</h2>
        <Filmstrip spec={spec} timeline={timeline} />
      </section>

      {setContentClips.length > 0 && (
        <section className="probe-section">
          <h2>Live probe — actual appearance (animated geometry)</h2>
          <LiveProbe
            spec={spec}
            timeline={timeline}
            clip={setContentClips[0]}
          />
        </section>
      )}

      <section>
        <h2>
          Fluidity — crossfade of the {setContentClips.length} set_content
        </h2>
        {setContentClips.length === 0 ? (
          <p className="muted">No set_content in this demo.</p>
        ) : (
          <div className="curves">
            {setContentClips.map((clip, i) => (
              <CurvePanel clip={clip} timeline={timeline} key={i} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// No StrictMode: it double-invokes effects, which disrupts the precise
// iconGeom capture → forceRemeasure sequence of set_content. We remain faithful to
// the real render (Docusaurus doesn't wrap the player in StrictMode).
createRoot(document.getElementById('root')!).render(
  isBench ? (
    benchRenderer === 'vanilla' ? (
      <VanillaBenchApp />
    ) : benchRenderer === 'wrapper' ? (
      <WrapperBenchApp />
    ) : (
      <BenchApp />
    )
  ) : isMU ? (
    <MUApp />
  ) : isAB ? (
    <ABApp />
  ) : (
    <App />
  )
);
