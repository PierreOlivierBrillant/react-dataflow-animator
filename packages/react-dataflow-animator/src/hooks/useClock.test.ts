/** @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useClock } from './useClock';

// Chaque tick RAF vaut 16 ms — valeur fixe pour des assertions exactes.
const TICK = 16;
const DURATION = 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) =>
    setTimeout(() => cb(performance.now()), TICK)
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useClock', () => {
  it('seek(ms) déplace t à la valeur clampée dans [0, durationMs]', () => {
    const { result } = renderHook(() => useClock({ durationMs: DURATION }));
    act(() => {
      result.current.seek(500);
    });
    expect(result.current.t).toBe(500);
  });

  it('seek au-delà de durationMs : t = durationMs', () => {
    const { result } = renderHook(() => useClock({ durationMs: DURATION }));
    act(() => {
      result.current.seek(9999);
    });
    expect(result.current.t).toBe(DURATION);
  });

  it('play() puis avance du temps : t croît proportionnellement', () => {
    const { result } = renderHook(() => useClock({ durationMs: DURATION }));
    act(() => {
      result.current.play();
    });
    act(() => {
      vi.advanceTimersByTime(6 * TICK);
    }); // 6 ticks → t = 96 ms
    expect(result.current.t).toBe(6 * TICK);
  });

  it('play() avec speed=2 : t croît deux fois plus vite', () => {
    const { result } = renderHook(() =>
      useClock({ durationMs: DURATION, speed: 2 })
    );
    act(() => {
      result.current.play();
    });
    act(() => {
      vi.advanceTimersByTime(6 * TICK);
    }); // 6 ticks × speed 2 → t = 192 ms
    expect(result.current.t).toBe(6 * TICK * 2);
  });

  it("pause() arrête l'avancée de t", () => {
    const { result } = renderHook(() => useClock({ durationMs: DURATION }));
    act(() => {
      result.current.play();
    });
    act(() => {
      vi.advanceTimersByTime(2 * TICK);
    }); // t = 32
    act(() => {
      result.current.pause();
    });
    act(() => {
      vi.advanceTimersByTime(6 * TICK);
    }); // aucun tick ne doit avancer t
    expect(result.current.t).toBe(2 * TICK);
  });

  it('restart() remet t à 0 et passe playing à true', () => {
    const { result } = renderHook(() => useClock({ durationMs: DURATION }));
    act(() => {
      result.current.seek(500);
    });
    act(() => {
      result.current.restart();
    });
    expect(result.current.t).toBe(0);
    expect(result.current.playing).toBe(true);
  });

  it('playTo(target) : t atteint target puis playing repasse à false', () => {
    // 100 ms de cible, atteinte au 7e tick (112 ms cumulés)
    const target = 100;
    const { result } = renderHook(() => useClock({ durationMs: DURATION }));
    act(() => {
      result.current.playTo(target);
    });
    act(() => {
      vi.advanceTimersByTime(7 * TICK);
    }); // next=112 >= target → stop
    expect(result.current.t).toBe(target);
    expect(result.current.playing).toBe(false);
  });

  it('playTo(target) avec target ≤ t actuel : seek immédiat sans playing', () => {
    const { result } = renderHook(() => useClock({ durationMs: DURATION }));
    act(() => {
      result.current.seek(500);
    });
    act(() => {
      result.current.playTo(200);
    }); // 200 < 500 → seek direct
    expect(result.current.t).toBe(200);
    expect(result.current.playing).toBe(false);
  });

  it('loop=true : à durationMs, t recommence à 0 et continue', () => {
    // durationMs = 2 ticks ; après 3 ticks, t doit être de retour à 1 tick
    const dur = 2 * TICK;
    const { result } = renderHook(() =>
      useClock({ durationMs: dur, loop: true })
    );
    act(() => {
      result.current.play();
    });
    act(() => {
      vi.advanceTimersByTime(3 * TICK);
    }); // boucle à 32 ms, t = 16 ms
    expect(result.current.t).toBe(TICK);
    expect(result.current.playing).toBe(true);
  });

  it('loop=false : à durationMs, t reste à durationMs et playing=false', () => {
    const dur = 2 * TICK;
    const { result } = renderHook(() =>
      useClock({ durationMs: dur, loop: false })
    );
    act(() => {
      result.current.play();
    });
    act(() => {
      vi.advanceTimersByTime(3 * TICK);
    }); // s'arrête à durationMs
    expect(result.current.t).toBe(dur);
    expect(result.current.playing).toBe(false);
  });

  it('changement de durationMs en cours de route : si t > nouveau durationMs, t est clampé', () => {
    const { result, rerender } = renderHook(
      ({ dur }: { dur: number }) => useClock({ durationMs: dur }),
      { initialProps: { dur: 1000 } }
    );
    act(() => {
      result.current.seek(800);
    });
    act(() => {
      rerender({ dur: 500 });
    });
    expect(result.current.t).toBe(500);
  });

  it("autoPlay=true à l'initialisation : playing=true dès le rendu", () => {
    const { result } = renderHook(() =>
      useClock({ durationMs: DURATION, autoPlay: true })
    );
    expect(result.current.playing).toBe(true);
  });
});
