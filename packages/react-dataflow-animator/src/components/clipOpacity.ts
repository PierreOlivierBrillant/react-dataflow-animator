import { clamp } from '../engine/timeline';

/** Durée (ms) du fondu d'apparition/disparition par défaut (paquets, contenus). */
export const FADE_MS = 250;

/**
 * Opacité d'un clip avec fondu : entrée pendant le hold d'apparition (ou sur
 * FADE_MS s'il n'y en a pas), sortie sur FADE_MS avant la disparition.
 * Pas de fondu de sortie si `keepEnd` est vrai (le clip doit rester visible
 * jusqu'à la toute fin de la chronologie).
 *
 * `fadeInMs` et `fadeOutMs` remplacent les durées par défaut si fournis.
 * 0 = apparition/disparition instantanée (pas de fondu).
 */
export function clipOpacity(
  clip: {
    startMs: number;
    animStartMs: number;
    visibleUntilMs: number;
    keepEnd?: boolean;
    fadeInMs?: number;
    fadeOutMs?: number;
  },
  t: number
): number {
  const inDur = clip.animStartMs - clip.startMs;
  const effectiveFadeIn =
    clip.fadeInMs !== undefined ? clip.fadeInMs : inDur > 0 ? inDur : FADE_MS;
  const fadeIn =
    effectiveFadeIn <= 0
      ? 1
      : clamp((t - clip.startMs) / effectiveFadeIn, 0, 1);
  if (clip.keepEnd) return fadeIn;
  const effectiveFadeOut =
    clip.fadeOutMs !== undefined ? clip.fadeOutMs : FADE_MS;
  const outStart = clip.visibleUntilMs - effectiveFadeOut;
  const fadeOut =
    effectiveFadeOut <= 0 || t <= outStart
      ? 1
      : clamp((clip.visibleUntilMs - t) / effectiveFadeOut, 0, 1);
  return Math.min(fadeIn, fadeOut);
}
