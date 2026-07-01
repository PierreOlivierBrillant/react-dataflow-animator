import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// Dijkstra's shortest path on a free `direction: 'graph'` layout — the case
// the x/y coordinates exist for. Nodes are placed by hand (a real node-link
// diagram, not a flow/ring/tree); undirected weighted edges carry their cost
// in `text`. The algorithm expands the nearest unsettled node in turn; each
// `settle` recolours the node AND the edge it was reached through, so the
// shortest-path tree grows visibly. At the end the whole A→F path lights up.
//
// Settle order from A: A(0) → C(2) → B(3, via C) → D(8, via B) → E(10, via D)
// → F(13, via E). Shortest path A→C→B→D→E→F = 13 (edges ac, bc, bd, de, ef).
// Node keys (A…F) and edge weights are language-invariant.
const SETTLED = '#0d9488'; // teal — settled node / tree edge
const PATH = '#16a34a'; // green — final shortest path
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

/** One Dijkstra step: settle `node`, colouring it and the edge it was reached
 *  through (omitted for the source). The comment holds the distance reasoning. */
const settle = (
  node: string,
  text: string,
  edge?: string
): DataFlowSpec['timeline'][number] => ({
  type: 'parallel',
  actions: [
    {
      type: 'set_color',
      object: node,
      background_color: SETTLED,
      text_color: INK,
    },
    ...(edge
      ? [{ type: 'set_color' as const, object: edge, color: SETTLED }]
      : []),
    { type: 'comment', object: node, text, keep_until_next: true },
  ],
});

const strings = {
  en: {
    intro:
      'Dijkstra: find the cheapest route from A to F. Each edge shows its cost. The rule is simple — always settle the nearest node not yet settled.',
    settleA:
      'Start at A, distance 0. A is settled: the shortest route to itself is trivial.',
    settleC: 'The nearest unsettled node is C at cost 2 (A→C). Settle C.',
    settleB:
      'Through C, B costs 2 + 1 = 3 — cheaper than the direct A→B (4). Settle B at 3.',
    settleD: 'From B, D costs 3 + 5 = 8. It is now the nearest. Settle D at 8.',
    settleE: 'From D, E costs 8 + 2 = 10. Settle E at 10.',
    settleF: 'From E, the target F costs 10 + 3 = 13. Settle F — done.',
    done: 'Shortest path A→C→B→D→E→F = 13. Note it is not the straightest line, but the cheapest.',
  },
  fr: {
    intro:
      'Dijkstra : trouver la route la moins chère de A à F. Chaque arête affiche son coût. La règle est simple — on règle toujours le nœud le plus proche pas encore réglé.',
    settleA:
      'Départ en A, distance 0. A est réglé : le plus court chemin vers lui-même est trivial.',
    settleC:
      'Le nœud non réglé le plus proche est C, coût 2 (A→C). On règle C.',
    settleB:
      'En passant par C, B coûte 2 + 1 = 3 — moins cher que le direct A→B (4). On règle B à 3.',
    settleD:
      'Depuis B, D coûte 3 + 5 = 8. C’est désormais le plus proche. On règle D à 8.',
    settleE: 'Depuis D, E coûte 8 + 2 = 10. On règle E à 10.',
    settleF: 'Depuis E, la cible F coûte 10 + 3 = 13. On règle F — terminé.',
    done: 'Plus court chemin A→C→B→D→E→F = 13. Remarquez qu’il n’est pas le plus droit, mais le moins cher.',
  },
};

export const dijkstra = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  // Path nodes/edges recoloured green at the end.
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
      { type: 'comment', text: s.intro, duration: 3600 },
      settle('A', s.settleA),
      settle('C', s.settleC, 'ac'),
      settle('B', s.settleB, 'bc'),
      settle('D', s.settleD, 'bd'),
      settle('E', s.settleE, 'de'),
      settle('F', s.settleF, 'ef'),
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
