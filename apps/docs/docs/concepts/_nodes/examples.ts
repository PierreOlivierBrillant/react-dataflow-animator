import { DataFlowSpec, NodeType } from 'react-dataflow-animator';

/** Tous les types de nœuds, disposés en grille pour un aperçu visuel. */
const NODE_TYPES: NodeType[] = [
  'desktop',
  'laptop',
  'mobile',
  'client',
  'server',
  'cloud',
  'database',
  'user',
  'admin',
  'users',
];

export const nodeTypesExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: NODE_TYPES.map((type, i) => ({
    id: type,
    type,
    text: type,
    // 4 colonnes : les nœuds d'une même lane s'empilent sur l'axe transverse.
    lane: (i % 4) + 1,
  })),
  packets: [],
  timeline: [],
};

/** Badges `icon` : technos connues (react-icons) et texte libre. */
export const iconsExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'spa', type: 'laptop', text: 'react', icon: 'react', lane: 1 },
    { id: 'api', type: 'server', text: 'node', icon: 'node', lane: 2 },
    { id: 'pg', type: 'database', text: 'postgres', icon: 'postgres', lane: 3 },
    // Texte libre : tronqué à 4 caractères, affiché en pastille.
    { id: 'edge', type: 'cloud', text: 'texte libre', icon: 'v2', lane: 4 },
  ],
  packets: [],
  timeline: [],
};

/** Nœuds textuels : `simple_node` (corps seul) et `complex_node` (en-tête + corps,
 *  allure paquet HTTP). `language` colore toutes les zones de texte du nœud. */
export const textNodesExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    {
      id: 'snippet',
      type: 'simple_node',
      text: 'Extrait',
      icon: 'node', // un simple_node peut garder un subicon
      body: 'const total = a + b;',
      language: 'javascript',
      lane: 1,
    },
    {
      id: 'request',
      type: 'complex_node',
      text: 'Requête',
      header: 'GET /api/users HTTP/1.1',
      body: 'Host: api.example.com\nAccept: application/json',
      language: 'http', // appliqué à l'en-tête ET au corps
      lane: 2,
    },
  ],
  packets: [],
  timeline: [],
};

/** Visibilité initiale + révélation via l'action `set_visible`. */
export const revealExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'app', type: 'server', text: 'App', lane: 1 },
    {
      id: 'cache',
      type: 'database',
      text: 'Cache (ajouté)',
      icon: 'redis',
      lane: 2,
      visible: false,
    },
  ],
  packets: [],
  timeline: [
    {
      type: 'comment',
      text: 'Au départ, le cache n’existe pas encore.',
      duration: 1200,
    },
    { type: 'set_visible', object: 'cache', visible: true },
    {
      type: 'comment',
      object: 'cache',
      text: 'On ajoute un cache Redis.',
      keep_until_end: true,
    },
  ],
};
