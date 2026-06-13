import type { LineStyle, ObjectContent } from '../types';

/**
 * Représentation intermédiaire (IR) déterministe de la chronologie.
 *
 * Le compilateur (`compiler.ts`) transforme `spec.actions` en `Timeline`.
 * Le runtime se résume à une fonction PURE `evaluate(timeline, t)` : aucune
 * dépendance au DOM, au temps réel ou à une librairie d'animation. Le lecteur
 * se contente d'avancer `t` (via requestAnimationFrame) et de re-rendre.
 */

export type ClipKind =
  | 'move'
  | 'arrow'
  | 'loading'
  | 'set_content'
  | 'comment'
  | 'highlight'
  | 'set_visible';

interface ClipBase {
  /** Identifiant unique du clip (= id d'action si fourni, sinon généré). */
  id: string;
  kind: ClipKind;
  /** Instant (ms) où l'élément apparaît (monté/visible). */
  startMs: number;
  /** Début de l'ANIMATION (>= startMs). Avant : maintenu à l'état initial. */
  animStartMs: number;
  /** Fin de l'animation, en ms (l'élément est « posé »). */
  endMs: number;
  /** Instant (ms) jusqu'auquel l'élément reste monté/visible (>= endMs). */
  visibleUntilMs: number;
  /** Index de l'étape racine à laquelle ce clip appartient. */
  stepIndex: number;
  /** Vrai si l'action source avait keep_until_end : supprime le fondu de sortie. */
  keepEnd?: boolean;
  /** Durée du fondu d'apparition (ms). Absent = comportement par défaut. */
  fadeInMs?: number;
  /** Durée du fondu de disparition (ms). Absent = comportement par défaut (250 ms). */
  fadeOutMs?: number;
}

export interface MoveClip extends ClipBase {
  kind: 'move';
  /** ID de l'objet dynamique déplacé (paquet, requête…). */
  objectId: string;
  fromId: string;
  toId: string;
}

export interface ArrowClip extends ClipBase {
  kind: 'arrow';
  fromId: string;
  toId: string;
  style: LineStyle;
  arrow_head?: 'forward' | 'backward' | 'both' | 'none';
  text?: string;
}

export interface LoadingClip extends ClipBase {
  kind: 'loading';
  /** ID du nœud statique cible. */
  objectId: string;
}

export interface SetContentClip extends ClipBase {
  kind: 'set_content';
  /** ID du nœud statique muté. */
  objectId: string;
  content: ObjectContent;
}

export interface CommentClip extends ClipBase {
  kind: 'comment';
  /** ID du nœud statique de référence. Absent = commentaire omniscient (haut du stage). */
  nextToId?: string;
  text: string;
}

export interface HighlightClip extends ClipBase {
  kind: 'highlight';
  /** ID du nœud statique OU de la connexion à surligner. */
  targetId: string;
}

export interface SetVisibleClip extends ClipBase {
  kind: 'set_visible';
  /** ID du nœud statique dont la visibilité change. */
  objectId: string;
  /** true = le nœud apparaît, false = le nœud disparaît. */
  visible: boolean;
}

export type Clip =
  | MoveClip
  | ArrowClip
  | LoadingClip
  | SetContentClip
  | CommentClip
  | HighlightClip
  | SetVisibleClip;

export interface Step {
  index: number;
  startMs: number;
  /** Fin de l'étape (= début de la suivante, ou durée totale). */
  endMs: number;
  /** ID de l'action racine, si fourni. */
  actionId?: string;
  /** Sous-ensemble des clips actifs pendant cette étape (pré-calculé pour opti). */
  activeClips?: Clip[];
}

export interface Timeline {
  clips: Clip[];
  steps: Step[];
  /**
   * Points d'arrêt (ms) pour la navigation et les marques de la timeline. Un
   * `move` en produit deux : à l'apparition et à l'arrivée ; les autres actions
   * un seul (état « posé »).
   */
  stops: number[];
  durationMs: number;
}

export interface ActiveClip {
  clip: Clip;
  /** Progression de l'animation dans [0, 1] (1 si terminée mais maintenue). */
  progress: number;
  /** Vrai si l'animation est en cours (animStartMs <= t < endMs). */
  animating: boolean;
}

export const EMPTY_TIMELINE: Timeline = {
  clips: [],
  steps: [],
  stops: [],
  durationMs: 0,
};

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Easing « ease-in-out » cubique, pour des mouvements moins mécaniques. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Cœur du runtime : pour un instant `tMs`, renvoie les clips visibles avec leur
 * progression. Fonction pure et déterministe (le scrubbing arrière est gratuit).
 */
export function evaluate(timeline: Timeline, tMs: number): ActiveClip[] {
  // Optimisation O(K) : si les clips actifs ont été pré-calculés par étape
  if (timeline.steps.length > 0) {
    const stepIdx = stepIndexAt(timeline, tMs);
    const step = timeline.steps[stepIdx];
    if (step && step.activeClips) {
      return evaluateSubset(step.activeClips, tMs);
    }
  }

  const active: ActiveClip[] = [];

  // Fallback O(log N + K) : recherche dichotomique pour trouver le dernier clip démarré
  let low = 0;
  let high = timeline.clips.length - 1;
  let maxIdx = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (timeline.clips[mid].startMs <= tMs) {
      maxIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  for (let i = 0; i <= maxIdx; i++) {
    const clip = timeline.clips[i];
    // Borne supérieure INCLUSIVE : un élément reste visible à l'instant exact de
    // sa disparition (fin d'étape), pour que l'arrêt « Suivant » montre l'étape.
    if (tMs > clip.visibleUntilMs) continue; // déjà disparu
    // La progression court sur [animStartMs, endMs] : avant, l'élément est
    // maintenu à l'état initial (progress 0) ; après, à l'état final (progress 1).
    const duration = clip.endMs - clip.animStartMs;
    const progress =
      duration <= 0 ? 1 : clamp((tMs - clip.animStartMs) / duration, 0, 1);
    active.push({
      clip,
      progress,
      animating: tMs >= clip.animStartMs && tMs < clip.endMs,
    });
  }
  return active;
}

function evaluateSubset(clips: Clip[], tMs: number): ActiveClip[] {
  const active: ActiveClip[] = [];
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (tMs < clip.startMs || tMs > clip.visibleUntilMs) continue;
    const duration = clip.endMs - clip.animStartMs;
    const progress =
      duration <= 0 ? 1 : clamp((tMs - clip.animStartMs) / duration, 0, 1);
    active.push({
      clip,
      progress,
      animating: tMs >= clip.animStartMs && tMs < clip.endMs,
    });
  }
  return active;
}

/** Index de l'étape contenant `tMs` (la dernière étape dont le start <= t). */
export function stepIndexAt(timeline: Timeline, tMs: number): number {
  const { steps } = timeline;
  let low = 0;
  let high = steps.length - 1;
  let idx = 0;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (tMs >= steps[mid].startMs) {
      idx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return idx;
}

const STOP_TOLERANCE = 1; // ms

/** Prochain point d'arrêt strictement après `tMs` (sinon la fin). */
export function nextStop(timeline: Timeline, tMs: number): number {
  for (const stop of timeline.stops) {
    if (stop > tMs + STOP_TOLERANCE) return stop;
  }
  return timeline.durationMs;
}

/** Point d'arrêt précédent strictement avant `tMs` (sinon le début). */
export function prevStop(timeline: Timeline, tMs: number): number {
  let previous = 0;
  for (const stop of timeline.stops) {
    if (stop < tMs - STOP_TOLERANCE) previous = stop;
    else break;
  }
  return previous;
}
