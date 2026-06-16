import type {
  Action,
  DataFlowSpec,
  Node,
  Packet,
} from 'react-dataflow-animator';

/**
 * Specs de démonstration pour la colonne « Exemples » de la Référence API.
 *
 * Clé = `${NomDéfinition}.${propriété}` (ex. `Node.icon`, `MoveAction.type`).
 * Chaque spec isole l'effet de la propriété concernée et est rendue par un VRAI
 * `<DataFlowPlayer>`. Convention de lecture (côté rendu) : une spec dont la
 * `timeline` n'est pas vide est jouée en boucle automatiquement (le comportement
 * doit être visible) ; sinon c'est un aperçu statique.
 *
 * Les démos d'actions (et tous leurs champs, sauf `id`) sont GÉNÉRÉES plus bas par
 * `buildActionDemos` : champ spécifique + 8 champs de timing de `ActionBase`. On
 * ne met pas d'exemple pour les `id` (valeur arbitraire) ni pour la racine `nodes`.
 */
const staticSpecs: Record<string, DataFlowSpec> = {
  // ── DataFlowSpec (racine) ───────────────────────────────────────────────
  'DataFlowSpec.direction': {
    direction: 'top-to-bottom',
    nodes: [
      { id: 'a', type: 'client', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
      { id: 'c', type: 'database', text: 'DB', lane: 3 },
    ],
    packets: [],
    timeline: [],
  },
  'DataFlowSpec.nodes': {
    nodes: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [],
    timeline: [],
  },
  'DataFlowSpec.connections': {
    nodes: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [],
    connections: [{ from: 'a', to: 'b', text: 'HTTP' }],
    timeline: [],
  },
  'DataFlowSpec.zones': {
    nodes: [
      { id: 'a', type: 'server', text: 'API', lane: 1 },
      { id: 'b', type: 'database', text: 'DB', lane: 2 },
    ],
    packets: [],
    zones: [{ contains: ['a', 'b'], label: 'Backend', color: 'steelblue' }],
    timeline: [],
  },
  'DataFlowSpec.packets': {
    nodes: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [
      { id: 'p', kind: 'http_packet', packet_content: { header: 'GET /' } },
    ],
    timeline: [{ type: 'move', object: 'p', from: 'a', to: 'b' }],
  },
  'DataFlowSpec.timeline': {
    nodes: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [],
    timeline: [{ type: 'arrow', from: 'a', to: 'b', text: 'appel' }],
  },

  // ── Node ────────────────────────────────────────────────────────────────
  'Node.text': {
    nodes: [{ id: 'n', type: 'server', text: 'Serveur web' }],
    packets: [],
    timeline: [],
  },
  'Node.visible': {
    nodes: [
      { id: 'app', type: 'server', text: 'App', lane: 1 },
      {
        id: 'cache',
        type: 'database',
        text: 'Cache',
        icon: 'redis',
        lane: 2,
        visible: false,
      },
    ],
    packets: [],
    timeline: [
      { type: 'set_visible', object: 'cache', visible: true, duration: 700 },
    ],
  },
  'Node.icon': {
    nodes: [{ id: 'n', type: 'server', text: 'API', icon: 'react' }],
    packets: [],
    timeline: [],
  },
  'Node.lane': {
    nodes: [
      { id: 'a', type: 'server', text: 'web 1', lane: 1 },
      { id: 'b', type: 'server', text: 'web 2', lane: 1 },
      { id: 'c', type: 'database', text: 'DB', lane: 2 },
    ],
    packets: [],
    timeline: [],
  },
  'Node.main': {
    direction: 'circular',
    nodes: [
      { id: 'hub', type: 'server', text: 'Hub', main: true },
      { id: 'a', type: 'client', text: 'A' },
      { id: 'b', type: 'client', text: 'B' },
      { id: 'c', type: 'client', text: 'C' },
    ],
    packets: [],
    timeline: [],
  },
  'Node.align_with': {
    nodes: [
      { id: 'a', type: 'client', text: 'A', lane: 1 },
      { id: 'b1', type: 'server', text: 'B1', lane: 2 },
      { id: 'b2', type: 'server', text: 'B2', lane: 2 },
      { id: 'c', type: 'database', text: 'C', lane: 3, align_with: 'b1' },
    ],
    packets: [],
    timeline: [],
  },
  'Node.url': {
    nodes: [
      {
        id: 'n',
        type: 'server',
        text: 'Status (lien)',
        url: 'https://status.example.com',
      },
    ],
    packets: [],
    timeline: [],
  },
  'Node.background_color': {
    nodes: [
      { id: 'n', type: 'square', body: 'API', background_color: '#3b82f6' },
    ],
    packets: [],
    timeline: [],
  },
  'Node.border_color': {
    nodes: [
      { id: 'n', type: 'square', body: 'API', border_color: 'steelblue' },
    ],
    packets: [],
    timeline: [],
  },
  'Node.text_color': {
    nodes: [
      { id: 'n', type: 'simple_node', body: 'Worker', text_color: 'tomato' },
    ],
    packets: [],
    timeline: [],
  },
  'Node.content': {
    nodes: [
      {
        id: 'n',
        type: 'laptop',
        text: 'IDE',
        content: {
          type: 'code',
          language: 'javascript',
          value: 'const x = 1;',
        },
      },
    ],
    packets: [],
    timeline: [],
  },
  'Node.body': {
    nodes: [{ id: 'n', type: 'simple_node', body: 'Worker' }],
    packets: [],
    timeline: [],
  },
  'Node.header': {
    nodes: [
      { id: 'n', type: 'complex_node', header: 'POST /login', body: '200 OK' },
    ],
    packets: [],
    timeline: [],
  },
  'Node.language': {
    nodes: [
      {
        id: 'n',
        type: 'complex_node',
        header: 'SELECT id',
        body: 'FROM users',
        language: 'sql',
      },
    ],
    packets: [],
    timeline: [],
  },

  // ── Connection ────────────────────────────────────────────────────────────
  'Connection.style': {
    nodes: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [],
    connections: [{ from: 'a', to: 'b', style: 'animated' }],
    timeline: [],
  },
  'Connection.arrow_head': {
    nodes: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [],
    connections: [{ from: 'a', to: 'b', arrow_head: 'both' }],
    timeline: [],
  },
  'Connection.text': {
    nodes: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [],
    connections: [{ from: 'a', to: 'b', text: 'HTTPS' }],
    timeline: [],
  },

  // ── Packet ──────────────────────────────────────────────────────────────
  'Packet.kind': {
    nodes: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [
      { id: 'p', kind: 'http_packet', packet_content: { header: 'GET /api' } },
    ],
    timeline: [{ type: 'move', object: 'p', from: 'a', to: 'b' }],
  },
  'Packet.request_content': {
    nodes: [
      { id: 'a', type: 'server', text: 'API', lane: 1 },
      { id: 'b', type: 'database', text: 'DB', lane: 2 },
    ],
    packets: [
      { id: 'p', kind: 'sql_request', request_content: 'SELECT * FROM users' },
    ],
    timeline: [{ type: 'move', object: 'p', from: 'a', to: 'b' }],
  },
  'Packet.response_content': {
    // Réponse en TEXTE court (le paquet en mouvement reste lisible). Le mode
    // tableau est démontré, lui, par ObjectContent.rows_data (nœud statique).
    nodes: [
      { id: 'a', type: 'database', text: 'DB', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [
      {
        id: 'p',
        kind: 'sql_response',
        response_content: {
          rows: 2,
          header: '200 OK',
          body: { type: 'text', value: 'Alice · Bob' },
        },
      },
    ],
    timeline: [{ type: 'move', object: 'p', from: 'a', to: 'b' }],
  },
  'Packet.packet_content': {
    nodes: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [
      {
        id: 'p',
        kind: 'http_packet',
        packet_content: {
          header: 'POST /login',
          body: { type: 'text', value: '{ "user": "ada" }' },
        },
      },
    ],
    timeline: [{ type: 'move', object: 'p', from: 'a', to: 'b' }],
  },

  // ── ObjectContent ─────────────────────────────────────────────────────────
  'ObjectContent.type': {
    nodes: [
      {
        id: 'n',
        type: 'laptop',
        text: 'Navigateur',
        content: {
          type: 'text',
          url: 'https://app.example.com',
          value: 'Bonjour 👋',
        },
      },
    ],
    packets: [],
    timeline: [],
  },
  'ObjectContent.value': {
    nodes: [
      {
        id: 'n',
        type: 'laptop',
        text: 'Terminal',
        content: {
          type: 'code',
          language: 'javascript',
          value: 'const add = (a, b) => a + b;',
        },
      },
    ],
    packets: [],
    timeline: [],
  },
  'ObjectContent.language': {
    nodes: [
      {
        id: 'n',
        type: 'laptop',
        text: 'Requête',
        content: {
          type: 'code',
          language: 'sql',
          value: 'SELECT * FROM users;',
        },
      },
    ],
    packets: [],
    timeline: [],
  },
  'ObjectContent.url': {
    nodes: [
      {
        id: 'n',
        type: 'laptop',
        text: 'Fenêtre',
        content: {
          type: 'text',
          url: 'https://app.example.com/login',
          value: 'Page de connexion',
        },
      },
    ],
    packets: [],
    timeline: [],
  },
  'ObjectContent.columns': {
    nodes: [
      {
        id: 'n',
        type: 'laptop',
        text: 'Résultat',
        content: {
          type: 'table',
          columns: ['id', 'email'],
          rows_data: [
            [1, 'ada@x.io'],
            [2, 'bob@x.io'],
          ],
        },
      },
    ],
    packets: [],
    timeline: [],
  },
  'ObjectContent.rows_data': {
    nodes: [
      {
        id: 'n',
        type: 'laptop',
        text: 'Résultat',
        content: {
          type: 'table',
          columns: ['id', 'email'],
          rows_data: [
            [1, 'ada@x.io'],
            [2, 'bob@x.io'],
          ],
        },
      },
    ],
    packets: [],
    timeline: [],
  },
};

// ── Actions : démos générées pour TOUS les champs (sauf `id`) ───────────────
// Chaque action a une « scène » + une action « cœur ». On génère un exemple par
// champ spécifique (type, object, from, to, text, content, actions…) PUIS pour
// les 8 champs de timing/cycle de vie de `ActionBase`. Les démos de timing
// reposent surtout sur leur légende, l'effet étant subtil.

/** Fusionne le cœur d'une action avec des surcharges (champs communs ou spécifiques). */
function withProps(core: Action, props: Record<string, unknown>): Action {
  // Les surcharges utilisées ici sont toutes des champs valides de l'action ou de
  // ActionBase ; le cast localise l'assouplissement nécessaire au merge générique.
  return { ...core, ...props } as Action;
}

interface ActionRecipe {
  defName: string;
  scene: Node[];
  packets?: Packet[];
  core: Action;
  /** Nœud support du commentaire de suivi (démos de cycle de vie). */
  refNode: string;
  /** Champs spécifiques (hors timing) : `type` + champs propres à l'action. */
  fields: { name: string; props?: Record<string, unknown>; note: string }[];
}

/** Démos des 8 champs de timing/cycle de vie de `ActionBase`, communs à toutes les actions. */
const TIMING_FIELDS: {
  name: string;
  note: string;
  timeline: (core: Action, ref: string) => Action[];
}[] = [
  {
    name: 'duration',
    note: '`duration` règle la vitesse de l’animation — ici ralentie à 2,5 s.',
    timeline: (core) => [withProps(core, { duration: 2500 })],
  },
  {
    name: 'delay_ms',
    note: '`delay_ms` retarde le démarrage — ici de 0,9 s.',
    timeline: (core) => [withProps(core, { delay_ms: 900 })],
  },
  {
    name: 'fade_in_ms',
    note: '`fade_in_ms` : apparition en fondu — ici 1,6 s.',
    timeline: (core) => [withProps(core, { fade_in_ms: 1600 })],
  },
  {
    name: 'fade_out_ms',
    note: '`fade_out_ms` : disparition en fondu — ici 1,6 s.',
    timeline: (core) => [
      withProps(core, { keep_until_next: false, fade_out_ms: 1600 }),
      { type: 'wait', duration: 1600 },
    ],
  },
  {
    name: 'wait_for',
    note: 'L’action suivante démarre à la fin de celle-ci (`wait_for`).',
    timeline: (core, ref) => [
      withProps(core, { id: 'x1' }),
      { type: 'comment', object: ref, text: 'ensuite', wait_for: 'x1' },
    ],
  },
  {
    name: 'keep_until',
    note: 'Reste visible jusqu’au démarrage de l’action ciblée (`keep_until`).',
    timeline: (core, ref) => [
      withProps(core, { keep_until: 'x2' }),
      {
        id: 'x2',
        type: 'comment',
        object: ref,
        text: 'étape 2',
        delay_ms: 1300,
      },
    ],
  },
  {
    name: 'keep_until_next',
    note: 'Reste visible jusqu’au début de l’étape suivante.',
    timeline: (core, ref) => [
      withProps(core, { keep_until_next: true }),
      { type: 'comment', object: ref, text: 'étape 2', delay_ms: 1300 },
    ],
  },
  {
    name: 'keep_until_end',
    note: 'Reste visible jusqu’à la fin de la chronologie.',
    timeline: (core, ref) => [
      withProps(core, { keep_until_end: true }),
      { type: 'comment', object: ref, text: 'étape 2', delay_ms: 1300 },
    ],
  },
];

const ACTION_RECIPES: ActionRecipe[] = [
  {
    defName: 'MoveAction',
    scene: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    packets: [
      { id: 'p', kind: 'http_packet', packet_content: { header: 'GET /' } },
    ],
    core: { type: 'move', object: 'p', from: 'a', to: 'b' },
    refNode: 'b',
    fields: [
      { name: 'type', note: 'Déplace le paquet de `a` vers `b`.' },
      {
        name: 'object',
        note: '`object` : le paquet (déclaré dans `packets`) déplacé.',
      },
      { name: 'from', note: '`from` : nœud de départ.' },
      { name: 'to', note: '`to` : nœud d’arrivée.' },
    ],
  },
  {
    defName: 'ArrowAction',
    scene: [
      { id: 'a', type: 'laptop', text: 'Client', lane: 1 },
      { id: 'b', type: 'server', text: 'API', lane: 2 },
    ],
    core: { type: 'arrow', from: 'a', to: 'b', text: 'requête' },
    refNode: 'b',
    fields: [
      { name: 'type', note: 'Trace une flèche `a → b`.' },
      { name: 'from', note: '`from` : nœud de départ.' },
      { name: 'to', note: '`to` : nœud d’arrivée.' },
      {
        name: 'text',
        props: { text: '200 OK' },
        note: '`text` : libellé affiché au milieu.',
      },
      {
        name: 'style',
        props: { style: 'dashed' },
        note: '`style: "dashed"` — ligne en tirets.',
      },
      {
        name: 'arrow_head',
        props: { arrow_head: 'both' },
        note: '`arrow_head: "both"` — pointe aux deux extrémités.',
      },
    ],
  },
  {
    defName: 'ParallelAction',
    scene: [
      { id: 'a', type: 'server', text: 'API', lane: 1 },
      { id: 'b', type: 'database', text: 'DB 1', lane: 2 },
      { id: 'c', type: 'database', text: 'DB 2', lane: 2 },
    ],
    core: {
      type: 'parallel',
      actions: [
        { type: 'arrow', from: 'a', to: 'b' },
        { type: 'arrow', from: 'a', to: 'c' },
      ],
    },
    refNode: 'a',
    fields: [
      { name: 'type', note: 'Plusieurs actions jouées au même instant.' },
      { name: 'actions', note: '`actions` : la liste jouée simultanément.' },
    ],
  },
  {
    defName: 'LoadingAction',
    scene: [{ id: 'a', type: 'server', text: 'API' }],
    core: { type: 'loading', object: 'a', duration: 1500 },
    refNode: 'a',
    fields: [
      { name: 'type', note: 'Spinner de chargement sur le nœud.' },
      { name: 'object', note: '`object` : le nœud qui affiche le spinner.' },
    ],
  },
  {
    defName: 'SetContentAction',
    scene: [{ id: 'a', type: 'laptop', text: 'IDE' }],
    core: {
      type: 'set_content',
      object: 'a',
      content: { type: 'code', language: 'javascript', value: 'const x = 1;' },
    },
    refNode: 'a',
    fields: [
      { name: 'type', note: 'Le contenu du nœud devient un terminal de code.' },
      { name: 'object', note: '`object` : le nœud dont le contenu change.' },
      { name: 'content', note: '`content` : le nouveau contenu affiché.' },
    ],
  },
  {
    defName: 'CommentAction',
    scene: [{ id: 'a', type: 'server', text: 'API' }],
    core: { type: 'comment', object: 'a', text: 'Le serveur valide le token' },
    refNode: 'a',
    fields: [
      { name: 'type', note: 'Bulle de commentaire près du nœud.' },
      {
        name: 'object',
        note: '`object` : nœud commenté (omis = haut du stage).',
      },
      { name: 'text', note: '`text` : le texte de la bulle.' },
    ],
  },
  {
    defName: 'HighlightAction',
    scene: [{ id: 'a', type: 'server', text: 'API' }],
    core: { type: 'highlight', object: 'a' },
    refNode: 'a',
    fields: [
      { name: 'type', note: 'Le nœud est mis en surbrillance.' },
      { name: 'object', note: '`object` : nœud (ou connexion) à surligner.' },
    ],
  },
];

const actionSpecs: Record<string, DataFlowSpec> = {};
const actionNotes: Record<string, string> = {};
for (const r of ACTION_RECIPES) {
  const base = (timeline: Action[]): DataFlowSpec => ({
    nodes: r.scene,
    packets: r.packets ?? [],
    timeline,
  });
  for (const f of r.fields) {
    actionSpecs[`${r.defName}.${f.name}`] = base([
      withProps(r.core, f.props ?? {}),
    ]);
    actionNotes[`${r.defName}.${f.name}`] = f.note;
  }
  for (const t of TIMING_FIELDS) {
    actionSpecs[`${r.defName}.${t.name}`] = base(t.timeline(r.core, r.refNode));
    actionNotes[`${r.defName}.${t.name}`] = t.note;
  }
}

export const apiExampleSpecs: Record<string, DataFlowSpec> = {
  ...staticSpecs,
  ...actionSpecs,
};

/**
 * Légende affichée sous une démo, expliquant la valeur démontrée ou le
 * comportement — utile surtout pour les champs dont l'effet n'est pas évident
 * (timing, cycle de vie, couleurs). Clé identique à `apiExampleSpecs`.
 */
const staticNotes: Record<string, string> = {
  'DataFlowSpec.direction': 'Ici `top-to-bottom` : le flux descend.',
  'DataFlowSpec.connections': 'Lien permanent (décor) affiché dès le départ.',
  'DataFlowSpec.zones': 'Une zone regroupe des nœuds en arrière-plan.',
  'DataFlowSpec.packets': 'Un paquet déclaré ici, déplacé par la timeline.',
  'DataFlowSpec.timeline': 'Une action `arrow` jouée comme étape.',

  'Node.visible': '`visible: false` au départ, révélé par `set_visible`.',
  'Node.icon': '`icon: "react"` — badge techno superposé.',
  'Node.lane': 'lane 1 (nœuds empilés) puis lane 2 (colonne suivante).',
  'Node.main': '`main: true` : nœud au centre (disposition circular).',
  'Node.align_with': '`c` aligné sur `b1`.',
  'Node.url': '`url` rend le nœud cliquable (ouvre un nouvel onglet).',
  'Node.background_color': '`background_color: "#3b82f6"`.',
  'Node.border_color': '`border_color: "steelblue"`.',
  'Node.text_color': '`text_color: "tomato"`.',
  'Node.content': 'Contenu initial du nœud (ici un terminal de code).',
  'Node.header': 'En-tête au-dessus du corps (allure paquet HTTP).',
  'Node.language': '`language: "sql"` colore le texte du nœud.',

  'Connection.style': '`style: "dashed"` — ligne en tirets.',
  'Connection.arrow_head': '`arrow_head: "both"` — pointe aux deux extrémités.',
  'Connection.text': 'Libellé affiché au milieu du lien.',

  'Packet.kind': '`http_packet` : paquet bleu avec en-tête.',
  'Packet.request_content': 'Requête SQL portée par un `sql_request`.',
  'Packet.response_content':
    'Réponse (ici texte court ; peut aussi être un tableau).',
  'Packet.packet_content': 'En-tête + corps d’un `http_packet`.',

  'ObjectContent.type': '`type: "text"` → fenêtre avec barre d’adresse.',
  'ObjectContent.value': 'Code source affiché dans un terminal.',
  'ObjectContent.language': '`language: "sql"` colore le code.',
  'ObjectContent.url': 'URL affichée dans la barre d’adresse.',
  'ObjectContent.columns': 'En-têtes de colonnes du tableau.',
  'ObjectContent.rows_data': 'Lignes de données du tableau.',
};

export const apiExampleNotes: Record<string, string> = {
  ...staticNotes,
  ...actionNotes,
};
