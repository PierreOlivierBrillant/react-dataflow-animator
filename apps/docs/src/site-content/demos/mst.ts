import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// Kruskal's minimum spanning tree on a free `direction: 'graph'` layout. Edges
// are sorted by weight; each is added unless it would close a cycle, until all
// six nodes are joined by n-1 = 5 edges. Accepted edges turn green and their
// nodes turn teal (the growing forest); the four rejected edges (which would
// create a cycle) are greyed out. Purely edge-driven — no per-node value —
// so it needs no distance badge, unlike Dijkstra.
//
// Sorted edges: bc(1) bd(2) ab(3) ce(4) ef(5) | ac(6) cd(7) df(8) de(9).
// Tree = bc, bd, ab, ce, ef (total weight 15). Weights are language-invariant.
const TREE = '#16a34a'; // green — spanning-tree edge
const JOIN = '#0d9488'; // teal — node joined to the forest
const REJECT = '#9ca3af'; // grey — edge skipped (would form a cycle)
const INK = 'white';

const N = (id: string, x: number, y: number) => ({
  id,
  type: 'circle' as const,
  body: id,
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

/** Accept an edge into the tree: colour it and the node(s) it just connected. */
const accept = (
  edge: string,
  joined: string[],
  near: string,
  text: string
): DataFlowSpec['timeline'][number] => ({
  type: 'parallel',
  actions: [
    { type: 'set_color', object: edge, color: TREE },
    ...joined.map((id) => ({
      type: 'set_color' as const,
      object: id,
      background_color: JOIN,
      text_color: INK,
    })),
    { type: 'comment', object: near, text, keep_until_next: true },
  ],
});

const strings = {
  en: {
    intro:
      'Kruskal’s minimum spanning tree: link all nodes with the least total edge weight. Sort the edges by weight, then add each one unless it would close a cycle.',
    bc: 'Cheapest edge B–C (1): no cycle, add it.',
    bd: 'B–D (2): pulls D into the tree.',
    ab: 'A–B (3): pulls A in.',
    ce: 'C–E (4): pulls E in.',
    ef: 'E–F (5): pulls in F. All six nodes are connected by five edges — the tree is complete.',
    reject:
      'The remaining edges (6, 7, 8, 9) each join two nodes already connected → they would form a cycle. Skip them all.',
    done: 'Minimum spanning tree = B–C, B–D, A–B, C–E, E–F, total weight 1+2+3+4+5 = 15.',
  },
  fr: {
    intro:
      'Arbre couvrant minimal de Kruskal : relier tous les nœuds avec le poids total d’arêtes le plus faible. On trie les arêtes par poids, puis on ajoute chacune sauf si elle fermerait un cycle.',
    bc: 'Arête la moins chère B–C (1) : pas de cycle, on l’ajoute.',
    bd: 'B–D (2) : fait entrer D dans l’arbre.',
    ab: 'A–B (3) : fait entrer A.',
    ce: 'C–E (4) : fait entrer E.',
    ef: 'E–F (5) : fait entrer F. Les six nœuds sont reliés par cinq arêtes — l’arbre est complet.',
    reject:
      'Les arêtes restantes (6, 7, 8, 9) relient chacune deux nœuds déjà connectés → elles formeraient un cycle. On les écarte toutes.',
    done: 'Arbre couvrant minimal = B–C, B–D, A–B, C–E, E–F, poids total 1+2+3+4+5 = 15.',
  },
};

export const mst = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  const rejected = ['ac', 'cd', 'df', 'de'];
  return {
    direction: 'graph',
    nodes: [
      N('A', 0.08, 0.55),
      N('B', 0.3, 0.32),
      N('C', 0.56, 0.22),
      N('D', 0.34, 0.82),
      N('E', 0.74, 0.46),
      N('F', 0.92, 0.72),
    ],
    connections: [
      E('ab', 'A', 'B', 3),
      E('ac', 'A', 'C', 6),
      E('bc', 'B', 'C', 1),
      E('bd', 'B', 'D', 2),
      E('cd', 'C', 'D', 7),
      E('ce', 'C', 'E', 4),
      E('de', 'D', 'E', 9),
      E('df', 'D', 'F', 8),
      E('ef', 'E', 'F', 5),
    ],
    packets: [],
    timeline: [
      { type: 'comment', text: s.intro, duration: 3800 },
      accept('bc', ['B', 'C'], 'B', s.bc),
      accept('bd', ['D'], 'D', s.bd),
      accept('ab', ['A'], 'A', s.ab),
      accept('ce', ['E'], 'E', s.ce),
      accept('ef', ['F'], 'F', s.ef),
      {
        type: 'parallel',
        actions: [
          ...rejected.map((id) => ({
            type: 'set_color' as const,
            object: id,
            color: REJECT,
          })),
          { type: 'comment', text: s.reject, keep_until_next: true },
        ],
      },
      { type: 'comment', text: s.done, keep_until_end: true },
      { type: 'wait', duration: 1600 },
    ],
  };
};
