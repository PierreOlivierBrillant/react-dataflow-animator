import { describe, expect, it, vi } from 'vitest';
import { settle } from './settle';

/** Drives `settle` with a scripted sequence of measurements. */
function scripted(readings: number[], maxPasses = 4) {
  const applied: number[] = [];
  let i = 0;
  const result = settle<number>({
    initial: 0,
    measure: () => readings[Math.min(i++, readings.length - 1)],
    same: (a, b) => a === b,
    apply: (m) => applied.push(m),
    maxPasses,
  });
  return { ...result, applied };
}

describe('settle', () => {
  it('stops on the first measurement when nothing moved', () => {
    // The measurement already equals the seed → React would bail out at once.
    const r = scripted([0]);

    expect(r.passes).toBe(1);
    expect(r.converged).toBe(true);
    expect(r.applied).toEqual([]);
    expect(r.metrics).toBe(0);
  });

  it('applies each changed measurement and stops once two agree', () => {
    const r = scripted([10, 12, 12]);

    expect(r.applied).toEqual([10, 12]);
    expect(r.passes).toBe(3);
    expect(r.converged).toBe(true);
    expect(r.metrics).toBe(12);
  });

  it('never applies the measurement it bailed out on', () => {
    // The 3rd reading equals the 2nd: it must not trigger another write.
    const apply = vi.fn();
    const readings = [1, 2, 2];
    let i = 0;
    settle<number>({
      initial: 0,
      measure: () => readings[i++],
      same: (a, b) => a === b,
      apply,
      maxPasses: 4,
    });

    expect(apply).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenLastCalledWith(2);
  });

  it('reports converged=false when the budget runs out first', () => {
    // Never repeats: the loop can only end on the budget.
    const r = scripted([1, 2, 3, 4, 5]);

    expect(r.passes).toBe(4);
    expect(r.converged).toBe(false);
    expect(r.metrics).toBe(4);
  });

  it('honours a wider budget', () => {
    const r = scripted([1, 2, 3, 4, 5, 5], 8);

    expect(r.passes).toBe(6);
    expect(r.converged).toBe(true);
  });

  it('measures nothing at all with a zero budget', () => {
    const measure = vi.fn(() => 1);
    const r = settle<number>({
      initial: 0,
      measure,
      same: (a, b) => a === b,
      apply: () => {},
      maxPasses: 0,
    });

    expect(measure).not.toHaveBeenCalled();
    expect(r).toEqual({ metrics: 0, passes: 0, converged: false });
  });
});
