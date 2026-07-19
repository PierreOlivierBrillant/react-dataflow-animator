import { describe, expect, it } from 'vitest';
import {
  buildFlowPath,
  collectEndpointRefs,
  connectionKey,
  contourResolver,
  createWireContext,
  labelSideMap,
  routeCircuit,
  routesByNodePair,
} from './wireModel';
import { computeLayout } from '../engine/layout';
import {
  computePortOffsets,
  collectArrowConnections,
} from '../engine/portOffsets';
import { autoRotationMap } from './nodeStateAtT';
import type { DataFlowSpec } from '../types';
import type { GeometryMap } from '../engine/geometry';

const circuitSpec: DataFlowSpec = {
  direction: 'circuit',
  nodes: [
    { id: 'a', type: 'signal', text: 'A' },
    { id: 'b', type: 'signal', text: 'B' },
    { id: 'g', type: 'and_gate' },
    { id: 'out', type: 'signal', text: 'Y' },
  ],
  packets: [],
  timeline: [],
  connections: [
    { from: 'a', to: 'g:a' },
    { from: 'b', to: 'g:b' },
    { from: 'g:y', to: 'out' },
  ],
};

describe('collectEndpointRefs', () => {
  it('gathers connection ends', () => {
    const refs = collectEndpointRefs(circuitSpec);

    expect(refs.has('a')).toBe(true);
    expect(refs.has('g:a')).toBe(true);
    expect(refs.has('g:y')).toBe(true);
  });

  it('walks arrow, move and flow actions', () => {
    const refs = collectEndpointRefs({
      nodes: [],
      packets: [],
      timeline: [
        { type: 'arrow', from: 'x', to: 'y', duration: 100 },
        { type: 'move', object: 'p', from: 'm', to: 'n', duration: 100 },
        { type: 'flow', route: ['r1', 'r2'], duration: 100 },
      ],
    });

    expect([...refs].sort()).toEqual(['m', 'n', 'r1', 'r2', 'x', 'y']);
  });

  it('descends into a parallel block', () => {
    const refs = collectEndpointRefs({
      nodes: [],
      packets: [],
      timeline: [
        {
          type: 'parallel',
          actions: [{ type: 'arrow', from: 'deep', to: 'end', duration: 10 }],
        },
      ],
    });

    expect(refs.has('deep')).toBe(true);
  });

  it('copes with a spec that has neither connections nor timeline', () => {
    expect(
      collectEndpointRefs({ nodes: [], packets: [], timeline: [] }).size
    ).toBe(0);
  });
});

describe('connectionKey', () => {
  it('prefers the id, else composes from the endpoints and the index', () => {
    expect(connectionKey({ id: 'k', from: 'a', to: 'b' }, 2)).toBe('k');
    expect(connectionKey({ from: 'a', to: 'b' }, 2)).toBe('a|b|2');
  });
});

describe('contourResolver', () => {
  it('resolves a component terminal to a pin contour', () => {
    const resolve = contourResolver(circuitSpec, new Map());

    expect(resolve('g:a')?.kind).toBe('pin');
  });

  it('leaves a plain box face-anchored', () => {
    expect(contourResolver(circuitSpec, new Map())('a')).toBeUndefined();
  });

  it('returns undefined for an unknown node', () => {
    expect(contourResolver(circuitSpec, new Map())('ghost')).toBeUndefined();
  });

  it('rotates a pin by the auto-layout rotation when none is declared', () => {
    const rotated = contourResolver(circuitSpec, new Map([['g', 90]]))('g:a');

    expect(rotated).toMatchObject({ kind: 'pin', rotationDeg: 90 });
  });

  it('lets an explicit rotation win', () => {
    const spec: DataFlowSpec = {
      ...circuitSpec,
      nodes: circuitSpec.nodes.map((n) =>
        n.id === 'g' ? { ...n, rotation: 45 } : n
      ),
    };

    expect(contourResolver(spec, new Map([['g', 90]]))('g:a')).toMatchObject({
      rotationDeg: 45,
    });
  });

  it('gives a round node an ellipse contour', () => {
    const spec: DataFlowSpec = {
      nodes: [{ id: 'c', type: 'circle' }],
      packets: [],
      timeline: [],
    };

    expect(contourResolver(spec, new Map())('c')?.kind).toBe('ellipse');
  });
});

