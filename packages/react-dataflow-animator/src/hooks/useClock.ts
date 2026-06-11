import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../engine/timeline';

/**
 * Horloge de lecture pilotée par requestAnimationFrame.
 *
 * Le temps `t` (ms) est la SEULE source de vérité de l'animation : tout le reste
 * (`evaluate`) en découle. `seek` pose `t`, la lecture ne fait que l'avancer.
 * SSR-safe : aucun accès à `requestAnimationFrame` hors d'un effet client.
 */
export interface UseClockOptions {
  durationMs: number;
  speed?: number;
  loop?: boolean;
  autoPlay?: boolean;
}

export interface Clock {
  t: number;
  playing: boolean;
  durationMs: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  /** Joue puis s'arrête automatiquement à `targetMs` (navigation par étape). */
  playTo: (targetMs: number) => void;
  /** Repart du début et relance la lecture. */
  restart: () => void;
}

export function useClock(options: UseClockOptions): Clock {
  const { durationMs, speed = 1, loop = false, autoPlay = false } = options;

  const [t, setTState] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const tRef = useRef(0);
  const targetRef = useRef<number | null>(null);

  const setT = useCallback((value: number) => {
    tRef.current = value;
    setTState(value);
  }, []);

  // Re-clampe le curseur si la durée change (recompilation de la spec).
  useEffect(() => {
    if (tRef.current > durationMs) setT(durationMs);
  }, [durationMs, setT]);

  const seek = useCallback(
    (ms: number) => {
      targetRef.current = null;
      setT(clamp(ms, 0, durationMs));
    },
    [durationMs, setT]
  );

  const play = useCallback(() => {
    targetRef.current = null;
    if (tRef.current >= durationMs) setT(0); // rejoue depuis le début
    setPlaying(true);
  }, [durationMs, setT]);

  const pause = useCallback(() => {
    targetRef.current = null;
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, play, pause]);

  const restart = useCallback(() => {
    targetRef.current = null;
    setT(0);
    setPlaying(true);
  }, [setT]);

  const playTo = useCallback(
    (targetMs: number) => {
      const target = clamp(targetMs, 0, durationMs);
      if (target <= tRef.current) {
        seek(target);
        return;
      }
      targetRef.current = target;
      setPlaying(true);
    },
    [durationMs, seek]
  );

  useEffect(() => {
    if (!playing) return;
    if (typeof requestAnimationFrame === 'undefined') return; // SSR

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      let next = tRef.current + dt * speed;
      let stop = false;

      const target = targetRef.current;
      if (target != null && next >= target) {
        next = target;
        targetRef.current = null;
        stop = true;
      }
      if (next >= durationMs) {
        if (loop && !stop && durationMs > 0) {
          next %= durationMs;
        } else {
          next = durationMs;
          stop = true;
        }
      }

      setT(next);
      if (stop) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, durationMs, loop, setT]);

  return { t, playing, durationMs, play, pause, toggle, seek, playTo, restart };
}
