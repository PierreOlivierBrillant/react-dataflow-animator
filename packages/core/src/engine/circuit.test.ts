import { describe, expect, it } from 'vitest';
import type { DataFlowSpec } from '../types';
import { computeLayout, connectionAxis } from './layout';
import {
  connection,
  nodeContour,
  pointAtArc,
  type NodeContour,
  type NodeGeom,
} from './geometry';

const geom = (id: string, x: number, y: number): NodeGeom => ({
  id,
  x,
  y,
  width: 40,
  height: 40,
});

describe('circuit layout', () => {
  it('places nodes at their authored x/y (passthrough)', () => {
    const spec: DataFlowSpec = {
      direction: 'circuit',
      nodes: [
        { id: 'batt', type: 'battery', x: 0.2, y: 0.8 },
        { id: 'r1', type: 'resistor', x: 0.8, y: 0.2 },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    expect(layout.batt).toEqual({ cx: 0.2, cy: 0.8 });
    expect(layout.r1).toEqual({ cx: 0.8, cy: 0.2 });
  });

  it('auto-places a node that omits both x and y (no collapse to centre)', () => {
    const spec: DataFlowSpec = {
      direction: 'circuit',
      nodes: [
        { id: 'a', type: 'resistor' },
        { id: 'b', type: 'resistor' },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    expect(layout.a).toBeDefined();
    expect(layout.b).toBeDefined();
    // Distinct positions rather than both stacked on the centre.
    expect(layout.a).not.toEqual(layout.b);
  });
});

describe('circuit auto-layout (no coordinates, single loop)', () => {
  const loop: DataFlowSpec = {
    direction: 'circuit',
    nodes: [
      { id: 'batt', type: 'battery' },
      { id: 'sw', type: 'switch' },
      { id: 'R1', type: 'resistor' },
      { id: 'led', type: 'led' },
    ],
    connections: [
      { from: 'batt:+', to: 'sw:a' },
      { from: 'sw:b', to: 'R1:a' },
      { from: 'R1:b', to: 'led:a' },
      { from: 'led:b', to: 'batt:-' },
    ],
    packets: [],
    timeline: [],
  };

  it('places a 4-node loop around a rectangle, all distinct', () => {
    const layout = computeLayout(loop);
    const pts = Object.values(layout);
    expect(pts).toHaveLength(4);
    const keys = new Set(
      pts.map((p) => `${p.cx.toFixed(3)},${p.cy.toFixed(3)}`)
    );
    expect(keys.size).toBe(4);
    // Every node sits inside the stage margins.
    for (const p of pts) {
      expect(p.cx).toBeGreaterThan(0);
      expect(p.cx).toBeLessThan(1);
      expect(p.cy).toBeGreaterThan(0);
      expect(p.cy).toBeLessThan(1);
    }
  });

  it('auto-rotates non-top-edge components (90° right, 180° bottom, 270° left)', () => {
    const layout = computeLayout(loop);
    const rots = Object.values(layout)
      .map((p) => p.rotation)
      .filter((r) => r !== undefined)
      .sort((a, b) => (a as number) - (b as number));
    expect(rots).toEqual([90, 180, 270]);
  });

  it('falls back to coordinate layout when any node has x/y', () => {
    const withCoords: DataFlowSpec = {
      ...loop,
      nodes: loop.nodes.map((n, i) => (i === 0 ? { ...n, x: 0.5, y: 0.5 } : n)),
    };
    const layout = computeLayout(withCoords);
    // No auto-rotation in the coordinate/grid path.
    expect(Object.values(layout).every((p) => p.rotation === undefined)).toBe(
      true
    );
    expect(layout.batt).toEqual({ cx: 0.5, cy: 0.5 });
  });

  it('falls back (no rotation) when the graph is not a single cycle', () => {
    const branch: DataFlowSpec = {
      direction: 'circuit',
      nodes: [
        { id: 'a', type: 'junction' },
        { id: 'b', type: 'resistor' },
        { id: 'c', type: 'resistor' },
      ],
      // a—b and a—c: node `a` has degree 2 but b, c have degree 1 → not a cycle.
      connections: [
        { from: 'a', to: 'b:a' },
        { from: 'a', to: 'c:a' },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(branch);
    expect(Object.values(layout).every((p) => p.rotation === undefined)).toBe(
      true
    );
  });
});

describe('circuit DAG auto-layout (connected feed-forward, no coords)', () => {
  it('lays a feed-forward network left-to-right in layers', () => {
    const spec: DataFlowSpec = {
      direction: 'circuit',
      nodes: [
        { id: 'a', type: 'junction' },
        { id: 'b', type: 'junction' },
        { id: 'g', type: 'and_gate' },
        { id: 'out', type: 'junction' },
      ],
      connections: [
        { from: 'a', to: 'g:a' },
        { from: 'b', to: 'g:b' },
        { from: 'g:y', to: 'out' },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    // Layers {a,b} → g → out, strictly increasing x; the two inputs share a
    // column (only a small per-row x-stagger apart, both left of the gate).
    expect(layout.a.cx).toBeLessThan(layout.g.cx);
    expect(layout.b.cx).toBeLessThan(layout.g.cx);
    expect(layout.g.cx).toBeLessThan(layout.out.cx);
    expect(Math.abs(layout.a.cx - layout.b.cx)).toBeLessThan(0.1);
    expect(Object.values(layout).every((p) => p.rotation === undefined)).toBe(
      true
    );
  });

  it('falls back (grid) for a disconnected gallery of cells', () => {
    const spec: DataFlowSpec = {
      direction: 'circuit',
      nodes: [
        { id: 'a', type: 'junction' },
        { id: 'ga', type: 'not_gate' },
        { id: 'b', type: 'junction' },
        { id: 'gb', type: 'not_gate' },
      ],
      connections: [
        { from: 'a', to: 'ga:a' },
        { from: 'b', to: 'gb:a' },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    expect(Object.keys(layout)).toHaveLength(4);
  });
});

describe('junction point contour', () => {
  it('nodeContour: a junction is a point; a signal pad attaches on its side', () => {
    expect(nodeContour('junction')).toEqual({ kind: 'point' });
    // A signal I/O pad uses the cardinal-face model (wire on the side), not a
    // centre point.
    expect(nodeContour('signal')).toBeUndefined();
    expect(nodeContour('circle')).toEqual({ kind: 'ellipse', ports: 'direct' });
    expect(nodeContour('resistor')).toBeUndefined();
  });

  it('anchors a wire at the junction centre (no label/box skew)', () => {
    const from = geom('j', 100, 100);
    const to = geom('k', 300, 100);
    const conn = connection(from, to, [], 0, 0, 'straight', undefined, {
      kind: 'point',
    });
    expect(conn.start).toEqual({ x: 100, y: 100 });
  });
});

describe('orthogonal wires never cross a component body', () => {
  /** True iff the polyline enters the interior of `n` (strict, small margin). */
  const pathHitsBody = (pts: { x: number; y: number }[], n: NodeGeom) => {
    const x0 = n.x - n.width / 2 + 2;
    const x1 = n.x + n.width / 2 - 2;
    const y0 = n.y - n.height / 2 + 2;
    const y1 = n.y + n.height / 2 - 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      for (let t = 0; t <= 1; t += 0.02) {
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        if (x > x0 && x < x1 && y > y0 && y < y1) return true;
      }
    }
    return false;
  };

  it('a step wire detours around a component sitting on the straight line', () => {
    const from = geom('a', 100, 100);
    const mid = geom('b', 200, 100); // squarely between a and c
    const to = geom('c', 300, 100);
    const conn = connection(from, to, [mid], 0, 0, 'step');
    const path = [conn.start, ...(conn.waypoints ?? []), conn.end];
    // The wire clears `b` (a detour was inserted) rather than running through it.
    expect(pathHitsBody(path, mid)).toBe(false);
    expect(conn.waypoints && conn.waypoints.length).toBeGreaterThan(0);
  });

  it('leaves a curved (bezier) network edge to its own routing (label only)', () => {
    // Body avoidance is orthogonal-only: a bezier edge is NOT forced to detour
    // around a body (the chord is a poor proxy for the drawn curve).
    const from = geom('a', 100, 100);
    const mid = geom('b', 200, 100);
    const to = geom('c', 300, 100);
    const conn = connection(from, to, [mid], 0, 0, 'bezier');
    // A label-less obstacle inserts no detour for a curve.
    expect(conn.waypoints ?? []).toEqual([]);
  });
});

describe('connectionAxis (circuit)', () => {
  it('uses the dominant pixel axis (no flow direction)', () => {
    expect(
      connectionAxis({ cx: 0.2, cy: 0.5 }, { cx: 0.8, cy: 0.5 }, 'circuit', 1)
    ).toBe('horizontal');
    expect(
      connectionAxis({ cx: 0.5, cy: 0.2 }, { cx: 0.5, cy: 0.8 }, 'circuit', 1)
    ).toBe('vertical');
  });
});

describe('pin anchoring (pinAttach via connection)', () => {
  const pinEast: NodeContour = {
    kind: 'pin',
    pin: { x: 1, y: 0.5, nx: 1, ny: 0 },
    rotationDeg: 0,
  };

  it('anchors on the exact terminal of an unrotated component', () => {
    const from = geom('r1', 100, 100);
    const to = geom('j', 300, 100);
    const conn = connection(from, to, [], 0, 0, 'straight', undefined, pinEast);
    // East terminal of a 40px-wide node centred at x=100 → x=120, y unchanged.
    expect(conn.start.x).toBeCloseTo(120, 5);
    expect(conn.start.y).toBeCloseTo(100, 5);
  });

  it('rotates the terminal with the component (rotation: 90 → bottom)', () => {
    const from = geom('r1', 100, 100);
    const to = geom('j', 100, 300);
    const rotated: NodeContour = { ...pinEast, rotationDeg: 90 };
    const conn = connection(from, to, [], 0, 0, 'straight', undefined, rotated);
    // The east terminal (local +x) rotates to point down: x stays 100, y = 120.
    expect(conn.start.x).toBeCloseTo(100, 5);
    expect(conn.start.y).toBeCloseTo(120, 5);
  });
});

describe('pointAtArc', () => {
  const poly = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it('returns endpoints at u=0 and u=1', () => {
    expect(pointAtArc(poly, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAtArc(poly, 1)).toEqual({ x: 10, y: 10 });
  });

  it('interpolates by arc length across segments', () => {
    // Total length 20; u=0.5 → 10px in → the corner.
    expect(pointAtArc(poly, 0.5)).toEqual({ x: 10, y: 0 });
    // u=0.75 → 15px → halfway up the second segment.
    expect(pointAtArc(poly, 0.75)).toEqual({ x: 10, y: 5 });
  });

  it('clamps out-of-range and handles degenerate inputs', () => {
    expect(pointAtArc(poly, -1)).toEqual({ x: 0, y: 0 });
    expect(pointAtArc(poly, 2)).toEqual({ x: 10, y: 10 });
    expect(pointAtArc([], 0.5)).toEqual({ x: 0, y: 0 });
    expect(pointAtArc([{ x: 3, y: 4 }], 0.5)).toEqual({ x: 3, y: 4 });
  });
});
