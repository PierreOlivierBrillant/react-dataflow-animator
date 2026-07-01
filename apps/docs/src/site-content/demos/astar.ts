import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// A* on a uniform grid (direction:'graph', nodes placed by x/y). A* is Dijkstra
// plus a heuristic h(n) — here the Manhattan distance still to go — and expands
// the node with the smallest f = g + h. With every edge costing 1, the nodes on
// the straight line to the goal keep f = 3 while any sideways node jumps to
// f = 5, so A* walks straight to G and never expands the off-route cells. That
// contrast (a few nodes vs Dijkstra's full flood) is the whole point of A*.
//
// Start S = r1c0 (left middle), Goal G = r1c3 (right middle); shortest path is
// the straight row r1c0→r1c1→r1c2→r1c3. Grid coordinates are language-invariant.
const CLOSED = '#0d9488'; // teal — expanded (closed) node
const PATH = '#16a34a'; // green — final path
const INK = 'white';

const COLS = 4;
const ROWS = 3;
const START = 'r1c0';
const GOAL = 'r1c3';
const nid = (r: number, c: number) => `r${r}c${c}`;

/** Grid nodes and 4-connected unit edges, built once (language-invariant). */
function buildGrid(): {
  nodes: DataFlowSpec['nodes'];
  connections: NonNullable<DataFlowSpec['connections']>;
} {
  const nodes: DataFlowSpec['nodes'] = [];
  const connections: NonNullable<DataFlowSpec['connections']> = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const id = nid(r, c);
      nodes.push({
        id,
        type: 'circle',
        body: id === START ? 'S' : id === GOAL ? 'G' : '',
        x: 0.14 + (c * 0.72) / (COLS - 1),
        y: 0.22 + (r * 0.56) / (ROWS - 1),
      });
      if (c + 1 < COLS)
        connections.push({
          id: `h${r}${c}`,
          from: id,
          to: nid(r, c + 1),
          text: '1',
          path: 'straight',
          arrow_head: 'none',
        });
      if (r + 1 < ROWS)
        connections.push({
          id: `v${r}${c}`,
          from: id,
          to: nid(r + 1, c),
          text: '1',
          path: 'straight',
          arrow_head: 'none',
        });
    }
  }
  return { nodes, connections };
}

/** Expand one node on the straight line, colouring it and the edge walked in. */
const expand = (
  node: string,
  text: string,
  edge?: string
): DataFlowSpec['timeline'][number] => ({
  type: 'parallel',
  actions: [
    {
      type: 'set_color',
      object: node,
      background_color: CLOSED,
      text_color: INK,
    },
    ...(edge
      ? [{ type: 'set_color' as const, object: edge, color: CLOSED }]
      : []),
    { type: 'comment', object: node, text, keep_until_next: true },
  ],
});

const strings = {
  en: {
    intro:
      'A* = Dijkstra + a heuristic h(n): an estimate of the distance still to go (here the Manhattan distance to G). It always expands the node with the smallest f = g + h, so the search heads straight for the goal.',
    start:
      'Start at S, g = 0. Every edge costs 1, so g just counts steps. The goal G is 3 steps to the right.',
    e1: 'Neighbours: straight ahead f = 1 + 2 = 3; sideways f = 1 + 4 = 5. A* takes the smallest → go straight.',
    e2: 'Still f = 3 straight ahead (g = 2, h = 1) versus 5 sideways. Keep heading for G.',
    e3: 'One more: g = 3, h = 0, f = 3. We reach G.',
    done: 'A* expanded only the 4 nodes on the direct line — Dijkstra would have flooded all 12. The heuristic paid off.',
  },
  fr: {
    intro:
      'A* = Dijkstra + une heuristique h(n) : une estimation de la distance restante (ici la distance de Manhattan jusqu’à G). Il développe toujours le nœud au plus petit f = g + h, si bien que la recherche file droit vers le but.',
    start:
      'Départ en S, g = 0. Chaque arête coûte 1, donc g compte les pas. Le but G est à 3 pas vers la droite.',
    e1: 'Voisins : tout droit f = 1 + 2 = 3 ; sur les côtés f = 1 + 4 = 5. A* prend le plus petit → tout droit.',
    e2: 'Toujours f = 3 tout droit (g = 2, h = 1) contre 5 sur les côtés. On continue vers G.',
    e3: 'Encore un : g = 3, h = 0, f = 3. On atteint G.',
    done: 'A* n’a développé que les 4 nœuds de la ligne directe — Dijkstra aurait inondé les 12. L’heuristique a payé.',
  },
};

export const astar = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  const { nodes, connections } = buildGrid();
  const pathNodes = ['r1c0', 'r1c1', 'r1c2', 'r1c3'];
  const pathEdges = ['h10', 'h11', 'h12'];
  return {
    direction: 'graph',
    nodes,
    connections,
    packets: [],
    timeline: [
      { type: 'comment', text: s.intro, duration: 4200 },
      expand('r1c0', s.start),
      expand('r1c1', s.e1, 'h10'),
      expand('r1c2', s.e2, 'h11'),
      expand('r1c3', s.e3, 'h12'),
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
