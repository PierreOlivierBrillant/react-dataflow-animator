import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../engine/timeline';

// Tab sent to background → rAF frozen → dt can be several minutes
// on return. Without ceiling, t would jump to the end (or to an arbitrary position
// in loop mode).
const MAX_DT = 100; // ms

/**
 * Playback clock driven by requestAnimationFrame.
 *
 * Time `t` (ms) is the ONLY source of truth of the animation: everything else
 * (`evaluate`) flows from it. `seek` sets `t`, playback only advances it.
 * SSR-safe: no access to `requestAnimationFrame` outside a client effect.
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
  /** Plays then stops automatically at `targetMs` (step navigation). */
  playTo: (targetMs: number) => void;
  /** Restarts from the beginning and resumes playback. */
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

  // Re-clamps the cursor if the duration changes (spec recompilation).
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
    if (tRef.current >= durationMs) setT(0); // replays from the beginning
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
      const dt = Math.min(now - last, MAX_DT);
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
