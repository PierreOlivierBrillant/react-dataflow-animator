import type { DataFlowSpec } from '../lib';

export interface Demo {
  id: string;
  title: string;
  description: string;
  spec: DataFlowSpec;
}

const httpRequest: DataFlowSpec = {
  is_navigable: true,
  direction: 'left-to-right',
  static_objects: [
    { id: 'browser', object_type: 'laptop', text: 'Navigateur', subicon: 'chrome', lane: 1 },
    { id: 'api', object_type: 'server', text: 'API Node', subicon: 'node', lane: 2 },
    { id: 'db', object_type: 'database', text: 'PostgreSQL', subicon: 'postgres', lane: 3 },
  ],
  dynamic_objects: [
    {
      id: 'req',
      object_type: 'http_packet',
      packet_content: { header: 'GET /users', body: { content_type: 'text', content: 'Accept: application/json' } },
    },
    { id: 'sql', object_type: 'sql_request', request_content: 'SELECT * FROM users' },
    { id: 'rows', object_type: 'sql_response', response_content: { rows: 42 } },
    {
      id: 'res',
      object_type: 'http_packet',
      packet_content: { header: '200 OK', body: { content_type: 'text', content: '[ {…}, {…} ]' } },
    },
  ],
  actions: [
    { action_type: 'comment', next_to: 'browser', text: "L'utilisateur ouvre la page", duration: 400 },
    { action_type: 'move', object: 'req', from: 'browser', to: 'api', duration: 900 },
    { action_type: 'move', object: 'sql', from: 'api', to: 'db', duration: 700 },
    { action_type: 'loading', id: 'dbwork', object: 'db', duration: 900 },
    { action_type: 'move', object: 'rows', from: 'db', to: 'api', duration: 700, wait_for: 'dbwork' },
    { action_type: 'loading', object: 'api', duration: 500 },
    { action_type: 'move', object: 'res', from: 'api', to: 'browser', duration: 900 },
    { action_type: 'comment', next_to: 'browser', text: 'Page affichée 🎉', duration: 400 },
  ],
};

const circular: DataFlowSpec = {
  is_navigable: true,
  direction: 'circular',
  static_objects: [
    { id: 'hub', object_type: 'server', text: 'Serveur', subicon: 'dotnet', is_main: true },
    { id: 'web', object_type: 'desktop', text: 'Web', subicon: 'react' },
    { id: 'mob', object_type: 'mobile', text: 'Mobile' },
    { id: 'admin', object_type: 'admin', text: 'Admin' },
    { id: 'iot', object_type: 'laptop', text: 'IoT' },
  ],
  dynamic_objects: [
    { id: 'p1', object_type: 'http_packet', packet_content: { header: 'POST /sync' } },
    { id: 'p2', object_type: 'http_packet', packet_content: { header: 'GET /feed' } },
    { id: 'p3', object_type: 'http_packet', packet_content: { header: 'GET /stats' } },
    { id: 'p4', object_type: 'http_packet', packet_content: { header: 'POST /telemetry' } },
  ],
  actions: [
    {
      action_type: 'parallel',
      actions: [
        { action_type: 'move', object: 'p1', from: 'web', to: 'hub', duration: 900 },
        { action_type: 'move', object: 'p2', from: 'mob', to: 'hub', duration: 900 },
      ],
    },
    {
      action_type: 'parallel',
      actions: [
        { action_type: 'move', object: 'p3', from: 'admin', to: 'hub', duration: 900 },
        { action_type: 'move', object: 'p4', from: 'iot', to: 'hub', duration: 900 },
      ],
    },
    { action_type: 'loading', object: 'hub', duration: 800 },
  ],
};

const collision: DataFlowSpec = {
  is_navigable: true,
  direction: 'left-to-right',
  static_objects: [
    { id: 'client', object_type: 'client', text: 'Client', subicon: 'react', lane: 1 },
    { id: 'server', object_type: 'server', text: 'Serveur', subicon: 'node', lane: 2 },
  ],
  dynamic_objects: [
    { id: 'up', object_type: 'http_packet', packet_content: { header: 'PUT /doc' } },
    { id: 'down', object_type: 'http_packet', packet_content: { header: '200 OK' } },
  ],
  actions: [
    {
      action_type: 'parallel',
      actions: [
        { action_type: 'arrow', from: 'client', to: 'server', text: 'requête', duration: 800 },
        { action_type: 'arrow', from: 'server', to: 'client', text: 'réponse', style: 'dashed', duration: 800 },
      ],
    },
    {
      action_type: 'parallel',
      actions: [
        { action_type: 'move', object: 'up', from: 'client', to: 'server', duration: 1000 },
        { action_type: 'move', object: 'down', from: 'server', to: 'client', duration: 1000 },
      ],
    },
  ],
};

const setContent: DataFlowSpec = {
  is_navigable: true,
  direction: 'left-to-right',
  static_objects: [
    { id: 'editor', object_type: 'laptop', text: 'IDE', subicon: 'typescript', lane: 1 },
    { id: 'server', object_type: 'server', text: 'Serveur', subicon: 'node', lane: 2 },
  ],
  dynamic_objects: [
    { id: 'deploy', object_type: 'http_packet', packet_content: { header: 'POST /deploy' } },
  ],
  actions: [
    {
      action_type: 'set_content',
      object: 'editor',
      content: {
        content_type: 'code',
        language: 'javascript',
        content: "export function add(a, b) {\n  return a + b;\n}",
      },
      keep_until_next: true,
    },
    { action_type: 'move', object: 'deploy', from: 'editor', to: 'server', duration: 900 },
    { action_type: 'loading', object: 'server', duration: 800 },
    {
      action_type: 'set_content',
      object: 'server',
      content: {
        content_type: 'text',
        content: 'Application déployée et accessible en ligne.',
      },
    },
    { action_type: 'comment', next_to: 'server', text: 'Build OK ✅', duration: 400 },
  ],
};

export const demos: Demo[] = [
  {
    id: 'http',
    title: 'Requête HTTP (client → API → BD)',
    description:
      'Parcours complet d’une requête : paquet HTTP, requête SQL, indicateurs de chargement, dépendance wait_for et commentaires.',
    spec: httpRequest,
  },
  {
    id: 'circular',
    title: 'Architecture circulaire',
    description:
      'Disposition circular : un nœud central is_main entouré de clients, avec des envois simultanés (parallel).',
    spec: circular,
  },
  {
    id: 'collision',
    title: 'Anti-collision bidirectionnelle',
    description:
      'Deux trajets opposés sur le même segment : le moteur calcule des voies parallèles (path shifting).',
    spec: collision,
  },
  {
    id: 'set-content',
    title: 'set_content : code & fenêtre',
    description:
      'Mutation de nœuds : terminal de code avec coloration syntaxique, puis fenêtre de navigateur.',
    spec: setContent,
  },
];
