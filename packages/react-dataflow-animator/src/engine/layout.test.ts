import { describe, expect, it } from 'vitest';
import type { DataFlowSpec } from '../types';
import { computeLayout } from './layout';

describe('computeLayout — linéaire', () => {
  it('left-to-right : lane croissante = x croissant', () => {
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
    // alignés verticalement (une seule colonne par lane)
    expect(layout.a.cy).toBeCloseTo(layout.b.cy);
  });

  it('empile les nœuds d’une même lane sur l’axe transverse', () => {
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

  it('peu de nœuds : aérés (marge 0,2), pas collés aux bords', () => {
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
    // marge d'aération plafonnée à 0,2 → extrémités à 0,2 et 0,8.
    expect(layout.a.cx).toBeCloseTo(0.2, 5);
    expect(layout.b.cx).toBeCloseTo(0.8, 5);
  });

  it('beaucoup de nœuds : marge resserrée pour préserver la distance minimale', () => {
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
    // 6 lanes → m = 1/7 ≈ 0,143 < 0,2 : les extrémités sont plus proches des bords.
    expect(layout.n0.cx).toBeCloseTo(1 / 7, 5);
    expect(layout.n5.cx).toBeCloseTo(6 / 7, 5);
  });

  it('top-to-bottom : lane croissante = y croissant', () => {
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
  it('place main au centre et les autres autour', () => {
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
      expect(d).toBeGreaterThan(0.2); // sur l’anneau
    }
  });

  it('place tous les nœuds statiques (les connexions ne sont pas des nœuds)', () => {
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