describe('labelSideMap', () => {
  it('is empty outside a circuit', () => {
    const spec: DataFlowSpec = {
      nodes: [{ id: 'r', type: 'resistor', rotation: 90 }],
      packets: [],
      timeline: [],
    };

    expect(labelSideMap(spec, {}, new Map()).size).toBe(0);
  });

  it('moves the label OUTWARD for a component wired top/bottom', () => {
    const spec: DataFlowSpec = {
      direction: 'circuit',
      nodes: [
        { id: 'left', type: 'resistor', rotation: 90 },
        { id: 'right', type: 'resistor', rotation: 90 },
      ],
      packets: [],
      timeline: [],
    };
    const layout = { left: { cx: 0.2, cy: 0.5 }, right: { cx: 0.8, cy: 0.5 } };
    const sides = labelSideMap(spec, layout, new Map());

    expect(sides.get('left')).toBe('left');
    expect(sides.get('right')).toBe('right');
  });

  it('leaves a horizontally-wired component`s label below', () => {
    const spec: DataFlowSpec = {
      direction: 'circuit',
      nodes: [
        { id: 'flat', type: 'resistor', rotation: 0 },
        { id: 'flipped', type: 'resistor', rotation: 180 },
      ],
      packets: [],
      timeline: [],
    };

    expect(labelSideMap(spec, {}, new Map()).size).toBe(0);
  });

  it('skips a component with no rotation at all', () => {
    const spec: DataFlowSpec = {
      direction: 'circuit',
      nodes: [{ id: 'r', type: 'resistor' }],
      packets: [],
      timeline: [],
    };

    expect(labelSideMap(spec, {}, new Map()).size).toBe(0);
  });
});

describe('createWireContext', () => {
  const layout = computeLayout(circuitSpec, { aspect: 1.6 });
  const ctx = createWireContext(
    circuitSpec,
    layout,
    1.6,
    computePortOffsets(
      collectArrowConnections(circuitSpec),
      layout,
      1.6,
      'circuit',
      new Set()
    ),
    autoRotationMap(layout)
  );

  it('derives an attachment axis from the layout flow', () => {
    expect(ctx.axisFor('a', 'g:a')).toBeDefined();
  });

  it('returns no axis when an endpoint is missing from the layout', () => {
    expect(ctx.axisFor('ghost', 'g:a')).toBeUndefined();
  });

  it('zeroes the port spread at a precise endpoint', () => {
    // A pin is an exact point: spreading around it would detach the wire.
    expect(ctx.portsFor('a|g:a|0', 'a', 'g:a').end).toBe(0);
  });

  it('falls back to a zero spread for an unknown key', () => {
    expect(ctx.portsFor('nope', 'a', 'b')).toEqual({ start: 0, end: 0 });
  });
});

describe('routeCircuit', () => {
  const geometry: GeometryMap = {
    a: { id: 'a', x: 60, y: 80, width: 40, height: 30 },
    b: { id: 'b', x: 60, y: 220, width: 40, height: 30 },
    g: { id: 'g', x: 300, y: 150, width: 60, height: 60 },
    out: { id: 'out', x: 540, y: 150, width: 40, height: 30 },
  };
  const layout = computeLayout(circuitSpec, { aspect: 1.6 });
  const ctx = createWireContext(
    circuitSpec,
    layout,
    1.6,
    computePortOffsets(
      collectArrowConnections(circuitSpec),
      layout,
      1.6,
      'circuit',
      new Set()
    ),
    autoRotationMap(layout)
  );

  it('returns nothing outside a circuit', () => {
    const flow: DataFlowSpec = { ...circuitSpec, direction: 'left-to-right' };

    expect(routeCircuit(flow, geometry, ctx, new Map(), 1).routes.size).toBe(0);
  });

  it('routes every wire whose endpoints are measured', () => {
    const { routes } = routeCircuit(circuitSpec, geometry, ctx, new Map(), 1);

    expect(routes.size).toBe(3);
    for (const route of routes.values())
      expect(route.length).toBeGreaterThanOrEqual(2);
  });

  it('keys the routes the way the renderer looks them up', () => {
    const { routes } = routeCircuit(circuitSpec, geometry, ctx, new Map(), 1);

    expect(routes.has(connectionKey(circuitSpec.connections![0], 0))).toBe(
      true
    );
  });

  it('skips a wire whose endpoints are not measured', () => {
    const partial: GeometryMap = { a: geometry.a, g: geometry.g };
    const { routes } = routeCircuit(circuitSpec, partial, ctx, new Map(), 1);

    expect(routes.size).toBe(1);
  });

  it('returns nothing when no wire has measured endpoints', () => {
    expect(routeCircuit(circuitSpec, {}, ctx, new Map(), 1).routes.size).toBe(
      0
    );
  });

  it('reports the crossings that need a bridge', () => {
    const { hops } = routeCircuit(circuitSpec, geometry, ctx, new Map(), 1);

    // A map is always returned, whether or not this topology crosses.
    expect(hops).toBeInstanceOf(Map);
  });
});

