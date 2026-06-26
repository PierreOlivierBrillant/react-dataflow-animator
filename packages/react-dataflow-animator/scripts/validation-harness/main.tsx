/**
 * Harnais de validation visuelle — pas un composant publié.
 *
 * Deux canaux, tous deux déterministes (le moteur est `evaluate(timeline, t)`) :
 *
 *  - CLARTÉ → une « planche-contact » : un Stage figé à chaque `timeline.stops[]`.
 *    Une IA de vision juge d'un coup les chevauchements, la lisibilité, le
 *    hors-cadre, sur tout le scénario. Mesure DOM réelle → on voit aussi le
 *    re-layout d'un `set_content` (refit de police, ResizeObserver), pas
 *    seulement le mouvement « voulu ».
 *
 *  - FLUIDITÉ → la courbe de la valeur-dans-le-temps. La fluidité n'est PAS dans
 *    une frame : c'est une propriété de la dérivée. Pour chaque `set_content`, on
 *    trace l'opacité RÉELLEMENT rendue (`contentCrossfade`, qui pilote aussi le
 *    lerp de géométrie côté Stage) contre l'ancien crossfade linéaire
 *    (`clipOpacity` brut) en référence. La courbe rendue est désormais une S de
 *    `easeInOutCubic` — départ et arrivée ralentis ; l'à-coup affiché chiffre le
 *    gain par rapport au linéaire.
 *
 * On réutilise les VRAIES fonctions du rendu (`contentCrossfade`, `clipOpacity`,
 * `compile`, `Stage`) importées depuis `src` : une seule source de vérité, aucune
 * duplication à resynchroniser à la main.
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

// demosById mappe id → { id, title, spec, … } (métadonnées de galerie) : le
// spec brut est sous `.spec`, pas l'objet lui-même.
const catalog = demosById as Record<string, { id: string; spec: DataFlowSpec }>;
const spec = catalog[demoId]?.spec;

// ─── Échantillonnage des courbes de fluidité ────────────────────────────────

interface CurveSample {
  t: number;
  /** Ce que Stage affiche : contentCrossfade (clipOpacity adouci par easeInOutCubic). */
  rendered: number;
  /** Référence « avant » : le crossfade linéaire de clipOpacity brut. */
  linear: number;
}

// On trace la RÉGION DE FONDU D'ENTRÉE (l'apparition du contenu + le morph de
// géométrie), pas toute la durée de vie du clip : un hold de plusieurs secondes
// écraserait la rampe et un échantillonnage proportionnel deviendrait trop
// grossier pour résoudre la forme eased. Pas fixe et fin → métrique fiable.
const STEP_MS = 6;
const MAX_FADE_MS = 2000;

function sampleCrossfade(clip: Clip, durationMs: number): CurveSample[] {
  const start = Math.max(0, clip.startMs);
  const hardEnd = Math.min(durationMs, clip.visibleUntilMs);
  // Fin du fondu = premier instant où le rendu atteint ~1 (plafonné).
  let fadeEnd = start;
  for (let t = start; t <= hardEnd && t <= start + MAX_FADE_MS; t += STEP_MS) {
    fadeEnd = t;
    if (contentCrossfade(clip, t) >= 0.999) break;
  }
  const end = Math.min(hardEnd, fadeEnd + 120); // marge : montre l'entrée dans le hold
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
 * Durée réelle du fondu d'entrée, LUE sur les échantillons (donc fidèle au
 * fondu par défaut de `clipOpacity`, qu'aucun champ de la spec n'expose).
 */
function riseMs(samples: CurveSample[]): number | null {
  if (samples.length === 0) return null;
  const start = samples[0].t;
  for (const s of samples)
    if (s.rendered >= 0.99) return Math.round(s.t - start);
  return null;
}

/** Plus grande discontinuité de vélocité (coin) sur la série, en /seconde. */
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

// ─── Rendu ──────────────────────────────────────────────────────────────────

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
          fenêtre {Math.round(clip.startMs)}–{Math.round(clip.visibleUntilMs)}ms
          {rise !== null ? ` · fondu d'entrée ≈ ${rise}ms` : ''}
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
        <span className="dot dot-rendered" /> rendu (eased)
        <span className="dot dot-linear" /> avant : linéaire
        <span className="curve-jerk">
          à-coup : rendu ≈ {jerkRendered.toFixed(2)}/s · avant ≈{' '}
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

// Sonde LIVE : un seul Stage qui JOUE en continu (rAF) une boucle courte autour
// du set_content. Le morph de géométrie icône→panneau est émergent de la
// choréographie image-par-image (capture d'`iconGeomByNode` quand le clip
// devient actif, puis forceRemeasure/ResizeObserver) — un Stage figé ou des
// sauts de `t` ne le reproduisent pas. La boucle repasse par l'état icône à
// chaque cycle, ce qui re-capture proprement la géométrie. On lit le bord haut
// au fil de la lecture (poll DOM) pour vérifier l'ancrage.
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
  // ?probeT=<ms> fige la sonde à un instant précis (capture déterministe d'un
  // mi-parcours) ; sinon elle joue en boucle.
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
        sonde live · <code>{'objectId' in clip ? clip.objectId : '?'}</code> ·
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
        Démo inconnue : <code>{demoId}</code>. Démos disponibles :{' '}
        {Object.keys(catalog).sort().join(', ')}
      </div>
    );
  }
  const { timeline } = compile(spec);
  const setContentClips = timeline.clips.filter(
    (c) => c.kind === 'set_content'
  );

  // Exposé pour une lecture machine (chrome-devtools MCP → evaluate_script,
  // ou un script Playwright) sans avoir à OCR la planche-contact.
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
            arrêts
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
        <h2>Clarté — planche-contact (un Stage figé par arrêt)</h2>
        <Filmstrip spec={spec} timeline={timeline} />
      </section>

      {setContentClips.length > 0 && (
        <section className="probe-section">
          <h2>Sonde live — apparition réelle (géométrie animée)</h2>
          <LiveProbe
            spec={spec}
            timeline={timeline}
            clip={setContentClips[0]}
          />
        </section>
      )}

      <section>
        <h2>Fluidité — crossfade des {setContentClips.length} set_content</h2>
        {setContentClips.length === 0 ? (
          <p className="muted">Aucun set_content dans cette démo.</p>
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

// Pas de StrictMode : il double-invoque les effets, ce qui perturbe la séquence
// précise capture iconGeom → forceRemeasure du set_content. On reste fidèle au
// rendu réel (Docusaurus n'enveloppe pas le player dans StrictMode).
createRoot(document.getElementById('root')!).render(<App />);
