import { describe, expect, it } from 'vitest';
import type { DataFlowSpec } from '../types';
import { computeLayout } from './layout';

describe('computeLayout — linéaire', () => {
  it('left-to-right : lane croissante = x croissant', () => {
    const spec: DataFlowSpec = {
      direction: 'left-to-right',
      static_objects: [
        { id: 'a', object_type: 'client', lane: 1 },
        { id: 'b', object_type: 'server', lane: 2 },
        { id: 'c', object_type: 'database', lane: 3 },
      ],
      dynamic_objects: [],
      actions: [],
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
      static_objects: [
        { id: 'a', object_type: 'user', lane: 1 },
        { id: 'b', object_type: 'user', lane: 1 },
      ],
      dynamic_objects: [],
      actions: [],
    };
    const layout = computeLayout(spec);
    expect(layout.a.cx).toBeCloseTo(layout.b.cx);
    expect(layout.a.cy).not.toBeCloseTo(layout.b.cy);
  });

  it('top-to-bottom : lane croissante = y croissant', () => {
    const spec: DataFlowSpec = {
      direction: 'top-to-bottom',
      static_objects: [
        { id: 'a', object_type: 'client', lane: 1 },
        { id: 'b', object_type: 'server', lane: 2 },
      ],
      dynamic_objects: [],
      actions: [],
    };
    const layout = computeLayout(spec);
    expect(layout.a.cy).toBeLessThan(layout.b.cy);
  });
});

describe('computeLayout — circular', () => {
  it('place is_main au centre et les autres autour', () => {
    const spec: DataFlowSpec = {
      direction: 'circular',
      static_objects: [
        { id: 'hub', object_type: 'server', is_main: true },
        { id: 'n1', object_type: 'client' },
        { id: 'n2', object_type: 'client' },
        { id: 'n3', object_type: 'client' },
      ],
      dynamic_objects: [],
      actions: [],
    };
    const layout = computeLayout(spec, { aspect: 1 });
    expect(layout.hub).toEqual({ cx: 0.5, cy: 0.5 });
    for (const id of ['n1', 'n2', 'n3']) {
      const d = Math.hypot(layout[id].cx - 0.5, layout[id].cy - 0.5);
      expect(d).toBeGreaterThan(0.2); // sur l’anneau
    }
  });

  it('exclut les flèches statiques du placement', () => {
    const spec: DataFlowSpec = {
      direction: 'left-to-right',
      static_objects: [
        { id: 'a', object_type: 'client', lane: 1 },
        { id: 'arr', object_type: 'arrow', from: 'a', to: 'a' },
      ],
      dynamic_objects: [],
      actions: [],
    };
    const layout = computeLayout(spec);
    expect(layout.a).toBeDefined();
    expect(layout.arr).toBeUndefined();
  });
});
