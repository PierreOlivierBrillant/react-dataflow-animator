import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../../i18n';

// Binary search tree — INSERTION. The new key starts as an ORPHAN (a traveling
// `subicon` packet, detached from the tree) and walks DOWN step by step: at each
// node we compare and descend, until we reach an empty child slot — where the
// node is then created. The destination node (`7`) is declared in the tree but
// `visible: false`, so its slot is reserved (no edge drawn) until `set_visible`
// reveals it. Key numbers are language-invariant; comments carry the narration.
const NODE = 'steelblue';
const NEW = 'seagreen';
const INK = 'white';

const strings = {
  en: {
    intro: 'Insert 7 — the new key is an orphan; we route it down to its slot',
    cmp8: '7 < 8 → walk into the LEFT subtree',
    cmp4: '7 > 4 → walk into the RIGHT subtree',
    cmp6: '7 > 6 → and the RIGHT child is empty: this is the spot',
    done: '7 is created as the right child of 6 ✓',
  },
  fr: {
    intro:
      'Insérer 7 — la nouvelle clé est orpheline ; on la guide jusqu’à son slot',
    cmp8: '7 < 8 → on descend dans le sous-arbre GAUCHE',
    cmp4: '7 > 4 → on descend dans le sous-arbre DROIT',
    cmp6: '7 > 6 → et l’enfant DROIT est vide : c’est la place',
    done: '7 est créé comme enfant droit de 6 ✓',
  },
};

const node = (id: string) => ({
  id,
  type: 'circle' as const,
  body: id,
  background_color: NODE,
  text_color: INK,
});

export const bstInsert = (locale: Locale): DataFlowSpec => {
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
    nodes: [
      ...['8', '4', '12', '2', '6', '10', '14'].map(node),
      // The node to insert: its slot is reserved (in the tree) but hidden until
      // the orphan key reaches it. Tinted green to read as "new".
      {
        id: '7',
        type: 'circle',
        body: '7',
        background_color: NEW,
        text_color: INK,
        visible: false,
      },
    ],
    packets: [{ id: 'k', kind: 'subicon', icon: '7' }],
    timeline: [
      { type: 'comment', object: '8', text: s.intro, duration: 1800 },
      {
        type: 'parallel',
        actions: [
          { type: 'move', object: 'k', from: '8', to: '4', duration: 750 },
          { type: 'comment', object: '8', text: s.cmp8, keep_until_next: true },
        ],
      },
      {
        type: 'parallel',
        actions: [
          { type: 'move', object: 'k', from: '4', to: '6', duration: 750 },
          { type: 'comment', object: '4', text: s.cmp4, keep_until_next: true },
        ],
      },
      { type: 'comment', object: '6', text: s.cmp6, duration: 1800 },
      {
        type: 'parallel',
        actions: [
          { type: 'set_visible', object: '7', visible: true, duration: 500 },
          { type: 'comment', object: '7', text: s.done, keep_until_end: true },
        ],
      },
      { type: 'wait', delay_ms: 1000 },
    ],
  };
};
