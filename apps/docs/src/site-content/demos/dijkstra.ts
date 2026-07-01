import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// Dijkstra's shortest path on a free `direction: 'graph'` layout — the case the
// x/y coordinates exist for. Every node carries its current tentative distance
// as a corner icon badge (∞ at first, updated with `set_icon` as edges relax):
// that badge is the whole point — without it you cannot remember each node's
// value. Nodes are coloured amber when first reached (frontier) and teal once
// settled; the final shortest path lights up green.
//
// Trace from A: A=0 → C=2 → B=3 (via C) → D=8 (via B) → E=10 (via D) → F=13
// (via E). Shortest path A→C→B→D→E→F = 13 (edges ac, bc, bd, de, ef). Node keys
// (A…F), distances and edge weights are language-invariant.
const SETTLED = '#0d9488'; // teal — settled (final) node
const FRONTIER = '#b45309'; // amber — reached but not settled yet
const PATH = '#16a34a'; // green — final shortest path
const INK = 'white';

/** Circle node showing its key (body) and its distance badge (icon, starts ∞). */
const N = (id: string, x: number, y: number) => ({
  id,
  type: 'circle' as const,
  body: id,
  icon: '∞',
  x,
  y,
});

const E = (id: string, from: string, to: string, w: number) => ({
  id,
  from,
  to,
  text: String(w),
  path: 'straight' as const,
  arrow_head: 'none' as const,
});

// Recolour / rebadge helpers (each is one action inside a parallel step).
const settled = (id: string): DataFlowSpec['timeline'][number] => ({
  type: 'set_color',
  object: id,
  background_color: SETTLED,
  text_color: INK,
});
const frontier = (id: string): DataFlowSpec['timeline'][number] => ({
  type: 'set_color',
  object: id,
  background_color: FRONTIER,
  text_color: INK,
});
const dist = (id: string, v: string): DataFlowSpec['timeline'][number] => ({
  type: 'set_icon',
  object: id,
  icon: v,
});

const strings = {
  en: {
    intro:
      'Dijkstra keeps a tentative distance on every node — the badge, ∞ at first. It repeatedly settles the nearest unsettled node and relaxes its edges, lowering neighbours’ badges.',
    a: 'A is the source: distance 0, settle it. Relax A→B (4) and A→C (2): B and C get their first badges.',
    c: 'C = 2 is the nearest → settle it. Via C: B improves 4→3, and D = 10, E = 12 appear.',
    b: 'B = 3 is next. Relax B→D: 3 + 5 = 8 beats 10, so D drops to 8.',
    d: 'D = 8. Via D: E improves 12→10, and the target F appears at 14.',
    e: 'E = 10. Relax E→F: 10 + 3 = 13 beats 14, so F drops to 13.',
    f: 'F = 13 is settled — the shortest distance to the target is final.',
    done: 'Shortest path A→C→B→D→E→F = 13. Each badge is that node’s final shortest distance from A.',
  },
  fr: {
    intro:
      'Dijkstra garde une distance provisoire sur chaque nœud — le badge, ∞ au départ. Il règle tour à tour le nœud non réglé le plus proche et relâche ses arêtes, abaissant les badges des voisins.',
    a: 'A est la source : distance 0, on le règle. On relâche A→B (4) et A→C (2) : B et C reçoivent leurs premiers badges.',
    c: 'C = 2 est le plus proche → on le règle. Via C : B s’améliore 4→3, et D = 10, E = 12 apparaissent.',
    b: 'B = 3 ensuite. On relâche B→D : 3 + 5 = 8 bat 10, donc D tombe à 8.',
    d: 'D = 8. Via D : E s’améliore 12→10, et la cible F apparaît à 14.',
    e: 'E = 10. On relâche E→F : 10 + 3 = 13 bat 14, donc F tombe à 13.',
    f: 'F = 13 est réglé — la distance la plus courte vers la cible est définitive.',
    done: 'Plus court chemin A→C→B→D→E→F = 13. Chaque badge est la distance finale la plus courte du nœud depuis A.',
  },
};

export const dijkstra = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  const pathNodes = ['A', 'C', 'B', 'D', 'E', 'F'];
  const pathEdges = ['ac', 'bc', 'bd', 'de', 'ef'];
  return {
    direction: 'graph',
    nodes: [
      N('A', 0.1, 0.5),
      N('B', 0.35, 0.18),
      N('C', 0.35, 0.82),
      N('D', 0.62, 0.35),
      N('E', 0.62, 0.78),
      N('F', 0.9, 0.5),
    ],
    connections: [
      E('ab', 'A', 'B', 4),
      E('ac', 'A', 'C', 2),
      E('bc', 'B', 'C', 1),
      E('bd', 'B', 'D', 5),
      E('cd', 'C', 'D', 8),
      E('ce', 'C', 'E', 10),
      E('de', 'D', 'E', 2),
      E('df', 'D', 'F', 6),
      E('ef', 'E', 'F', 3),
    ],
    packets: [],
    timeline: [
      { type: 'comment', text: s.intro, duration: 4000 },
      {
        type: 'parallel',
        actions: [
          dist('A', '0'),
          settled('A'),
          dist('B', '4'),
          frontier('B'),
          dist('C', '2'),
          frontier('C'),
          { type: 'comment', object: 'A', text: s.a, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          settled('C'),
          dist('B', '3'),
          dist('D', '10'),
          frontier('D'),
          dist('E', '12'),
          frontier('E'),
          { type: 'comment', object: 'C', text: s.c, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          settled('B'),
          dist('D', '8'),
          { type: 'comment', object: 'B', text: s.b, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          settled('D'),
          dist('E', '10'),
          dist('F', '14'),
          frontier('F'),
          { type: 'comment', object: 'D', text: s.d, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          settled('E'),
          dist('F', '13'),
          { type: 'comment', object: 'E', text: s.e, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          settled('F'),
          { type: 'comment', object: 'F', text: s.f, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          ...pathNodes.map((id) => ({
            type: 'set_color' as const,
            object: id,
            background_color: PATH,
            text_color: INK,
          })),
          ...pathEdges.map((id) => ({
            type: 'set_color' as const,
            object: id,
            color: PATH,
          })),
          { type: 'comment', text: s.done, keep_until_end: true },
        ],
      },
      { type: 'wait', duration: 1600 },
    ],
  };
};
