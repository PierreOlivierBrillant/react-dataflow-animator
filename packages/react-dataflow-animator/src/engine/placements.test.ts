import { describe, it, expect } from 'vitest';
import { computePlacements, PLACEMENT_PAD } from './placements';
import type { GeometryMap } from './geometry';

describe('computePlacements', () => {
  it('geometry vide → retourne le layout tel quel', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const result = computePlacements(layout, {}, 800, 600);
    expect(result).toEqual(layout);
  });

  it('width=0 → retourne le layout tel quel', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 200, height: 100 },
    };
    const result = computePlacements(layout, geo, 0, 600);
    expect(result).toEqual(layout);
  });

  it('nœud au bord (cx=0) avec width=200 dans canvas 800 → cx remonté', () => {
    const layout = { a: { cx: 0, cy: 0.5 } };
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 200, height: 100 },
    };
    const result = computePlacements(layout, geo, 800, 600);
    const expected = (200 / 2 + PLACEMENT_PAD) / 800;
    expect(result['a'].cx).toBeCloseTo(expected);
  });

  it('nœud au centre → inchangé', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 200, height: 100 },
    };
    const result = computePlacements(layout, geo, 800, 600);
    expect(result['a'].cx).toBeCloseTo(0.5);
    expect(result['a'].cy).toBeCloseTo(0.5);
  });

  it('nœud plus large que le canvas (2*hwr >= 1) → cx inchangé', () => {
    const layout = { a: { cx: 0.1, cy: 0.5 } };
    // width=200, pad=6 → hwr=(100+6)/200=0.53 → 2*hwr=1.06 >= 1
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 200, height: 50 },
    };
    const result = computePlacements(layout, geo, 200, 600);
    expect(result['a'].cx).toBeCloseTo(0.1);
  });
});
