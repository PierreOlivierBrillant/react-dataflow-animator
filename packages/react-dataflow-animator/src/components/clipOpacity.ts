import { clamp } from '../engine/timeline';

/** Durée (ms) du fondu d'apparition/disparition (paquets, contenus). */
export const FADE_MS = 250;

/**
 * Opacité d'un clip avec fondu : entrée pendant le hold d'apparition (ou sur
 * FADE_MS s'il n'y en a pas), sortie sur FADE_MS avant la disparition.
 * Pas de fondu de sortie si `keepEnd` est vrai (le clip doit rester visible
 * jusqu'à la toute fin de la chronologie).
 */
export function clipOpacity(
  clip: {
    startMs: number;
    animStartMs: number;
    visibleUntilMs: number;
    keepEnd?: boolean;
  },
  t: number
): number {
  const inDur = clip.animStartMs - clip.startMs;
  const fadeIn =
    inDur > 0
      ? clamp((t - clip.startMs) / inDur, 0, 1)
      : clamp((t - clip.startMs) / FADE_MS, 0, 1);
  if (clip.keepEnd) return fadeIn;
  const outStart = clip.visibleUntilMs - FADE_MS;
  const fadeOut =
    t > outStart ? clamp((clip.visibleUntilMs - t) / FADE_MS, 0, 1) : 1;
  return Math.min(fadeIn, fadeOut);
}
