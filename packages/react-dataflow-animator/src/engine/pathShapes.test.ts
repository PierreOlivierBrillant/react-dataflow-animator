import { describe, expect, it } from 'vitest';
import { shapeWaypoints } from './pathShapes';
import type { Point } from './geometry';

// Distance signée d'un point au segment droit a→b (positif d'un côté).
function deviation(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return ((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

function maxAbsDeviation(pts: Point[], a: Point, b: Point): number {
  return pts.reduce((m, p) => Math.max(m, Math.abs(deviation(p, a, b))), 0);
}

const A: Point = { x: 0, y: 0 };
const DIAG: Point = { x: 100, y: 40 }; // décalage transverse → courbe visible
const ALIGNED: Point = { x: 100, y: 0 }; // aligné → toute forme = droite

describe('shapeWaypoints — straight', () => {
  it('2 points de contrôle → aucun point intermédiaire', () => {
    expect(shapeWaypoints([A, DIAG], 'straight')).toBeUndefined();
  });

  it('avec détour → ne garde que le détour', () => {
    const detour: Point = { x: 50, y: -30 };
    expect(shapeWaypoints([A, detour, ALIGNED], 'straight')).toEqual([detour]);
  });
});

describe('shapeWaypoints — bezier / simplebezier', () => {
  it('nœuds alignés → trait droit (undefined)', () => {
    expect(shapeWaypoints([A, ALIGNED], 'bezier')).toBeUndefined();
    expect(shapeWaypoints([A, ALIGNED], 'simplebezier')).toBeUndefined();
  });

  it('décalage transverse → courbe échantillonnée bornée par les extrémités', () => {
    const pts = shapeWaypoints([A, DIAG], 'bezier');
    expect(pts).toBeDefined();
    expect(pts!.length).toBeGreaterThan(5);
    // x strictement croissant entre les deux extrémités
    for (const p of pts!) {
      expect(p.x).toBeGreaterThan(A.x);
      expect(p.x).toBeLessThan(DIAG.x);
    }
    // la courbe dévie réellement du segment droit
    expect(maxAbsDeviation(pts!, A, DIAG)).toBeGreaterThan(1);
  });

  it('simplebezier est plus discret (dévie moins) que bezier', () => {
    const bez = shapeWaypoints([A, DIAG], 'bezier')!;
    const simple = shapeWaypoints([A, DIAG], 'simplebezier')!;
    expect(maxAbsDeviation(simple, A, DIAG)).toBeLessThan(
      maxAbsDeviation(bez, A, DIAG)
    );
  });

  it('détour : la courbe le traverse (point de jonction réinséré)', () => {
    const detour: Point = { x: 50, y: -30 };
    const pts = shapeWaypoints([A, detour, ALIGNED], 'bezier')!;
    expect(pts.some((p) => p.x === detour.x && p.y === detour.y)).toBe(true);
  });
});

describe('shapeWaypoints — step', () => {
  it('coins orthogonaux : segments alternativement H et V', () => {
    const pts = shapeWaypoints([A, DIAG], 'step')!;
    expect(pts).toEqual([
      { x: 50, y: 0 },
      { x: 50, y: 40 },
    ]);
    // chaque segment de la polyligne complète est horizontal OU vertical
    const full = [A, ...pts, DIAG];
    for (let i = 0; i < full.length - 1; i++) {
      const h = Math.abs(full[i + 1].y - full[i].y) < 1e-9;
      const v = Math.abs(full[i + 1].x - full[i].x) < 1e-9;
      expect(h || v).toBe(true);
    }
  });

  it('nœuds alignés → tracé droit (déviation nulle)', () => {
    const pts = shapeWaypoints([A, ALIGNED], 'step');
    if (pts) expect(maxAbsDeviation(pts, A, ALIGNED)).toBeCloseTo(0, 6);
  });
});

describe('shapeWaypoints — smoothstep', () => {
  it('coins arrondis : plus de points que step, bornés par la boîte', () => {
    const step = shapeWaypoints([A, DIAG], 'step')!;
    const smooth = shapeWaypoints([A, DIAG], 'smoothstep')!;
    expect(smooth.length).toBeGreaterThan(step.length);
    for (const p of smooth) {
      expect(p.x).toBeGreaterThanOrEqual(A.x - 1e-6);
      expect(p.x).toBeLessThanOrEqual(DIAG.x + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(A.y - 1e-6);
      expect(p.y).toBeLessThanOrEqual(DIAG.y + 1e-6);
    }
  });
});
