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
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { compile } from '../../src/engine/compiler';
import type { Clip, Timeline } from '../../src/engine/timeline';
import {
  clipOpacity,
  contentCrossfade,
} from '../../src/components/clipOpacity';
import { Stage } from '../../src/components/Stage';
import { highlightCode } from '../../src/highlight/highlight';
import type { DataFlowSpec } from '../../src/types';
import { demosById } from '../../../../apps/docs/src/site-content/demos';
import '../../src/styles/dataflow.css';
import './harness.css';

const params = new URLSearchParams(window.location.search);
const demoId = params.get('demo') ?? 'spa';
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';

// demosById maps id → { id, title, spec, … } (gallery metadata): the
// raw spec is under `.spec`, not the object itself.
const catalog = demosById as Record<string, { id: string; spec: DataFlowSpec }>;
const spec = catalog[demoId]?.spec;

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
    <main className="harness" data-theme={theme}>
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
                href={`?demo=${id}&theme=${theme}`}
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
createRoot(document.getElementById('root')!).render(<App />);
