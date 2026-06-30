import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// Red-black tree insertion — the "recolor" case, which is exactly what the
// `set_color` action is for. We insert a red leaf under a red parent whose
// sibling (the uncle) is also red: the fix is a pure RECOLORING (no rotation),
// so this demo stays within the engine's current capabilities while showing the
// defining operation of a red-black tree. Tree shape is laid out with
// `top-to-bottom` (lane = depth) and `align_with` to drop a child under its
// parent. Key numbers in `body` are language-invariant; the narration comments
// carry the bilingual explanation.
const RED = 'crimson';
const BLACK = '#1f2937';
const INK = 'white';

const strings = {
  en: {
    insert: 'We insert key 1 as a red leaf, child of 8',
    redRed: 'Red-red violation: 1 and its parent 8 are both red',
    uncleRed: 'But the uncle 17 is red too → this is the recolor case',
    recolorChildren: 'Recolor the parent 8 and the uncle 17 to black',
    recolorGrand: 'Recolor the grandparent 13 to red — the issue moves up',
    rootBlack: '13 is the root, and the root must always stay black ✓',
  },
  fr: {
    insert: 'On insère la clé 1 comme feuille rouge, enfant de 8',
    redRed: 'Violation rouge-rouge : 1 et son parent 8 sont tous deux rouges',
    uncleRed: "Mais l'oncle 17 est rouge aussi → c'est le cas de recoloration",
    recolorChildren: "Recolorer le parent 8 et l'oncle 17 en noir",
    recolorGrand: 'Recolorer le grand-parent 13 en rouge — le problème remonte',
    rootBlack: '13 est la racine, et la racine doit toujours rester noire ✓',
  },
};

export const redBlackTree = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  return {
    direction: 'top-to-bottom',
    nodes: [
      // Grandparent (root): black.
      {
        id: 'g',
        type: 'circle',
        body: '13',
        background_color: BLACK,
        text_color: INK,
        lane: 1,
      },
      // Parent (red) and uncle (red), the two children of the root.
      {
        id: 'p',
        type: 'circle',
        body: '8',
        background_color: RED,
        text_color: INK,
        lane: 2,
      },
      {
        id: 'u',
        type: 'circle',
        body: '17',
        background_color: RED,
        text_color: INK,
        lane: 2,
      },
      // Newly inserted red leaf, dropped directly under its parent 8.
      {
        id: 'n',
        type: 'circle',
        body: '1',
        background_color: RED,
        text_color: INK,
        lane: 3,
        align_with: 'p',
      },
    ],
    // Tree edges (plain links, no arrow head).
    connections: [
      { from: 'g', to: 'p', arrow_head: 'none' },
      { from: 'g', to: 'u', arrow_head: 'none' },
      { from: 'p', to: 'n', arrow_head: 'none' },
    ],
    packets: [],
    timeline: [
      { type: 'comment', object: 'n', text: s.insert, duration: 1700 },
      { type: 'comment', object: 'n', text: s.redRed, duration: 1700 },
      { type: 'comment', object: 'u', text: s.uncleRed, duration: 1700 },
      {
        type: 'parallel',
        actions: [
          { type: 'set_color', object: 'p', background_color: BLACK },
          { type: 'set_color', object: 'u', background_color: BLACK },
          { type: 'comment', text: s.recolorChildren, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          { type: 'set_color', object: 'g', background_color: RED },
          {
            type: 'comment',
            object: 'g',
            text: s.recolorGrand,
            keep_until_next: true,
          },
        ],
      },
      {
        type: 'parallel',
        actions: [
          { type: 'set_color', object: 'g', background_color: BLACK },
          {
            type: 'comment',
            object: 'g',
            text: s.rootBlack,
            keep_until_end: true,
          },
        ],
      },
      { type: 'wait', delay_ms: 1000 },
    ],
  };
};
