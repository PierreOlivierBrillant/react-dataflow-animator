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
  it('collecte les moves bidirectionnels comme deux entrées distinctes', () => {
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

  it('deux moves opposés reçoivent des offsets opposés', () => {
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
    // Opposés symétriques autour de 0
    expect(offsets[ab.key].start + offsets[ba.key].start).toBeCloseTo(0);
  });

  it("un move et une arrow sur le même trajet ne créent qu'une seule entrée", () => {
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      packets: [{ id: 'p', kind: 'http_packet' }],
      timeline: [
        { type: 'arrow', id: 'arr1', from: 'A', to: 'B' },
        { type: 'move', object: 'p', from: 'A', to: 'B' },
      ],
    };
    const result = collectArrowConnections(spec);
    // L'arrow couvre A→B ; le move ne doit pas ajouter d'entrée supplémentaire
    const abEntries = result.filter((c) => c.from === 'A' && c.to === 'B');
    expect(abEntries).toHaveLength(1);
    expect(abEntries[0].key).toBe('arr1');
  });

  it('un move et une arrow sur le même trajet partagent le même offset', () => {
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
    // Une seule connexion A→B → offset 0
    expect(offsets['arr1']).toEqual({ start: 0, end: 0 });
    // Le move utilise 'arr1' via le fallback from/to de Stage.tsx
    // (pas d'entrée séparée dans portOffsets pour le move)
    expect(offsets).not.toHaveProperty('A|B|move_1');
  });

  it('collecte les moves dans les blocs parallel', () => {
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
  it('déduplique les connexions par clé explicite', () => {
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      connections: [
        { id: 'same-key', from: 'A', to: 'B' },
        { id: 'same-key', from: 'A', to: 'C' }, // doublon de clé → ignoré
      ],
    };
    const result = collectArrowConnections(spec);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ key: 'same-key', from: 'A', to: 'B' });
  });

  it('parcourt récursivement les actions parallel', () => {
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
  it('1 seule connexion → offsets { start: 0, end: 0 }', () => {
    const connections = [{ key: 'k1', from: 'A', to: 'B' }];
    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.8, cy: 0.5 },
    };
    const result = computePortOffsets(connections, layout);
    expect(result['k1']).toEqual({ start: 0, end: 0 });
  });

  it('2 connexions A→B sur la même paire → offsets opposés et symétriques', () => {
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
    // Les offsets de départ et d'arrivée sont symétriques (même axe)
    expect(result['k1'].start).toBeCloseTo(result['k1'].end);
    expect(result['k2'].start).toBeCloseTo(result['k2'].end);
    // Les deux sont symétriques autour de 0
    expect(result['k1'].start + result['k2'].start).toBeCloseTo(0);
  });

  it('2 paires A→B et A→C du même côté RIGHT → fanOut différent pour chaque paire', () => {
    // A à gauche, B et C à droite (côté RIGHT de A) mais à des hauteurs différentes
    const connections = [
      { key: 'ab', from: 'A', to: 'B' },
      { key: 'ac', from: 'A', to: 'C' },
    ];
    const layout = {
      A: { cx: 0.2, cy: 0.5 },
      B: { cx: 0.8, cy: 0.3 }, // plus haut
      C: { cx: 0.8, cy: 0.7 }, // plus bas
    };
    const result = computePortOffsets(connections, layout);
    // Les deux paires partagent la face A|RIGHT → fan-out distinct
    expect(result['ab'].start).not.toBeCloseTo(result['ac'].start);
  });

  it('connexion vers un id absent du layout → ne plante pas (utilise 0.5/0.5)', () => {
    const connections = [{ key: 'k1', from: 'A', to: 'MISSING' }];
    const layout = { A: { cx: 0.2, cy: 0.5 } };
    expect(() => computePortOffsets(connections, layout)).not.toThrow();
    const result = computePortOffsets(connections, layout);
    expect(result['k1']).toEqual({ start: 0, end: 0 });
  });
});
