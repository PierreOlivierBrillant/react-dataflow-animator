import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// AVL tree — a single rotation rebalances a right-leaning chain. Inserting
// 10, 20, 30 in order yields a degenerate "right spine"; node 10 then has a
// balance factor of −2 (right-right case), fixed by ONE left rotation. This
// showcases `direction: 'tree'` + the `rotate_subtree` action, with the nodes
// gliding to their new depths while the edges re-route. Key numbers in `body`
// are language-invariant; the comments carry the bilingual narration.
const NODE = 'steelblue';
const INK = 'white';

const strings = {
  en: {
    chain: 'After inserting 10, 20, 30 the AVL tree is a right-leaning chain',
    unbalanced: 'Node 10 is unbalanced — balance factor −2 (right-right case)',
    rotate: 'A single LEFT rotation around 10 lifts 20 and rebalances the tree',
    done: 'Balanced again: every balance factor is back within [−1, +1] ✓',
  },
  fr: {
    chain: 'Après insertion de 10, 20, 30, l’arbre AVL est une chaîne à droite',
    unbalanced:
      'Le nœud 10 est déséquilibré — facteur d’équilibre −2 (cas droite-droite)',
    rotate:
      'Une seule rotation GAUCHE autour de 10 fait monter 20 et rééquilibre',
    done: 'De nouveau équilibré : chaque facteur d’équilibre est dans [−1, +1] ✓',
  },
};

export const avlTree = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  return {
    direction: 'tree',
    tree: {
      root: 'a',
      children: { a: { right: 'b' }, b: { right: 'c' } },
    },
    nodes: [
      {
        id: 'a',
        type: 'circle',
        body: '10',
        background_color: NODE,
        text_color: INK,
      },
      {
        id: 'b',
        type: 'circle',
        body: '20',
        background_color: NODE,
        text_color: INK,
      },
      {
        id: 'c',
        type: 'circle',
        body: '30',
        background_color: NODE,
        text_color: INK,
      },
    ],
    packets: [],
    timeline: [
      { type: 'comment', text: s.chain, duration: 1700 },
      { type: 'comment', object: 'a', text: s.unbalanced, duration: 1900 },
      {
        type: 'parallel',
        actions: [
          { type: 'rotate_subtree', object: 'a', rotation: 'left' },
          { type: 'comment', text: s.rotate, keep_until_next: true },
        ],
      },
      { type: 'comment', text: s.done, keep_until_end: true },
      { type: 'wait', delay_ms: 1000 },
    ],
  };
};
