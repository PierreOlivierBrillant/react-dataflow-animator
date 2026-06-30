import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// AVL tree — a single rotation rebalances a taller-on-the-left tree. After
// inserting 10, node 50 has a balance factor of +2 (its left subtree is two
// levels deeper than its right): the left-left case, fixed by ONE right
// rotation around 50, which lifts 30 to the top. Showcases `direction: 'tree'`
// + `rotate_subtree`, the nodes gliding to their new depths while the edges
// re-route. Key numbers (in `body`) are language-invariant.
const NODE = 'steelblue';
const INK = 'white';

const N = (id: string) => ({
  id,
  type: 'circle' as const,
  body: id,
  background_color: NODE,
  text_color: INK,
});

const strings = {
  en: {
    inserted:
      'After inserting 10, the left side of the tree grew one level too deep',
    unbalanced: 'Node 50 is unbalanced — balance factor +2 (left-left case)',
    rotate:
      'A single RIGHT rotation around 50 lifts 30 and rebalances the tree',
    done: 'Balanced again: every balance factor is back within [−1, +1] ✓',
  },
  fr: {
    inserted: 'Après insertion de 10, le côté gauche a gagné un niveau de trop',
    unbalanced:
      'Le nœud 50 est déséquilibré — facteur d’équilibre +2 (cas gauche-gauche)',
    rotate:
      'Une seule rotation DROITE autour de 50 fait monter 30 et rééquilibre',
    done: 'De nouveau équilibré : chaque facteur d’équilibre est dans [−1, +1] ✓',
  },
};

export const avlTree = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  return {
    direction: 'tree',
    tree: {
      root: '50',
      children: {
        '50': { left: '30', right: '70' },
        '30': { left: '20', right: '40' },
        '20': { left: '10' },
      },
    },
    nodes: [N('50'), N('30'), N('70'), N('20'), N('40'), N('10')],
    packets: [],
    timeline: [
      { type: 'comment', text: s.inserted, duration: 1800 },
      { type: 'comment', object: '50', text: s.unbalanced, duration: 1900 },
      {
        type: 'parallel',
        actions: [
          { type: 'rotate_subtree', object: '50', rotation: 'right' },
          { type: 'comment', text: s.rotate, keep_until_next: true },
        ],
      },
      { type: 'comment', object: '30', text: s.done, keep_until_end: true },
      { type: 'wait', delay_ms: 1000 },
    ],
  };
};
