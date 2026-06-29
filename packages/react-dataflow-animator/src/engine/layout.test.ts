import { describe, expect, it } from 'vitest';
import type { DataFlowSpec } from '../types';
import { computeLayout, connectionAxis } from './layout';

describe('computeLayout — linear', () => {
  it('left-to-right: increasing lane = increasing x', () => {
    const spec: DataFlowSpec = {
      direction: 'left-to-right',
      nodes: [
        { id: 'a', type: 'client', lane: 1 },
        { id: 'b', type: 'server', lane: 2 },
        { id: 'c', type: 'database', lane: 3 },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    expect(layout.a.cx).toBeLessThan(layout.b.cx);
    expect(layout.b.cx).toBeLessThan(layout.c.cx);
    // aligned vertically (single column per lane)
    expect(layout.a.cy).toBeCloseTo(layout.b.cy);
  });

  it('stacks nodes of the same lane on the transverse axis', () => {
    const spec: DataFlowSpec = {
      direction: 'left-to-right',
      nodes: [
        { id: 'a', type: 'user', lane: 1 },
        { id: 'b', type: 'user', lane: 1 },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    expect(layout.a.cx).toBeCloseTo(layout.b.cx);
    expect(layout.a.cy).not.toBeCloseTo(layout.b.cy);
  });

  it('few nodes: spaced out (margin 0.2), not stuck to edges', () => {
    const spec: DataFlowSpec = {
      direction: 'left-to-right',
      nodes: [
        { id: 'a', type: 'client', lane: 1 },
        { id: 'b', type: 'server', lane: 2 },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    // spacing margin capped at 0.2 → ends at 0.2 and 0.8.
    expect(layout.a.cx).toBeCloseTo(0.2, 5);
    expect(layout.b.cx).toBeCloseTo(0.8, 5);
  });

  it('many nodes: tightened margin to preserve minimal distance', () => {
    const spec: DataFlowSpec = {
      direction: 'left-to-right',
      nodes: Array.from({ length: 6 }, (_, i) => ({
        id: `n${i}`,
        type: 'server' as const,
        lane: i + 1,
      })),
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    // 6 lanes → m = 1/7 ≈ 0.143 < 0.2: the ends are closer to the edges.
    expect(layout.n0.cx).toBeCloseTo(1 / 7, 5);
    expect(layout.n5.cx).toBeCloseTo(6 / 7, 5);
  });

  it('align_with: the aligned node does not collide with free nodes in its lane', () => {
    // Reproduces the bug: lane 1 = [server, db, fcm(align_with)], lane 2 = [alice].
    // Without the fix, fcm inherits cy=alice.cy=0.5, identical to db.cy — collision.
    const spec: DataFlowSpec = {
      direction: 'left-to-right',
      nodes: [
        { id: 'alice', type: 'client', lane: 2 },
        { id: 'server', type: 'server', lane: 1 },
        { id: 'db', type: 'database', lane: 1 },
        { id: 'fcm', type: 'cloud', lane: 1, align_with: 'alice' },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    // fcm must be aligned with alice (same cy)
    expect(layout.fcm.cy).toBeCloseTo(layout.alice.cy);
    // free nodes in the same lane must not overlap with fcm/alice
    expect(layout.server.cy).not.toBeCloseTo(layout.alice.cy);
    expect(layout.db.cy).not.toBeCloseTo(layout.alice.cy);
    // free nodes do not overlap each other
    expect(layout.server.cy).not.toBeCloseTo(layout.db.cy);
  });

  it('multiple align_with in the same lane: no collision even if targets have the same initial cy', () => {
    // Problematic config: bob and alice are alone in their lane → cy=0.5 both.
    // Without resolveCollisions, server, token_db and fcm all overlap at cy=0.5.
    const spec: DataFlowSpec = {
      direction: 'left-to-right',
      nodes: [
        { id: 'bob', type: 'bob', lane: 1 },
        { id: 'alice', type: 'alice', lane: 3 },
        { id: 'server', type: 'server', lane: 2 },
        { id: 'token_db', type: 'database', lane: 2, align_with: 'bob' },
        { id: 'fcm', type: 'cloud', lane: 2, align_with: 'alice' },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    // No collision in lane 2
    expect(layout.server.cy).not.toBeCloseTo(layout.token_db.cy);
    expect(layout.server.cy).not.toBeCloseTo(layout.fcm.cy);
    expect(layout.token_db.cy).not.toBeCloseTo(layout.fcm.cy);
    // The align_with constraints are still honored
    expect(layout.token_db.cy).toBeCloseTo(layout.bob.cy);
    expect(layout.fcm.cy).toBeCloseTo(layout.alice.cy);
  });

  it('top-to-bottom: increasing lane = increasing y', () => {
    const spec: DataFlowSpec = {
      direction: 'top-to-bottom',
      nodes: [
        { id: 'a', type: 'client', lane: 1 },
        { id: 'b', type: 'server', lane: 2 },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    expect(layout.a.cy).toBeLessThan(layout.b.cy);
  });
});

describe('computeLayout — circular', () => {
  it('places main in the center and others around it', () => {
    const spec: DataFlowSpec = {
      direction: 'circular',
      nodes: [
        { id: 'hub', type: 'server', main: true },
        { id: 'n1', type: 'client' },
        { id: 'n2', type: 'client' },
        { id: 'n3', type: 'client' },
      ],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec, { aspect: 1 });
    expect(layout.hub).toEqual({ cx: 0.5, cy: 0.5 });
    for (const id of ['n1', 'n2', 'n3']) {
      const d = Math.hypot(layout[id].cx - 0.5, layout[id].cy - 0.5);
      expect(d).toBeGreaterThan(0.2); // on the ring
    }
  });

  it('places all static nodes (connections are not nodes)', () => {
    const spec: DataFlowSpec = {
      direction: 'left-to-right',
      nodes: [
        { id: 'a', type: 'client', lane: 1 },
        { id: 'b', type: 'server', lane: 2 },
      ],
      connections: [{ from: 'a', to: 'b' }],
      packets: [],
      timeline: [],
    };
    const layout = computeLayout(spec);
    expect(layout.a).toBeDefined();
    expect(layout.b).toBeDefined();
  });
});

describe('connectionAxis', () => {
  it('left-to-right: inter-lane → horizontal, even with steep slope', () => {
    // significant Δcx (different lanes) → horizontal, regardless of Δcy.
    const a = { cx: 0.2, cy: 0.5 };
    const auth = { cx: 0.8, cy: 0.1 }; // much higher → Δcy > Δcx
    expect(connectionAxis(a, auth, 'left-to-right')).toBe('horizontal');
  });

  it('left-to-right: same lane (same cx) → vertical', () => {
    const a = { cx: 0.5, cy: 0.2 };
    const b = { cx: 0.5, cy: 0.8 };
    expect(connectionAxis(a, b, 'left-to-right')).toBe('vertical');
  });

  it('right-to-left: inter-lane → horizontal', () => {
    expect(
      connectionAxis(
        { cx: 0.8, cy: 0.5 },
        { cx: 0.2, cy: 0.2 },
        'right-to-left'
      )
    ).toBe('horizontal');
  });

  it('top-to-bottom: inter-lane → vertical; same lane → horizontal', () => {
    expect(
      connectionAxis(
        { cx: 0.5, cy: 0.2 },
        { cx: 0.1, cy: 0.8 },
        'top-to-bottom'
      )
    ).toBe('vertical');
    expect(
      connectionAxis(
        { cx: 0.2, cy: 0.5 },
        { cx: 0.8, cy: 0.5 },
        'top-to-bottom'
      )
    ).toBe('horizontal');
  });

  it('circular: dominant axis in pixels (aspect breaks the tie)', () => {
    const a = { cx: 0.2, cy: 0.5 };
    const b = { cx: 0.5, cy: 0.9 }; // Δcx=0.3, Δcy=0.4
    expect(connectionAxis(a, b, 'circular', 1)).toBe('vertical');
    expect(connectionAxis(a, b, 'circular', 3)).toBe('horizontal'); // 0.3×3 > 0.4
  });
});
