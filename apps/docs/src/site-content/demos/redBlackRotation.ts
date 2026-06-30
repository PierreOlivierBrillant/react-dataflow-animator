import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// Red-black tree — the ROTATION case (vs. the pure recoloring of `redBlackTree`).
// Inserting a red node (3) under a red parent (5) whose uncle is BLACK (here
// absent) cannot be fixed by recoloring alone: it takes a rotation THEN a
// recoloring. This left-left case right-rotates the grandparent (10), then
// recolors. It combines both runtime spec features: `rotate_subtree` (tree
// restructuring) and `set_color` (recoloring). Numbers are language-invariant.
const RED = 'crimson';
const BLACK = '#1f2937';
const INK = 'white';

const N = (id: string, color: string) => ({
  id,
  type: 'circle' as const,
  body: id,
  background_color: color,
  text_color: INK,
});

const strings = {
  en: {
    insert: 'We insert 3 (red) under the red 5 — a red-red violation',
    blackUncle: 'Here the uncle is BLACK (absent) → rotation case, not recolor',
    rotate: 'Right-rotate around 10 (left-left case) so 5 rises to the top',
    recolor: 'Then recolor: 5 to black, 10 to red',
    done: 'Valid red-black tree: 5 is black with two red children ✓',
  },
  fr: {
    insert: 'On insère 3 (rouge) sous le 5 rouge — une violation rouge-rouge',
    blackUncle:
      "Ici l'oncle est NOIR (absent) → cas rotation, pas recoloration",
    rotate: 'Rotation droite autour de 10 (cas gauche-gauche) : 5 remonte',
    recolor: 'Puis on recolore : 5 en noir, 10 en rouge',
    done: 'Arbre rouge-noir valide : 5 est noir avec deux enfants rouges ✓',
  },
};

export const redBlackRotation = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  return {
    direction: 'tree',
    tree: {
      root: '20',
      children: {
        '20': { left: '10', right: '30' },
        '10': { left: '5' },
        '5': { left: '3' },
      },
    },
    nodes: [
      N('20', BLACK),
      N('10', BLACK),
      N('30', BLACK),
      N('5', RED),
      N('3', RED),
    ],
    packets: [],
    timeline: [
      { type: 'comment', object: '3', text: s.insert, duration: 1800 },
      { type: 'comment', object: '10', text: s.blackUncle, duration: 1900 },
      {
        type: 'parallel',
        actions: [
          { type: 'rotate_subtree', object: '10', rotation: 'right' },
          { type: 'comment', text: s.rotate, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          { type: 'set_color', object: '5', background_color: BLACK },
          { type: 'set_color', object: '10', background_color: RED },
          { type: 'comment', text: s.recolor, keep_until_next: true },
        ],
      },
      { type: 'comment', object: '5', text: s.done, keep_until_end: true },
      { type: 'wait', delay_ms: 1000 },
    ],
  };
};
