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

  it('une arrow action A→B avec une connexion statique A→B ne crée pas de 2e entrée', () => {
    // Cas central du bug e4aa27b : static A→B + arrow A→B gonflaient la paire
    // à 2 entrées → les deux recevaient un offset ±15 au lieu de 0.
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

  it("deux arrows A→B sans connexion statique ne créent qu'une seule entrée", () => {
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

  it('un move en sens inverse ne décale pas la connexion statique existante', () => {
    // Régression e4aa27b : move B→A créait une 2e entrée dans la paire A-B,
    // ce qui décalait la connexion statique A→B de ±PORT_SPACING/2.
    const spec: DataFlowSpec = {
      ...BASE_SPEC,
      connections: [{ from: 'A', to: 'B' }],
      packets: [{ id: 'p', kind: 'http_packet' }],
      timeline: [{ type: 'move', object: 'p', from: 'B', to: 'A' }],
    };
    const connections = collectArrowConnections(spec);
    // La paire A-B ne doit contenir qu'une seule entrée (la connexion statique).
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
    // Une seule entrée → offset doit être 0 (connexion centrée).
    expect(offsets[abPair[0].key]).toEqual({ start: 0, end: 0 });
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

  it('aspect 3:1 — dx=0.3 dy=0.4 est horizontal en pixels, vertical en ratios', () => {
    // A→B : dx=0.3, dy=0.4 → |dy|>|dx| en ratios (vertical) mais |0.3×3|=0.9>0.4 en pixels (horizontal)
    // A→C : dx=0.3, dy=-0.2 → horizontal dans les deux cas (face A|RIGHT)
    // Avec aspect=3, A→B rejoint A→C sur la face A|RIGHT → fan-out → ac.start ≠ 0
    // Sans aspect (=1), A→B va sur A|BOTTOM → ac seul sur A|RIGHT → ac.start = 0
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
    const withAspect = computePortOffsets(connections, layout, 3);
    expect(withAspect['ac'].start).toBeCloseTo(-PORT_SPACING / 2);

    const withoutAspect = computePortOffsets(connections, layout);
    expect(withoutAspect['ac'].start).toBeCloseTo(0);
  });

  it('connexion vers un id absent du layout → ne plante pas (utilise 0.5/0.5)', () => {
    const connections = [{ key: 'k1', from: 'A', to: 'MISSING' }];
    const layout = { A: { cx: 0.2, cy: 0.5 } };
    expect(() => computePortOffsets(connections, layout)).not.toThrow();
    const result = computePortOffsets(connections, layout);
    expect(result['k1']).toEqual({ start: 0, end: 0 });
  });
});
