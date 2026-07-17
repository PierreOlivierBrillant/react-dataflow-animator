import { describe, it, expect } from 'vitest';
import {
  collectArrowConnections,
  computePortOffsets,
  PORT_SPACING,
} from './portOffsets';
import type { DataFlowSpec } from '../types';

const BASE_SPEC: DataFlowSpec = {
  nodes: [],
  packets: [],
  timeline: [],
};

describe('collectArrowConnections — moves', () => {
  it('collects bidirectional moves as two distinct entries', () => {
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      packets: [{ id: 'p', kind: 'http_packet' }],
      timeline: [
        { type: 'move', object: 'p', from: 'A', to: 'B' },
        { type: 'move', object: 'p', from: 'B', to: 'A' },
      ],
    };
    const result = collectArrowConnections(spec);
    expect(result).toHaveLength(2);
    expect(result.find((c) => c.from === 'A' && c.to === 'B')).toBeDefined();
    expect(result.find((c) => c.from === 'B' && c.to === 'A')).toBeDefined();
  });

  it('two opposing moves receive opposing offsets', () => {
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      packets: [{ id: 'p', kind: 'http_packet' }],
      timeline: [
        { type: 'move', object: 'p', from: 'A', to: 'B' },
        { type: 'move', object: 'p', from: 'B', to: 'A' },
      ],
    };
    const connections = collectArrowConnections(spec);
    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.8, cy: 0.5 },
    };
    const offsets = computePortOffsets(connections, layout);
    const ab = connections.find((c) => c.from === 'A' && c.to === 'B')!;
    const ba = connections.find((c) => c.from === 'B' && c.to === 'A')!;
    expect(offsets[ab.key].start).not.toBeCloseTo(0);
    expect(offsets[ba.key].start).not.toBeCloseTo(0);
    // Symmetrical opposites around 0
    expect(offsets[ab.key].start + offsets[ba.key].start).toBeCloseTo(0);
  });

  it('an arrow action A→B with a static connection A→B does not create a 2nd entry', () => {
    // Central case of bug e4aa27b: static A→B + arrow A→B inflated the pair
    // to 2 entries → both received an offset ±15 instead of 0.
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      connections: [{ from: 'A', to: 'B' }],
      timeline: [{ type: 'arrow', from: 'A', to: 'B' }],
    };
    const connections = collectArrowConnections(spec);
    expect(connections).toHaveLength(1);
    expect(connections[0].from).toBe('A');
    expect(connections[0].to).toBe('B');

    const layout = { A: { cx: 0.2, cy: 0.5 }, B: { cx: 0.8, cy: 0.5 } };
    const offsets = computePortOffsets(connections, layout);
    expect(offsets[connections[0].key]).toEqual({ start: 0, end: 0 });
  });

  it('two arrows A→B without a static connection create only one entry', () => {
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      timeline: [
        { type: 'arrow', from: 'A', to: 'B' },
        { type: 'arrow', from: 'A', to: 'B' },
      ],
    };
    const connections = collectArrowConnections(spec);
    const abEntries = connections.filter((c) => c.from === 'A' && c.to === 'B');
    expect(abEntries).toHaveLength(1);

    const layout = { A: { cx: 0.2, cy: 0.5 }, B: { cx: 0.8, cy: 0.5 } };
    const offsets = computePortOffsets(connections, layout);
    expect(offsets[abEntries[0].key]).toEqual({ start: 0, end: 0 });
  });

  it('a move in reverse direction does not shift the existing static connection', () => {
    // Regression e4aa27b: move B→A created a 2nd entry in the A-B pair,
    // which shifted the static connection A→B by ±PORT_SPACING/2.
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      connections: [{ from: 'A', to: 'B' }],
      packets: [{ id: 'p', kind: 'http_packet' }],
      timeline: [{ type: 'move', object: 'p', from: 'B', to: 'A' }],
    };
    const connections = collectArrowConnections(spec);
    // The A-B pair must contain only one entry (the static connection).
    const abPair = connections.filter(
      (c) =>
        (c.from === 'A' && c.to === 'B') || (c.from === 'B' && c.to === 'A')
    );
    expect(abPair).toHaveLength(1);
    expect(abPair[0].from).toBe('A');
    expect(abPair[0].to).toBe('B');

    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.8, cy: 0.5 },
    };
    const offsets = computePortOffsets(connections, layout);
    // Only one entry → offset must be 0 (centered connection).
    expect(offsets[abPair[0].key]).toEqual({ start: 0, end: 0 });
  });

  it('a move and an arrow on the same path create only one entry', () => {
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      packets: [{ id: 'p', kind: 'http_packet' }],
      timeline: [
        { type: 'arrow', id: 'arr1', from: 'A', to: 'B' },
        { type: 'move', object: 'p', from: 'A', to: 'B' },
      ],
    };
    const result = collectArrowConnections(spec);
    // The arrow covers A→B; the move should not add an extra entry
    const abEntries = result.filter((c) => c.from === 'A' && c.to === 'B');
    expect(abEntries).toHaveLength(1);
    expect(abEntries[0].key).toBe('arr1');
  });

  it('a move and an arrow on the same path share the same offset', () => {
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      packets: [{ id: 'p', kind: 'http_packet' }],
      timeline: [
        { type: 'arrow', id: 'arr1', from: 'A', to: 'B' },
        { type: 'move', object: 'p', from: 'A', to: 'B' },
      ],
    };
    const connections = collectArrowConnections(spec);
    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.8, cy: 0.5 },
    };
    const offsets = computePortOffsets(connections, layout);
    // Only one connection A→B → offset 0
    expect(offsets['arr1']).toEqual({ start: 0, end: 0 });
    // The move uses 'arr1' via the fallback from/to of Stage.tsx
    // (no separate entry in portOffsets for the move)
    expect(offsets).not.toHaveProperty('A|B|move_1');
  });

  it('collects moves in parallel blocks', () => {
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      packets: [{ id: 'p', kind: 'http_packet' }],
      timeline: [
        {
          type: 'parallel',
          actions: [
            { type: 'move', object: 'p', from: 'X', to: 'Y' },
            { type: 'move', object: 'p', from: 'Y', to: 'Z' },
          ],
        },
      ],
    };
    const result = collectArrowConnections(spec);
    expect(result).toHaveLength(2);
    expect(result.map((c) => `${c.from}->${c.to}`)).toContain('X->Y');
    expect(result.map((c) => `${c.from}->${c.to}`)).toContain('Y->Z');
  });
});

