import { describe, expect, it } from 'vitest';
import { circuitFrameAspect, letterbox } from './frame';
import type { LayoutMap } from '../engine/layout';

const layoutOf = (pts: [number, number][]): LayoutMap =>
  Object.fromEntries(pts.map(([cx, cy], i) => [`n${i}`, { cx, cy }]));

describe('circuitFrameAspect', () => {
  it('returns the aspect of the node cloud', () => {
    // xspan 0.6, yspan 0.3 → 2
    expect(
      circuitFrameAspect(
        layoutOf([
          [0.2, 0.3],
          [0.8, 0.6],
        ])
      )
    ).toBeCloseTo(2);
  });

  it('falls back to 1.6 with fewer than two nodes', () => {
    expect(circuitFrameAspect({})).toBe(1.6);
    expect(circuitFrameAspect(layoutOf([[0.5, 0.5]]))).toBe(1.6);
  });

  it('falls back to 1.6 on a degenerate span', () => {
    // A vertical chain: xspan is 0.
    expect(
      circuitFrameAspect(
        layoutOf([
          [0.5, 0.2],
          [0.5, 0.8],
        ])
      )
    ).toBe(1.6);
    // A horizontal chain: yspan is 0.
    expect(
      circuitFrameAspect(
        layoutOf([
          [0.2, 0.5],
          [0.8, 0.5],
        ])
      )
    ).toBe(1.6);
  });

  it('clamps to [1, 3.2]', () => {
    // xspan 0.9 / yspan 0.1 = 9 → clamped down.
    expect(
      circuitFrameAspect(
        layoutOf([
          [0.05, 0.45],
          [0.95, 0.55],
        ])
      )
    ).toBe(3.2);
    // xspan 0.1 / yspan 0.9 ≈ 0.11 → clamped up.
    expect(
      circuitFrameAspect(
        layoutOf([
          [0.45, 0.05],
          [0.55, 0.95],
        ])
      )
    ).toBe(1);
  });
});

describe('letterbox', () => {
  it('is disabled by a non-positive aspect — the content fills the container', () => {
    expect(letterbox(800, 400, 0)).toEqual({
      w: 800,
      h: 400,
      offX: 0,
      offY: 0,
    });
    expect(letterbox(800, 400, -1)).toEqual({
      w: 800,
      h: 400,
      offX: 0,
      offY: 0,
    });
  });

  it('is disabled by a zero-sized container', () => {
    expect(letterbox(0, 400, 1.6)).toEqual({ w: 0, h: 400, offX: 0, offY: 0 });
    expect(letterbox(800, 0, 1.6)).toEqual({ w: 800, h: 0, offX: 0, offY: 0 });
  });

  it('pillarboxes a container wider than the frame', () => {
    // h * aspect = 400 * 1.6 = 640 < 800 → width-limited by the height.
    expect(letterbox(800, 400, 1.6)).toEqual({
      w: 640,
      h: 400,
      offX: 80,
      offY: 0,
    });
  });

  it('letterboxes a container narrower than the frame', () => {
    // h * aspect = 400 * 2 = 800 > 600 → width-limited by the width.
    expect(letterbox(600, 400, 2)).toEqual({
      w: 600,
      h: 300,
      offX: 0,
      offY: 50,
    });
  });

  it('fills exactly, with no offset, when the aspects match', () => {
    expect(letterbox(640, 400, 1.6)).toEqual({
      w: 640,
      h: 400,
      offX: 0,
      offY: 0,
    });
  });
});
