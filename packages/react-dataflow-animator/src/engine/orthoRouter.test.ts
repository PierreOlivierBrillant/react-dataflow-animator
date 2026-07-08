import { describe, expect, it } from 'vitest';
import {
  routeOrthogonal,
  simplify,
  type RouterObstacle,
  type RouterWire,
} from './orthoRouter';

const body = (id: string, x: number, y: number): RouterObstacle => ({
  id,
  x,
  y,
  w: 40,
  h: 40,
});

const pin = (
  node: string,
  x: number,
  y: number,
  nx: number,
  ny: number
): RouterWire['from'] => ({
  node,
  point: { x, y },
  normal: { x: nx, y: ny },
  hardNormal: true,
});

/** Every segment is strictly horizontal or vertical (never diagonal). */
const allOrthogonal = (pts: { x: number; y: number }[]): boolean => {
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = Math.abs(pts[i + 1].x - pts[i].x);
    const dy = Math.abs(pts[i + 1].y - pts[i].y);
    if (dx > 0.5 && dy > 0.5) return false;
  }
  return true;
};

const hitsBody = (
  pts: { x: number; y: number }[],
  o: RouterObstacle
): boolean => {
  const x0 = o.x - o.w / 2 + 1;
  const x1 = o.x + o.w / 2 - 1;
  const y0 = o.y - o.h / 2 + 1;
  const y1 = o.y + o.h / 2 - 1;
  for (let i = 0; i < pts.length - 1; i++) {
    for (let t = 0; t <= 1; t += 0.01) {
      const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t;
      const y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
      if (x > x0 && x < x1 && y > y0 && y < y1) return true;
    }
  }
  return false;
};

describe('orthoRouter', () => {
  it('routes aligned terminals as a straight, corner-free wire', () => {
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('b', 280, 100, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), body('b', 300, 100)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(p).toHaveLength(2); // no corners
    expect(p[0].y).toBeCloseTo(p[1].y, 5);
  });

  it('never emits a diagonal, even between offset terminals', () => {
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('b', 280, 140, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), body('b', 300, 140)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(p.length).toBeGreaterThan(2); // an orthogonal step, not a slanted line
  });

  it('routes around a component that sits between the terminals', () => {
    const mid = body('m', 200, 100);
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('c', 280, 100, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), mid, body('c', 300, 100)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(hitsBody(p, mid)).toBe(false);
  });

  it('routes around SEVERAL bodies in a row (long span)', () => {
    const b1 = body('m1', 180, 100);
    const b2 = body('m2', 240, 100);
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: pin('c', 320, 100, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 100), b1, b2, body('c', 340, 100)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(hitsBody(p, b1)).toBe(false);
    expect(hitsBody(p, b2)).toBe(false);
  });

  it('separates two parallel wires onto different tracks (no overlap)', () => {
    // Two wires that would both like the same horizontal line between columns.
    const wires: RouterWire[] = [
      {
        key: 'w1',
        from: pin('a', 120, 90, 1, 0),
        to: pin('c', 280, 110, -1, 0),
      },
      {
        key: 'w2',
        from: pin('b', 120, 110, 1, 0),
        to: pin('d', 280, 90, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [
        body('a', 100, 90),
        body('b', 100, 110),
        body('c', 300, 110),
        body('d', 300, 90),
      ],
      wires
    );
    const p1 = routes.get('w1')!;
    const p2 = routes.get('w2')!;
    expect(allOrthogonal(p1)).toBe(true);
    expect(allOrthogonal(p2)).toBe(true);
    // No shared horizontal segment on the same y over an overlapping x-range.
    const hseg = (p: { x: number; y: number }[]) => {
      const out: { y: number; x0: number; x1: number }[] = [];
      for (let i = 0; i < p.length - 1; i++)
        if (Math.abs(p[i].y - p[i + 1].y) < 0.5)
          out.push({
            y: p[i].y,
            x0: Math.min(p[i].x, p[i + 1].x),
            x1: Math.max(p[i].x, p[i + 1].x),
          });
      return out;
    };
    let overlap = false;
    for (const s of hseg(p1))
      for (const t of hseg(p2))
        if (
          Math.abs(s.y - t.y) < 3 &&
          Math.min(s.x1, t.x1) - Math.max(s.x0, t.x0) > 3
        )
          overlap = true;
    expect(overlap).toBe(false);
  });

  it('never crosses the TARGET body to reach a far-side pin', () => {
    // `a` (right) wires to `b`'s pin on b's FAR (left) side: a straight run would
    // cut through b. The router must go around it (the SR-latch feedback case).
    const to = body('b', 150, 100);
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 280, 100, -1, 0),
        to: pin('b', 130, 100, -1, 0),
      },
    ];
    const routes = routeOrthogonal([body('a', 300, 100), to], wires);
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    expect(hitsBody(p, to)).toBe(false);
  });

  it("routes around another node's LABEL, not only its body", () => {
    // `m` sits above the a→c line; its label (below m) lies on the line.
    const m: RouterObstacle = {
      id: 'm',
      x: 200,
      y: 60,
      w: 40,
      h: 40,
      labelW: 44,
      labelH: 14,
    };
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 96, 1, 0),
        to: pin('c', 280, 96, -1, 0),
      },
    ];
    const routes = routeOrthogonal(
      [body('a', 100, 96), m, body('c', 300, 96)],
      wires
    );
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    // Label rect of m: x∈[178,222], y∈[86,100] (bottom+gap .. +labelH).
    const lab = { x0: 178, y0: 86, x1: 222, y1: 100 };
    let overLabel = false;
    for (let i = 0; i < p.length - 1; i++)
      for (let t = 0; t <= 1; t += 0.02) {
        const x = p[i].x + (p[i + 1].x - p[i].x) * t;
        const y = p[i].y + (p[i + 1].y - p[i].y) * t;
        if (
          x > lab.x0 + 1 &&
          x < lab.x1 - 1 &&
          y > lab.y0 + 1 &&
          y < lab.y1 - 1
        )
          overLabel = true;
      }
    expect(overLabel).toBe(false);
  });

  it('reaches a POINT endpoint at its centre (not blocked by its own body)', () => {
    // A junction/pad anchors at its CENTRE, inside its own body — the wire must
    // still be able to reach it (a hard body would otherwise trap the goal).
    const j = body('j', 200, 100);
    const wires: RouterWire[] = [
      {
        key: 'w',
        from: pin('a', 120, 100, 1, 0),
        to: {
          node: 'j',
          point: { x: 200, y: 100 },
          normal: { x: -1, y: 0 },
          hardNormal: false,
        },
      },
    ];
    const routes = routeOrthogonal([body('a', 100, 100), j], wires);
    const p = routes.get('w')!;
    expect(allOrthogonal(p)).toBe(true);
    const last = p[p.length - 1];
    expect(last.x).toBeCloseTo(200, 0);
    expect(last.y).toBeCloseTo(100, 0);
  });

  it('simplify drops collinear and duplicate points', () => {
    expect(
      simplify([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
      ])
    ).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
    ]);
  });
});