describe('collectArrowConnections', () => {
  it('deduplicates connections by explicit key', () => {
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      connections: [
        { id: 'same-key', from: 'A', to: 'B' },
        { id: 'same-key', from: 'A', to: 'C' }, // key duplicate → ignored
      ],
    };
    const result = collectArrowConnections(spec);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ key: 'same-key', from: 'A', to: 'B' });
  });

  it('recursively traverses parallel actions', () => {
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      timeline: [
        {
          type: 'parallel',
          actions: [
            { type: 'arrow', from: 'X', to: 'Y' },
            { type: 'arrow', from: 'Y', to: 'Z' },
          ],
        },
      ],
    };
    const result = collectArrowConnections(spec);
    expect(result).toHaveLength(2);
    expect(result.map((c) => `${c.from}->${c.to}`)).toEqual(['X->Y', 'Y->Z']);
  });
});

describe('computePortOffsets', () => {
  it('1 single connection → offsets { start: 0, end: 0 }', () => {
    const connections = [{ key: 'k1', from: 'A', to: 'B' }];
    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.8, cy: 0.5 },
    };
    const result = computePortOffsets(connections, layout);
    expect(result['k1']).toEqual({ start: 0, end: 0 });
  });

  it('2 connections A→B on the same pair → opposing and symmetrical offsets', () => {
    const connections = [
      { key: 'k1', from: 'A', to: 'B' },
      { key: 'k2', from: 'A', to: 'B' },
    ];
    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.8, cy: 0.5 },
    };
    const result = computePortOffsets(connections, layout);
    const half = PORT_SPACING / 2;
    expect(result['k1'].start).toBeCloseTo(-half);
    expect(result['k2'].start).toBeCloseTo(+half);
    // Start and end offsets are symmetrical (same axis)
    expect(result['k1'].start).toBeCloseTo(result['k1'].end);
    expect(result['k2'].start).toBeCloseTo(result['k2'].end);
    // Both are symmetrical around 0
    expect(result['k1'].start + result['k2'].start).toBeCloseTo(0);
  });

  it('2 pairs A→B and A→C sharing a face converge by default (single anchor)', () => {
    // A on the left, B and C on the right (RIGHT side of A) but at different heights.
    const connections = [
      { key: 'ab', from: 'A', to: 'B' },
      { key: 'ac', from: 'A', to: 'C' },
    ];
    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.8, cy: 0.3 }, // higher
      C: { cx: 0.8, cy: 0.7 }, // lower
    };
    // Default: A|RIGHT face merges → both starts collapse to the center (0).
    const merged = computePortOffsets(connections, layout);
    expect(merged['ab'].start).toBeCloseTo(0);
    expect(merged['ac'].start).toBeCloseTo(0);
  });

  it('a node opting out (merge_edges:false) fans its face out', () => {
    const connections = [
      { key: 'ab', from: 'A', to: 'B' },
      { key: 'ac', from: 'A', to: 'C' },
    ];
    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.8, cy: 0.3 },
      C: { cx: 0.8, cy: 0.7 },
    };
    // A opts out → its RIGHT face spreads the two pairs apart again.
    const r = computePortOffsets(
      connections,
      layout,
      1,
      'left-to-right',
      new Set(['A'])
    );
    expect(r['ab'].start).not.toBeCloseTo(r['ac'].start);
    // B and C still merge (not in the opt-out set) → their ends stay centered.
    expect(r['ab'].end).toBeCloseTo(0);
    expect(r['ac'].end).toBeCloseTo(0);
  });

  it('intra-pair spreading is independent of merge (still applies by default)', () => {
    // Two edges between the SAME pair must keep distinct tracks even when the
    // (default) face convergence is active — bidirectional flows stay legible.
    const connections = [
      { key: 'k1', from: 'A', to: 'B' },
      { key: 'k2', from: 'A', to: 'B' },
    ];
    const layout = { A: { cx: 0.2, cy: 0.5 }, B: { cx: 0.8, cy: 0.5 } };
    const result = computePortOffsets(connections, layout);
    const half = PORT_SPACING / 2;
    expect(result['k1'].start).toBeCloseTo(-half);
    expect(result['k2'].start).toBeCloseTo(+half);
  });

  it('circular: aspect ratio determines dominant axis (pixels vs ratios)', () => {
    // Without flow axis (circular), the orientation remains the dominant axis in pixels.
    // A→B: dx=0.3, dy=0.4 → vertical in ratios but |0.3×3|=0.9>0.4 in pixels.
    // A→C: dx=0.3, dy=-0.2 → horizontal in both cases (A|RIGHT face).
    // aspect=3: A→B joins A→C on A|RIGHT → fan-out → ac.start ≠ 0.
    // aspect=1: A→B moves to A|BOTTOM → ac alone on A|RIGHT → ac.start = 0.
    const connections = [
      { key: 'ab1', from: 'A', to: 'B' },
      { key: 'ab2', from: 'A', to: 'B' },
      { key: 'ac', from: 'A', to: 'C' },
    ];
    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.5, cy: 0.9 },
      C: { cx: 0.5, cy: 0.3 },
    };
    // A opts out so the face axis decision stays observable through fan-out.
    const withAspect = computePortOffsets(
      connections,
      layout,
      3,
      'circular',
      new Set(['A'])
    );
    expect(withAspect['ac'].start).toBeCloseTo(-PORT_SPACING / 2);

    const withoutAspect = computePortOffsets(
      connections,
      layout,
      1,
      'circular',
      new Set(['A'])
    );
    expect(withoutAspect['ac'].start).toBeCloseTo(0);
  });

  it('left-to-right flow: orientation follows flow, not aspect', () => {
    // A in lane 1, B and C in lane 2 (cx=0.8) on either side: INTER-lane
    // connections → horizontal (A|RIGHT faces) regardless of aspect. Both
    // pairs share the face → distinct fan-out, at any aspect (≠ old
    // behavior where a portrait Stage switched A→B to vertical).
    const connections = [
      { key: 'ab', from: 'A', to: 'B' },
      { key: 'ac', from: 'A', to: 'C' },
    ];
    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.8, cy: 0.95 }, // very low → dy ≫ dx in ratios
      C: { cx: 0.8, cy: 0.05 }, // very high
    };
    for (const aspect of [0.3, 1, 3]) {
      const r = computePortOffsets(
        connections,
        layout,
        aspect,
        'left-to-right',
        new Set(['A']) // opt out so fan-out (and thus the axis) is observable
      );
      expect(r['ab'].start).not.toBeCloseTo(r['ac'].start);
    }
  });

  it('left-to-right flow: two nodes in same lane (same cx) → vertical axis', () => {
    // A and B share cx=0.5 (stacked) → INTRA-lane connection → vertical:
    // faces A|BOTTOM / B|TOP. A 2nd pair A→B verifies spreading on this axis.
    const connections = [
      { key: 'ab1', from: 'A', to: 'B' },
      { key: 'ab2', from: 'A', to: 'B' },
    ];
    const layout = {
      A: { cx: 0.5, cy: 0.2 },
      B: { cx: 0.5, cy: 0.8 },
    };
    const r = computePortOffsets(connections, layout, 1.6, 'left-to-right');
    // Opposing and symmetrical intra-pair offsets (regardless of axis).
    expect(r['ab1'].start).toBeCloseTo(-r['ab2'].start);
    expect(Math.abs(r['ab1'].start)).toBeCloseTo(PORT_SPACING / 2);
  });

  it('connection to missing id in layout → does not crash (uses 0.5/0.5)', () => {
    const connections = [{ key: 'k1', from: 'A', to: 'MISSING' }];
    const layout = { A: { cx: 0.2, cy: 0.5 } };
    expect(() => computePortOffsets(connections, layout)).not.toThrow();
    const result = computePortOffsets(connections, layout);
    expect(result['k1']).toEqual({ start: 0, end: 0 });
  });
});
