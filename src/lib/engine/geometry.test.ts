import { describe, expect, it } from 'vitest';
import { connection, pointOnSegment, type NodeGeom } from './geometry';

const A: NodeGeom = { id: 'a', x: 0, y: 0, width: 40, height: 40 };
const B: NodeGeom = { id: 'b', x: 200, y: 0, width: 40, height: 40 };

describe('connection', () => {
  it('rogne les extrémités au bord des nœuds + marge', () => {
    const c = connection(A, B, 0);
    expect(c.start).toEqual({ x: 28, y: 0 }); // centre + rayon (20) + marge (8)
    expect(c.end).toEqual({ x: 172, y: 0 });
    expect(c.angleDeg).toBe(0);
    expect(c.length).toBe(144);
  });

  it('applique un décalage perpendiculaire selon shift', () => {
    const up = connection(A, B, 1); // amplitude 0.15*40 = 6
    expect(up.start.y).toBeCloseTo(6);
    expect(up.end.y).toBeCloseTo(6);

    const down = connection(A, B, -1);
    expect(down.start.y).toBeCloseTo(-6);
  });

  it('place A→B et B→A sur des voies opposées (anti-superposition)', () => {
    // shiftFor renvoie +1 pour a->b et -1 pour b->a.
    const ab = connection(A, B, 1);
    const ba = connection(B, A, -1);
    // Les deux trajets longent le même segment mais de part et d'autre.
    expect(Math.sign(ab.start.y)).toBe(-Math.sign(ba.start.y));
    expect(ab.start.y).not.toBeCloseTo(ba.start.y);
  });
});

describe('pointOnSegment', () => {
  it('interpole linéairement', () => {
    const p = pointOnSegment({ x: 0, y: 0 }, { x: 100, y: 50 }, 0.5);
    expect(p).toEqual({ x: 50, y: 25 });
  });
});
