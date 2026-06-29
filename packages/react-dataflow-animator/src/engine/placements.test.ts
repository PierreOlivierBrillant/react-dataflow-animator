import { describe, it, expect } from 'vitest';
import {
  computePlacements,
  computeContentLimits,
  PLACEMENT_PAD,
} from './placements';
import type { GeometryMap } from './geometry';

describe('computePlacements', () => {
  it('empty geometry → returns the layout as is', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const result = computePlacements(layout, {}, 800, 600);
    expect(result).toEqual(layout);
  });

  it('width=0 → returns the layout as is', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 200, height: 100 },
    };
    const result = computePlacements(layout, geo, 0, 600);
    expect(result).toEqual(layout);
  });

  it('node at the edge (cx=0) with width=200 in canvas 800 → cx shifted up', () => {
    const layout = { a: { cx: 0, cy: 0.5 } };
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 200, height: 100 },
    };
    const result = computePlacements(layout, geo, 800, 600);
    const expected = (200 / 2 + PLACEMENT_PAD) / 800;
    expect(result['a'].cx).toBeCloseTo(expected);
  });

  it('node in the center → unchanged', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 200, height: 100 },
    };
    const result = computePlacements(layout, geo, 800, 600);
    expect(result['a'].cx).toBeCloseTo(0.5);
    expect(result['a'].cy).toBeCloseTo(0.5);
  });

  it('node wider than the canvas (2*hwr >= 1) → cx unchanged', () => {
    const layout = { a: { cx: 0.1, cy: 0.5 } };
    // width=200, pad=6 → hwr=(100+6)/200=0.53 → 2*hwr=1.06 >= 1
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 200, height: 50 },
    };
    const result = computePlacements(layout, geo, 200, 600);
    expect(result['a'].cx).toBeCloseTo(0.1);
  });

  it('node with label pushed near the bottom edge → cy shifted up to not clip the label', () => {
    const layout = { a: { cx: 0.5, cy: 0.99 } };
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 40, height: 40, labelH: 18 },
    };
    const result = computePlacements(layout, geo, 800, 400);
    // botR = (20 + (6+18) + 6) / 400 = 50/400 = 0.125 → cy capped at 0.875.
    expect(result['a'].cy).toBeCloseTo(0.875, 5);
  });

  it('label included in the bottom bound but not in the top bound (asymmetry)', () => {
    // Same node pushed UP: only halfH+pad counts (label is under the visual).
    const layout = { a: { cx: 0.5, cy: 0 } };
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 40, height: 40, labelH: 18 },
    };
    const result = computePlacements(layout, geo, 800, 400);
    // topR = (20 + 6) / 400 = 0.065 (the label does NOT expand the top bound).
    expect(result['a'].cy).toBeCloseTo(0.065, 5);
  });
});

describe('computeContentLimits', () => {
  // half = 28*scale, gapMargin = max(22*scale, 40) ; gap = half + gapMargin.
  // Horizontal neighbor at distance dx bounds halfW to dx - gap, hence maxW = 2*halfW.
  it('close horizontal neighbor → panel width bounded', () => {
    const layout = { a: { cx: 0.4, cy: 0.5 }, b: { cx: 0.6, cy: 0.5 } };
    const r = computeContentLimits(layout, 1000, 600, 1, 900, 500);
    // a→b : dx=200, half=28, gapMargin=max(22,40)=40, gap=68 → halfW=132 → maxW=264.
    expect(r.a.maxW).toBe(264);
    // no vertical neighbor → height bounded by the edges.
    expect(r.a.maxH).toBe(500); // min(500, 588)
  });

  it('neighbors on 4 sides (cross) → width AND height bounded', () => {
    const layout = {
      c: { cx: 0.5, cy: 0.5 },
      e: { cx: 0.7, cy: 0.5 },
      w: { cx: 0.3, cy: 0.5 },
      n: { cx: 0.5, cy: 0.3 },
      s: { cx: 0.5, cy: 0.7 },
    };
    const r = computeContentLimits(layout, 1000, 600, 1, 900, 500);
    // e/w : dx=200 → halfW=132 → maxW=264 ; n/s : dy=120, gap=68 → halfH=52 → maxH=104.
    expect(r.c.maxW).toBe(264);
    expect(r.c.maxH).toBe(104);
  });

  it('reduced scale (thumbnail) → absolute floor of the gap is active', () => {
    const layout = { a: { cx: 0.4, cy: 0.5 }, b: { cx: 0.6, cy: 0.5 } };
    const r = computeContentLimits(layout, 1000, 600, 0.5, 900, 500);
    // half=14, gapMargin=max(11, 40)=40, gap=54 → halfW=200-54=146 → maxW=292.
    expect(r.a.maxW).toBe(292);
  });

  it('isolated node → bounds = global ceilings', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const r = computeContentLimits(layout, 1000, 600, 1, 900, 500);
    expect(r.a.maxW).toBe(900);
    expect(r.a.maxH).toBe(500);
  });

  it('floor: never goes below MIN_CONTENT_BOX (48)', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 }, b: { cx: 0.52, cy: 0.5 } };
    const r = computeContentLimits(layout, 1000, 600, 1, 900, 500);
    // dx=20 → halfW=20-50=-30 → 2*halfW<0 → floored to 48.
    expect(r.a.maxW).toBe(48);
  });

  it('width=0 → global ceilings for all', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const r = computeContentLimits(layout, 0, 600, 1, 900, 500);
    expect(r.a).toEqual({ maxW: 900, maxH: 500 });
  });
});
