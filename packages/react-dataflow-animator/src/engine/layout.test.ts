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

  it('align_with : le nœud aligné ne collision pas avec les nœuds libres de sa lane', () => {
    // Reproduit le bug : lane 1 = [server, db, fcm(align_with)], lane 2 = [alice].
    // Sans le fix, fcm hérite de cy=alice.cy=0.5, identique à db.cy — collision.
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
    // fcm doit être aligné sur alice (même cy)
    expect(layout.fcm.cy).toBeCloseTo(layout.alice.cy);
    // les nœuds libres de la même lane ne doivent pas se superposer à fcm/alice
    expect(layout.server.cy).not.toBeCloseTo(layout.alice.cy);
    expect(layout.db.cy).not.toBeCloseTo(layout.alice.cy);
    // les nœuds libres ne se superposent pas entre eux
    expect(layout.server.cy).not.toBeCloseTo(layout.db.cy);
  });

  it('plusieurs align_with dans une même lane : pas de collision même si les cibles ont la même cy initiale', () => {
    // Config problématique : bob et alice sont seuls dans leur lane → cy=0.5 tous les deux.
    // Sans resolveCollisions, server, token_db et fcm se superposent tous à cy=0.5.
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
    // Aucune collision dans la lane 2
    expect(layout.server.cy).not.toBeCloseTo(layout.token_db.cy);
    expect(layout.server.cy).not.toBeCloseTo(layout.fcm.cy);
    expect(layout.token_db.cy).not.toBeCloseTo(layout.fcm.cy);
    // Les contraintes align_with sont toujours honorées
    expect(layout.token_db.cy).toBeCloseTo(layout.bob.cy);
    expect(layout.fcm.cy).toBeCloseTo(layout.alice.cy);
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
