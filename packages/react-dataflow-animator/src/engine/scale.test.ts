import { describe, expect, it } from 'vitest';
import { computeScale } from './scale';

describe('computeScale', () => {
  it('a. layout vide → valeurs par défaut', () => {
    expect(computeScale({}, 800, 500, 'comfortable')).toEqual({
      scale: 1,
      maxW: 240,
      contentMaxW: 320,
      contentMaxH: 240,
    });
  });

  it('b. width=0 ou height=0 → valeurs par défaut', () => {
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

  it('c. 2 nœuds, 800×500, comfortable → scale ∈ [0.3, 1.6], maxW = 320', () => {
    const layout = { a: { cx: 0.25, cy: 0.5 }, b: { cx: 0.75, cy: 0.5 } };
    const result = computeScale(layout, 800, 500, 'comfortable');
    expect(result.scale).toBeGreaterThanOrEqual(0.3);
    expect(result.scale).toBeLessThanOrEqual(1.6);
    expect(result.maxW).toBe(320);
  });

  it('d. compact produit un scale inférieur à spacious', () => {
    const layout = { a: { cx: 0.25, cy: 0.5 }, b: { cx: 0.75, cy: 0.5 } };
    const compact = computeScale(layout, 800, 500, 'compact');
    const spacious = computeScale(layout, 800, 500, 'spacious');
    expect(compact.scale).toBeLessThan(spacious.scale);
  });

  it('e. nœud unique → scale plafonné par sizeScale, jamais < 0.3', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const result = computeScale(layout, 800, 500, 'comfortable');
    expect(result.scale).toBeGreaterThanOrEqual(0.3);
    const sizeScale = Math.min(800 / 700, 500 / 350);
    expect(result.scale).toBeCloseTo(sizeScale, 3);
  });

  it('f. contentMaxW modéré (~0,42 largeur), contentMaxH borné par les rebords', () => {
    const layout = { a: { cx: 0.25, cy: 0.5 }, b: { cx: 0.75, cy: 0.5 } };
    const result = computeScale(layout, 800, 500, 'comfortable');
    expect(result.contentMaxW).toBe(336); // 800×0.42, dans [140, 460]
    expect(result.contentMaxH).toBe(468); // 500−32, dans [100, 600]
    // Indépendant du nombre/écart des nœuds : c'est l'écartement (computePlacements)
    // qui ménage la place, pas un rétrécissement de la boîte ici.
    const dense = computeScale(
      { a: { cx: 0.48, cy: 0.5 }, b: { cx: 0.52, cy: 0.5 } },
      800,
      500,
      'comfortable'
    );
    expect(dense.contentMaxW).toBe(336);
  });

  it('g. petit lecteur (miniature) → panneau plus petit (0,42 largeur)', () => {
    const result = computeScale(
      { a: { cx: 0.25, cy: 0.5 }, b: { cx: 0.75, cy: 0.5 } },
      360,
      200,
      'spacious'
    );
    expect(result.contentMaxW).toBe(151); // 360×0.42
    expect(result.contentMaxH).toBe(168); // 200−32
  });
});
