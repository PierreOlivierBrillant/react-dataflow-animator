import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// Red-black tree — the RECOLORING case, the defining operation that `set_color`
// exists for. Inserting a red node (5) under a red parent (10) whose sibling —
// the uncle (30) — is ALSO red is fixed by a pure recoloring (no rotation):
// parent and uncle go black, the grandparent (20) goes red, and since it is the
// root it stays black. Laid out with `direction: 'tree'`. Key numbers in `body`
// are language-invariant; the comments carry the bilingual narration.
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
    insert: 'We insert 5 (red) under the red 10 — a red-red violation',
    uncleRed:
      'The uncle 30 is red too → this is the RECOLOR case (no rotation)',
    recolorChildren: 'Recolor the parent 10 and the uncle 30 to black',
    recolorGrand: 'Push the red up to the grandparent 20…',
    rootBlack: '…but 20 is the root, and the root must always stay black ✓',
  },
  fr: {
    insert: 'On insère 5 (rouge) sous le 10 rouge — une violation rouge-rouge',
    uncleRed:
      "L'oncle 30 est rouge aussi → c'est le cas RECOLORATION (sans rotation)",
    recolorChildren: 'Recolorer le parent 10 et l’oncle 30 en noir',
    recolorGrand: 'On remonte le rouge vers le grand-parent 20…',
    rootBlack:
      '…mais 20 est la racine, et la racine doit toujours rester noire ✓',
  },
};

export const redBlackTree = (locale: Locale): DataFlowSpec => {
  const s = strings[locale];
  return {
    direction: 'tree',
    tree: {
      root: '20',
      children: {
        '20': { left: '10', right: '30' },
        '10': { left: '5', right: '15' },
        '30': { right: '40' },
      },
    },
    nodes: [
      N('20', BLACK),
      N('10', RED),
      N('30', RED),
      N('5', RED),
      N('15', BLACK),
      N('40', BLACK),
    ],
    packets: [],
    timeline: [
      { type: 'comment', object: '5', text: s.insert, duration: 1800 },
      { type: 'comment', object: '30', text: s.uncleRed, duration: 1900 },
      {
        type: 'parallel',
        actions: [
          { type: 'set_color', object: '10', background_color: BLACK },
          { type: 'set_color', object: '30', background_color: BLACK },
          { type: 'comment', text: s.recolorChildren, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          { type: 'set_color', object: '20', background_color: RED },
          {
            type: 'comment',
            object: '20',
            text: s.recolorGrand,
            keep_until_next: true,
          },
        ],
      },
      {
        type: 'parallel',
        actions: [
          { type: 'set_color', object: '20', background_color: BLACK },
          {
            type: 'comment',
            object: '20',
            text: s.rootBlack,
            keep_until_end: true,
          },
        ],
      },
      { type: 'wait', delay_ms: 1000 },
    ],
  };
};