describe('routesByNodePair', () => {
  it('re-keys the router output by node pair, pins stripped', () => {
    const route = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const routes = new Map([
      [connectionKey(circuitSpec.connections![0], 0), route],
    ]);

    expect(routesByNodePair(circuitSpec, routes).get('a|g')).toBe(route);
  });

  it('skips a connection the router did not route', () => {
    expect(routesByNodePair(circuitSpec, new Map()).size).toBe(0);
  });
});

describe('buildFlowPath', () => {
  const geometry: GeometryMap = {
    a: { id: 'a', x: 0, y: 0, width: 10, height: 10 },
    b: { id: 'b', x: 100, y: 0, width: 10, height: 10 },
    c: { id: 'c', x: 100, y: 100, width: 10, height: 10 },
  };
  const noContour = () => undefined;
  const noAxis = () => undefined;

  it('routes a segment on its own when no wire route exists', () => {
    const pts = buildFlowPath(
      ['a', 'b'],
      geometry,
      noContour,
      noAxis,
      [],
      new Map()
    );

    expect(pts.length).toBeGreaterThanOrEqual(2);
  });

  it('rides the drawn wire route when one exists', () => {
    const wire = [
      { x: 5, y: 0 },
      { x: 50, y: 0 },
      { x: 95, y: 0 },
    ];
    const pts = buildFlowPath(
      ['a', 'b'],
      geometry,
      noContour,
      noAxis,
      [],
      new Map([['a|b', wire]])
    );

    expect(pts).toEqual(wire);
  });

  it('reuses a reversed wire route backwards', () => {
    const wire = [
      { x: 95, y: 0 },
      { x: 5, y: 0 },
    ];
    const pts = buildFlowPath(
      ['a', 'b'],
      geometry,
      noContour,
      noAxis,
      [],
      new Map([['b|a', wire]])
    );

    expect(pts).toEqual([...wire].reverse());
  });

  it('chains contiguous segments without duplicating the shared point', () => {
    const seg1 = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const seg2 = [
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const pts = buildFlowPath(
      ['a', 'b', 'c'],
      geometry,
      noContour,
      noAxis,
      [],
      new Map([
        ['a|b', seg1],
        ['b|c', seg2],
      ])
    );

    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
  });

  it('bridges a corner junction through the node centre', () => {
    // seg1 ends on one face of `b`, seg2 leaves another: the charge must turn
    // the corner via b's centre instead of cutting across it.
    const seg1 = [
      { x: 0, y: 0 },
      { x: 92, y: 0 },
    ];
    const seg2 = [
      { x: 100, y: 8 },
      { x: 100, y: 100 },
    ];
    const pts = buildFlowPath(
      ['a', 'b', 'c'],
      geometry,
      noContour,
      noAxis,
      [],
      new Map([
        ['a|b', seg1],
        ['b|c', seg2],
      ])
    );

    expect(pts).toEqual([seg1[0], seg1[1], { x: 100, y: 0 }, seg2[0], seg2[1]]);
  });

  it('skips segments whose endpoints are not measured', () => {
    const pts = buildFlowPath(
      ['ghost', 'a', 'b'],
      geometry,
      noContour,
      noAxis,
      [],
      new Map([
        [
          'a|b',
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
        ],
      ])
    );

    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });
});
