import type { LineStyle, ObjectContent } from '../types';

/**
 * Représentation intermédiaire (IR) déterministe de la chronologie.
 *
 * Le compilateur (`compiler.ts`) transforme `spec.actions` en `Timeline`.
 * Le runtime se résume à une fonction PURE `evaluate(timeline, t)` : aucune
 * dépendance au DOM, au temps réel ou à une librairie d'animation. Le lecteur
 * se contente d'avancer `t` (via requestAnimationFrame) et de re-rendre.
 */

export type ClipKind = 'move' | 'arrow' | 'loading' | 'set_content' | 'comment';

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
}

export interface MoveClip extends ClipBase {
  kind: 'move';
  /** ID de l'objet dynamique déplacé (paquet, requête…). */
  objectId: string;
  fromId: string;
  toId: string;
  /** Voie de décalage anti-collision : -1, 0 ou +1. */
  shift: number;
}

export interface ArrowClip extends ClipBase {
  kind: 'arrow';
  fromId: string;
  toId: string;
  style: LineStyle;
  text?: string;
  shift: number;
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
  /** ID du nœud statique de référence. */
  nextToId: string;
  text: string;
}

export type Clip =
  | MoveClip
  | ArrowClip
  | LoadingClip
  | SetContentClip
  | CommentClip;

export interface Step {
  index: number;
  startMs: number;
  /** Fin de l'étape (= début de la suivante, ou durée totale). */
  endMs: number;
  /** ID de l'action racine, si fourni. */
  actionId?: string;
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

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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
  const active: ActiveClip[] = [];
  for (const clip of timeline.clips) {
    if (tMs < clip.startMs) continue; // pas encore apparu
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

/** Index de l'étape contenant `tMs` (la dernière étape dont le start <= t). */
export function stepIndexAt(timeline: Timeline, tMs: number): number {
  const { steps } = timeline;
  let idx = 0;
  for (let i = 0; i < steps.length; i++) {
    if (tMs >= steps[i].startMs) idx = i;
    else break;
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
