import { describe, expect, it } from 'vitest';
import { computeScale } from './scale';

describe('computeScale', () => {
  it('a. empty layout → default values', () => {
    expect(computeScale({}, 800, 500, 'comfortable')).toEqual({
      scale: 1,
      maxW: 240,
      contentMaxW: 320,
      contentMaxH: 240,
    });
  });

  it('b. width=0 or height=0 → default values', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    expect(computeScale(layout, 0, 500, 'comfortable')).toEqual({
      scale: 1,
      maxW: 240,
      contentMaxW: 320,
      contentMaxH: 240,
    });
    expect(computeScale(layout, 800, 0, 'comfortable')).toEqual({
      scale: 1,
      maxW: 240,
      contentMaxW: 320,
      contentMaxH: 240,
    });
  });

  it('c. 2 nodes, 800×500, comfortable → scale ∈ [0.3, 1.6], maxW = 320', () => {
    const layout = { a: { cx: 0.25, cy: 0.5 }, b: { cx: 0.75, cy: 0.5 } };
    const result = computeScale(layout, 800, 500, 'comfortable');
    expect(result.scale).toBeGreaterThanOrEqual(0.3);
    expect(result.scale).toBeLessThanOrEqual(1.6);
    expect(result.maxW).toBe(320);
  });

  it('d. compact produces a smaller scale than spacious', () => {
    const layout = { a: { cx: 0.25, cy: 0.5 }, b: { cx: 0.75, cy: 0.5 } };
    const compact = computeScale(layout, 800, 500, 'compact');
    const spacious = computeScale(layout, 800, 500, 'spacious');
    expect(compact.scale).toBeLessThan(spacious.scale);
  });

  it('e. single node → scale capped by sizeScale, never < 0.3', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const result = computeScale(layout, 800, 500, 'comfortable');
    expect(result.scale).toBeGreaterThanOrEqual(0.3);
    const sizeScale = Math.min(800 / 700, 500 / 350);
    expect(result.scale).toBeCloseTo(sizeScale, 3);
  });

  it('f. conservative contentMaxW (~0.38 width), contentMaxH at 88% height', () => {
    const layout = { a: { cx: 0.25, cy: 0.5 }, b: { cx: 0.75, cy: 0.5 } };
    const result = computeScale(layout, 800, 500, 'comfortable');
    expect(result.contentMaxW).toBe(304); // 800×0.38, dans [120, 420]
    expect(result.contentMaxH).toBe(440); // 500×0.88, dans [100, 560]
    // Independent of number/gap of nodes: spacing (computePlacements)
    // makes room, not shrinking the box here.
    const dense = computeScale(
      { a: { cx: 0.48, cy: 0.5 }, b: { cx: 0.52, cy: 0.5 } },
      800,
      500,
      'comfortable'
    );
    expect(dense.contentMaxW).toBe(304);
  });

  it('g. small viewer (thumbnail) → smaller panel (0.38 width, 88% height)', () => {
    const result = computeScale(
      { a: { cx: 0.25, cy: 0.5 }, b: { cx: 0.75, cy: 0.5 } },
      360,
      200,
      'spacious'
    );
    expect(result.contentMaxW).toBe(137); // 360×0.38
    expect(result.contentMaxH).toBe(176); // 200×0.88
  });

  it('h. ignored nodes (junctions) do not shrink the scale', () => {
    // Two well-spaced components, plus a junction crammed next to one of them.
    const layout = {
      a: { cx: 0.25, cy: 0.5 },
      b: { cx: 0.75, cy: 0.5 },
      j: { cx: 0.27, cy: 0.5 }, // tiny junction hugging `a`
    };
    const withJ = computeScale(layout, 800, 500, 'comfortable');
    const ignored = computeScale(
      layout,
      800,
      500,
      'comfortable',
      new Set(['j'])
    );
    // Ignoring the junction lifts the scale back up.
    expect(ignored.scale).toBeGreaterThan(withJ.scale);
  });
});
