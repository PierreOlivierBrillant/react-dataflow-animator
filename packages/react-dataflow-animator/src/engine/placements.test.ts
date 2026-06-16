import { describe, it, expect } from 'vitest';
import {
  computePlacements,
  computeContentLimits,
  PLACEMENT_PAD,
} from './placements';
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

  it('nœud avec label poussé près du bord bas → cy remonté pour ne pas clipper le label', () => {
    const layout = { a: { cx: 0.5, cy: 0.99 } };
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 40, height: 40, labelH: 18 },
    };
    const result = computePlacements(layout, geo, 800, 400);
    // botR = (20 + (6+18) + 6) / 400 = 50/400 = 0.125 → cy plafonné à 0.875.
    expect(result['a'].cy).toBeCloseTo(0.875, 5);
  });

  it('label inclus dans la borne basse mais pas dans la borne haute (asymétrie)', () => {
    // Même nœud poussé vers le HAUT : seul halfH+pad compte (label sous le visuel).
    const layout = { a: { cx: 0.5, cy: 0 } };
    const geo: GeometryMap = {
      a: { id: 'a', x: 0, y: 0, width: 40, height: 40, labelH: 18 },
    };
    const result = computePlacements(layout, geo, 800, 400);
    // topR = (20 + 6) / 400 = 0.065 (le label n'élargit PAS la borne haute).
    expect(result['a'].cy).toBeCloseTo(0.065, 5);
  });
});

describe('computeContentLimits', () => {
  // half = 28*scale, gap = 22 ; un voisin horizontal à distance dx borne
  // halfW à dx - 28*scale - 22, d'où maxW = 2*halfW.
  it('voisin horizontal proche → largeur du panneau bornée', () => {
    const layout = { a: { cx: 0.4, cy: 0.5 }, b: { cx: 0.6, cy: 0.5 } };
    const r = computeContentLimits(layout, 1000, 600, 1, 900, 500);
    // a→b : dx=200 → halfW = 200-28-22 = 150 → maxW = 300.
    expect(r.a.maxW).toBe(300);
    // pas de voisin vertical → hauteur bornée par les rebords (min(300,300)-6=294).
    expect(r.a.maxH).toBe(500); // min(500, 588)
  });

  it('voisins sur 4 côtés (croix) → largeur ET hauteur bornées', () => {
    const layout = {
      c: { cx: 0.5, cy: 0.5 },
      e: { cx: 0.7, cy: 0.5 },
      w: { cx: 0.3, cy: 0.5 },
      n: { cx: 0.5, cy: 0.3 },
      s: { cx: 0.5, cy: 0.7 },
    };
    const r = computeContentLimits(layout, 1000, 600, 1, 900, 500);
    // e/w : dx=200 → halfW=150 → maxW=300 ; n/s : dy=120 → halfH=120-50=70 → maxH=140.
    expect(r.c.maxW).toBe(300);
    expect(r.c.maxH).toBe(140);
  });

  it('échelle réduite (miniature) → gap proportionnel, donc plus de place', () => {
    const layout = { a: { cx: 0.4, cy: 0.5 }, b: { cx: 0.6, cy: 0.5 } };
    const r = computeContentLimits(layout, 1000, 600, 0.5, 900, 500);
    // half=28*0.5=14, gap=22*0.5=11 → halfW = 200-14-11 = 175 → maxW = 350.
    expect(r.a.maxW).toBe(350);
  });

  it('nœud isolé → bornes = plafonds globaux', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const r = computeContentLimits(layout, 1000, 600, 1, 900, 500);
    expect(r.a.maxW).toBe(900);
    expect(r.a.maxH).toBe(500);
  });

  it('plancher : ne descend jamais sous MIN_CONTENT_BOX (48)', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 }, b: { cx: 0.52, cy: 0.5 } };
    const r = computeContentLimits(layout, 1000, 600, 1, 900, 500);
    // dx=20 → halfW=20-50=-30 → 2*halfW<0 → planchonné à 48.
    expect(r.a.maxW).toBe(48);
  });

  it('width=0 → plafonds globaux pour tous', () => {
    const layout = { a: { cx: 0.5, cy: 0.5 } };
    const r = computeContentLimits(layout, 0, 600, 1, 900, 500);
    expect(r.a).toEqual({ maxW: 900, maxH: 500 });
  });
});
