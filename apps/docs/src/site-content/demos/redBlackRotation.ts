import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// Red-black tree — the ROTATION case (as opposed to the pure recoloring case
// shown in the `redBlackTree` demo). Inserting a red node under a red parent
// whose uncle is BLACK (here absent) cannot be fixed by recoloring alone: it
// takes a rotation THEN a recoloring. This demo combines both runtime spec
// features — `rotate_subtree` (tree restructuring) and `set_color` (recoloring).
// Key numbers in `body` are language-invariant; comments carry the narration.
const RED = 'crimson';
const BLACK = '#1f2937';
const INK = 'white';

const strings = {
  en: {
    insert: 'We insert 5 (red) under the red 8 — a red-red violation again',
    blackUncle:
      'But here the uncle is BLACK (absent) → recoloring is not enough',
    rotate:
      'Right-rotate around 13 so the middle key 8 becomes the subtree root',
    recolor: 'Then recolor: 8 to black, 13 to red',
    done: 'Valid red-black tree: 8 is black with two red children ✓',
  },
  fr: {
    insert:
      'On insère 5 (rouge) sous le 8 rouge — encore une violation rouge-rouge',
    blackUncle:
      "Mais ici l'oncle est NOIR (absent) → la recoloration ne suffit pas",
    rotate:
      'Rotation droite autour de 13 : la clé médiane 8 devient la racine du sous-arbre',
    recolor: 'Puis on recolore : 8 en noir, 13 en rouge',
    done: 'Arbre rouge-noir valide : 8 est noir avec deux enfants rouges ✓',
  },
};

export const redBlackRotation = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  return {
    direction: 'tree',
    tree: {
      root: 'g',
      children: { g: { left: 'p' }, p: { left: 'z' } },
    },
    nodes: [
      {
        id: 'g',
        type: 'circle',
        body: '13',
        background_color: BLACK,
        text_color: INK,
      },
      {
        id: 'p',
        type: 'circle',
        body: '8',
        background_color: RED,
        text_color: INK,
      },
      {
        id: 'z',
        type: 'circle',
        body: '5',
        background_color: RED,
        text_color: INK,
      },
    ],
    packets: [],
    timeline: [
      { type: 'comment', object: 'z', text: s.insert, duration: 1800 },
      { type: 'comment', object: 'g', text: s.blackUncle, duration: 1900 },
      {
        type: 'parallel',
        actions: [
          { type: 'rotate_subtree', object: 'g', rotation: 'right' },
          { type: 'comment', text: s.rotate, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          { type: 'set_color', object: 'p', background_color: BLACK },
          { type: 'set_color', object: 'g', background_color: RED },
          { type: 'comment', text: s.recolor, keep_until_next: true },
        ],
      },
      { type: 'comment', text: s.done, keep_until_end: true },
      { type: 'wait', delay_ms: 1000 },
    ],
  };
};
