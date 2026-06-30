import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// Binary search tree — SEARCH. A query key (a traveling `subicon` packet) walks
// down the tree from the root: at each node we compare and descend left or
// right, until the key is found. Showcases `direction: 'tree'` with a packet
// moving between tree nodes. We look up 7 in an 8-node BST: 7 < 8 → left,
// 7 > 4 → right, 7 > 6 → right, found. Key numbers (in `body` / the token icon)
// are language-invariant; the comments carry the bilingual narration.
const NODE = 'steelblue';
const FOUND = 'seagreen';
const INK = 'white';

const strings = {
  en: {
    goal: 'Searching for 7 — we start at the root and compare at each node',
    cmp8: '7 < 8 → go to the LEFT subtree',
    cmp4: '7 > 4 → go to the RIGHT subtree',
    cmp6: '7 > 6 → go to the RIGHT child',
    found: '7 = 7 → found! Three comparisons, O(log n) ✓',
  },
  fr: {
    goal: 'Recherche de 7 — on part de la racine et on compare à chaque nœud',
    cmp8: '7 < 8 → on descend dans le sous-arbre GAUCHE',
    cmp4: '7 > 4 → on descend dans le sous-arbre DROIT',
    cmp6: '7 > 6 → on descend vers l’enfant DROIT',
    found: '7 = 7 → trouvé ! Trois comparaisons, O(log n) ✓',
  },
};

const node = (id: string) => ({
  id,
  type: 'circle' as const,
  body: id,
  background_color: NODE,
  text_color: INK,
});

export const bstSearch = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  return {
    direction: 'tree',
    tree: {
      root: '8',
      children: {
        '8': { left: '4', right: '12' },
        '4': { left: '2', right: '6' },
        '6': { right: '7' },
        '12': { left: '10', right: '14' },
      },
    },
    nodes: ['8', '4', '12', '2', '6', '10', '14', '7'].map(node),
    packets: [{ id: 'q', kind: 'subicon', icon: '7' }],
    timeline: [
      { type: 'comment', object: '8', text: s.goal, duration: 1700 },
      {
        type: 'parallel',
        actions: [
          { type: 'move', object: 'q', from: '8', to: '4', duration: 700 },
          { type: 'comment', object: '8', text: s.cmp8, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          { type: 'move', object: 'q', from: '4', to: '6', duration: 700 },
          { type: 'comment', object: '4', text: s.cmp4, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          { type: 'move', object: 'q', from: '6', to: '7', duration: 700 },
          { type: 'comment', object: '6', text: s.cmp6, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          { type: 'set_color', object: '7', background_color: FOUND },
          { type: 'highlight', object: '7', duration: 900 },
          { type: 'comment', object: '7', text: s.found, keep_until_end: true },
        ],
      },
      { type: 'wait', delay_ms: 1000 },
    ],
  };
};
