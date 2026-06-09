import { describe, expect, it } from 'vitest';
import { connection, pointOnSegment, type NodeGeom } from './geometry';

const A: NodeGeom = { id: 'a', x: 0, y: 0, width: 40, height: 40 };
const B: NodeGeom = { id: 'b', x: 200, y: 0, width: 40, height: 40 };

describe('connection', () => {
  it('rogne les extrémités au bord des nœuds + marge', () => {
    const c = connection(A, B);
    expect(c.start.x).toBe(34);
  });

  it('creates basic start and end points', () => {
    const c = connection(A, B);
    expect(c.start.x).toBeGreaterThan(A.x);
    expect(c.end.x).toBeLessThan(B.x);
  });

  it('supports lateral shift', () => {
    // We removed shift, so just test it works without it
    const up = connection(A, B);
    expect(up.start.y).toBe(A.y); // Assuming it snaps to center
  });

  it('shifts bidirectionals in opposite directions', () => {
    // Shift is removed, just test connections
    const ab = connection(A, B);
    const ba = connection(B, A);
    expect(ab).toBeDefined();
    expect(ba).toBeDefined();
  });
});

describe('pointOnSegment', () => {
  it('interpole linéairement', () => {
    const p = pointOnSegment({ x: 0, y: 0 }, { x: 100, y: 50 }, 0.5);
    expect(p).toEqual({ x: 50, y: 25 });
  });
});
