import type { DataFlowSpec } from '../lib';

export interface Demo {
  id: string;
  title: string;
  description: string;
  category: 'Bases' | 'Cas réels';
  spec: DataFlowSpec;
}

const httpRequest: DataFlowSpec = {
  direction: 'left-to-right',
  static_objects: [
    {
      id: 'browser',
      object_type: 'laptop',
      text: 'Navigateur',
      subicon: 'chrome',
      lane: 1,
    },
    {
      id: 'api',
      object_type: 'server',
      text: 'API Node',
      subicon: 'node',
      lane: 2,
    },
    {
      id: 'db',
      object_type: 'database',
      text: 'PostgreSQL',
      subicon: 'postgres',
      lane: 3,
    },
  ],
  dynamic_objects: [
    {
      id: 'req',
      object_type: 'http_packet',
      packet_content: {
        header: 'GET /users',
        body: { content_type: 'text', content: 'Accept: application/json' },
      },
    },
    {
      id: 'sql',
      object_type: 'sql_request',
      request_content: 'SELECT * FROM users',
    },
    { id: 'rows', object_type: 'sql_response', response_content: { rows: 42 } },
    {
      id: 'res',
      object_type: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: { content_type: 'text', content: '[ {…}, {…} ]' },
      },
    },
  ],
  actions: [
    {
      action_type: 'comment',
      object: 'browser',
      text: "L'utilisateur ouvre la page",
      duration: 400,
    },
    {
      action_type: 'move',
      object: 'req',
      from: 'browser',
      to: 'api',
      duration: 900,
    },
    {
      action_type: 'move',
      object: 'sql',
      from: 'api',
      to: 'db',
      duration: 700,
    },
    { action_type: 'loading', id: 'dbwork', object: 'db', duration: 900 },
    {
      action_type: 'move',
      object: 'rows',
      from: 'db',
      to: 'api',
      duration: 700,
      wait_for: 'dbwork',
    },
    { action_type: 'loading', object: 'api', duration: 500 },
    {
      action_type: 'move',
      object: 'res',
      from: 'api',
      to: 'browser',
      duration: 900,
    },
    {
      action_type: 'comment',
      object: 'browser',
      text: 'Page affichée 🎉',
      duration: 400,
    },
  ],
};

const circular: DataFlowSpec = {
  direction: 'circular',
  static_objects: [
    {
      id: 'hub',
      object_type: 'server',
      text: 'Serveur',
      subicon: 'dotnet',
      is_main: true,
    },
    { id: 'web', object_type: 'desktop', text: 'Web', subicon: 'react' },
    { id: 'mob', object_type: 'mobile', text: 'Mobile' },
    { id: 'admin', object_type: 'admin', text: 'Admin' },
    { id: 'iot', object_type: 'laptop', text: 'IoT', subicon: 'mqtt' },
  ],
  dynamic_objects: [
    {
      id: 'p1',
      object_type: 'http_packet',
      packet_content: { header: 'POST /sync' },
    },
    {
      id: 'p2',
      object_type: 'http_packet',
      packet_content: { header: 'GET /feed' },
    },
    {
      id: 'p3',
      object_type: 'http_packet',
      packet_content: { header: 'GET /stats' },
    },
    {
      id: 'p4',
      object_type: 'http_packet',
      packet_content: { header: 'POST /telemetry' },
    },
  ],
  actions: [
    {
      action_type: 'parallel',
      actions: [
        {
          action_type: 'move',
          object: 'p1',
          from: 'web',
          to: 'hub',
          duration: 900,
        },
        {
          action_type: 'move',
          object: 'p2',
          from: 'mob',
          to: 'hub',
          duration: 900,
        },
      ],
    },
    {
      action_type: 'parallel',
      actions: [
        {
          action_type: 'move',
          object: 'p3',
          from: 'admin',
          to: 'hub',
          duration: 900,
        },
        {
          action_type: 'move',
          object: 'p4',
          from: 'iot',
          to: 'hub',
          duration: 900,
        },
      ],
    },
    { action_type: 'loading', object: 'hub', duration: 800 },
  ],
};

const collision: DataFlowSpec = {
  direction: 'left-to-right',
  static_objects: [
    {
      id: 'client',
      object_type: 'client',
      text: 'Client',
      subicon: 'react',
      lane: 1,
    },
    {
      id: 'server',
      object_type: 'server',
      text: 'Serveur',
      subicon: 'node',
      lane: 2,
    },
  ],
  dynamic_objects: [
    {
      id: 'up',
      object_type: 'http_packet',
      packet_content: { header: 'PUT /doc' },
    },
    {
      id: 'down',
      object_type: 'http_packet',
      packet_content: { header: '200 OK' },
    },
  ],
  actions: [
    {
      action_type: 'parallel',
      actions: [
        {
          action_type: 'arrow',
          from: 'client',
          to: 'server',
          text: 'requête',
          duration: 800,
        },
        {
          action_type: 'arrow',
          from: 'server',
          to: 'client',
          text: 'réponse',
          style: 'dashed',
          duration: 800,
        },
      ],
    },
    {
      action_type: 'parallel',
      actions: [
        {
          action_type: 'move',
          object: 'up',
          from: 'client',
          to: 'server',
          duration: 1000,
        },
        {
          action_type: 'move',
          object: 'down',
          from: 'server',
          to: 'client',
          duration: 1000,
        },
      ],
    },
  ],
};

const setContent: DataFlowSpec = {
  direction: 'left-to-right',
  static_objects: [
    {
      id: 'editor',
      object_type: 'laptop',
      text: 'IDE',
      subicon: 'typescript',
      lane: 1,
    },
    {
      id: 'server',
      object_type: 'server',
      text: 'Serveur',
      subicon: 'node',
      lane: 2,
    },
  ],
  dynamic_objects: [
    {
      id: 'deploy',
      object_type: 'http_packet',
      packet_content: { header: 'POST /deploy' },
    },
  ],
  actions: [
    {
      action_type: 'set_content',
      object: 'editor',
      content: {
        content_type: 'code',
        language: 'javascript',
        content: 'export function add(a, b) {\n  return a + b;\n}',
      },
    },
    {
      action_type: 'move',
      object: 'deploy',
      from: 'editor',
      to: 'server',
      duration: 900,
    },
    { action_type: 'loading', object: 'server', duration: 800 },
    {
      action_type: 'set_content',
      object: 'server',
      content: {
        content_type: 'text',
        content: 'Application déployée et accessible en ligne.',
      },
    },
    {
      action_type: 'comment',
      object: 'server',
      text: 'Build OK ✅',
      duration: 400,
    },
  ],
};

// ---------------------------------------------------------------------------
// Cas réels
// ---------------------------------------------------------------------------

const signalr: DataFlowSpec = {
  direction: 'left-to-right',
  static_objects: [
    {
      id: 'client',
      object_type: 'laptop',
      text: 'Navigateur',
      subicon: 'typescript',
      lane: 1,
    },
    {
      id: 'hub',
      object_type: 'server',
      text: 'SignalR Hub',
      subicon: 'csharp',
      lane: 2,
    },
  ],
  dynamic_objects: [
    {
      id: 'handshake',
      object_type: 'http_packet',
      packet_content: { header: 'WebSocket ⇄' },
    },
    {
      id: 'send',
      object_type: 'http_packet',
      packet_content: { header: 'SendMessage("Salut")' },
    },
    {
      id: 'recv',
      object_type: 'http_packet',
      packet_content: { header: 'ReceiveMessage' },
    },
  ],
  actions: [
    {
      action_type: 'comment',
      object: 'client',
      text: '1. Le client ouvre une connexion temps réel',
      duration: 1500,
    },
    {
      action_type: 'set_content',
      id: 'clientCode',
      object: 'client',
      content: {
        content_type: 'code',
        language: 'typescript',
        content:
          'const conn = new HubConnectionBuilder()\n  .withUrl("/chatHub").build();\nconn.on("ReceiveMessage", render);\nawait conn.start();',
      },
      keep_until: 'end',
    },
    {
      action_type: 'move',
      object: 'handshake',
      from: 'client',
      to: 'hub',
      duration: 800,
    },
    {
      action_type: 'comment',
      object: 'hub',
      text: '2. Connexion établie',
      duration: 1500,
    },
    {
      action_type: 'parallel',
      duration: 1000,
      actions: [
        {
          action_type: 'arrow',
          from: 'client',
          to: 'hub',
          style: 'dashed',
        },
        {
          action_type: 'arrow',
          from: 'hub',
          to: 'client',
          style: 'dashed',
        },
      ],
    },
    {
      action_type: 'set_content',
      id: 'hubCode',
      object: 'hub',
      content: {
        content_type: 'code',
        language: 'csharp',
        content:
          'public async Task SendMessage(string m) =>\n  await Clients.All\n    .SendAsync("ReceiveMessage", m);',
      },
      keep_until: 'end',
    },
    {
      action_type: 'comment',
      object: 'client',
      text: '3. Le client envoie un message',
      duration: 500,
    },
    {
      action_type: 'move',
      object: 'send',
      from: 'client',
      to: 'hub',
      duration: 800,
    },
    {
      action_type: 'comment',
      object: 'hub',
      text: '4. Le hub diffuse à tous (full duplex)',
      duration: 500,
    },
    {
      action_type: 'move',
      id: 'end',
      object: 'recv',
      from: 'hub',
      to: 'client',
      duration: 800,
    },
  ],
};

const microservices: DataFlowSpec = {
  direction: 'left-to-right',
  static_objects: [
    {
      id: 'client',
      object_type: 'laptop',
      text: 'Client',
      subicon: 'react',
      lane: 1,
    },
    {
      id: 'nginx',
      object_type: 'server',
      text: 'Nginx',
      subicon: 'nginx',
      lane: 2,
    },
    {
      id: 'auth',
      object_type: 'server',
      text: 'Auth',
      subicon: 'dotnet',
      lane: 3,
    },
    {
      id: 'data',
      object_type: 'server',
      text: 'Données',
      subicon: 'node',
      lane: 3,
    },
    {
      id: 'authdb',
      object_type: 'database',
      text: 'Auth DB',
      subicon: 'postgres',
      lane: 4,
    },
    {
      id: 'datadb',
      object_type: 'database',
      text: 'Data DB',
      subicon: 'mongodb',
      lane: 4,
    },
  ],
  connections: [
    { from: 'client', to: 'nginx', style: 'dotted' },
    { from: 'nginx', to: 'auth', style: 'dotted' },
    { from: 'nginx', to: 'data', style: 'dotted' },
    { from: 'auth', to: 'authdb', style: 'dotted' },
    { from: 'data', to: 'datadb', style: 'dotted' },
  ],
  dynamic_objects: [
    {
      id: 'login',
      object_type: 'http_packet',
      packet_content: { header: 'POST /login' },
    },
    {
      id: 'authq',
      object_type: 'sql_request',
      request_content: 'SELECT * FROM users WHERE email=…',
    },
    { id: 'authr', object_type: 'sql_response', response_content: { rows: 1 } },
    {
      id: 'token',
      object_type: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: { content_type: 'text', content: 'JWT' },
      },
    },
    {
      id: 'get',
      object_type: 'http_packet',
      packet_content: {
        header: 'GET /orders',
        body: { content_type: 'text', content: 'Bearer JWT' },
      },
    },
    {
      id: 'dataq',
      object_type: 'sql_request',
      request_content: 'db.orders.find()',
    },
    {
      id: 'datar',
      object_type: 'sql_response',
      response_content: { rows: 12 },
    },
    {
      id: 'json',
      object_type: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: { content_type: 'text', content: '[ orders ]' },
      },
    },
  ],
  actions: [
    {
      action_type: 'comment',
      object: 'client',
      text: '1. Authentification',
      duration: 500,
    },
    {
      action_type: 'move',
      object: 'login',
      from: 'client',
      to: 'nginx',
      duration: 600,
    },
    {
      action_type: 'move',
      object: 'login',
      from: 'nginx',
      to: 'auth',
      duration: 600,
    },
    { action_type: 'loading', object: 'auth', duration: 500 },
    {
      action_type: 'move',
      object: 'authq',
      from: 'auth',
      to: 'authdb',
      duration: 600,
    },
    {
      action_type: 'loading',
      id: 'authdbwork',
      object: 'authdb',
      duration: 600,
    },
    {
      action_type: 'move',
      object: 'authr',
      from: 'authdb',
      to: 'auth',
      duration: 600,
      wait_for: 'authdbwork',
    },
    {
      action_type: 'move',
      object: 'token',
      from: 'auth',
      to: 'nginx',
      duration: 600,
    },
    {
      action_type: 'move',
      object: 'token',
      from: 'nginx',
      to: 'client',
      duration: 600,
    },
    {
      action_type: 'comment',
      object: 'client',
      text: '2. Requête de données (avec le JWT)',
      duration: 500,
    },
    {
      action_type: 'move',
      object: 'get',
      from: 'client',
      to: 'nginx',
      duration: 600,
    },
    {
      action_type: 'move',
      object: 'get',
      from: 'nginx',
      to: 'data',
      duration: 600,
    },
    { action_type: 'loading', object: 'data', duration: 500 },
    {
      action_type: 'move',
      object: 'dataq',
      from: 'data',
      to: 'datadb',
      duration: 600,
    },
    {
      action_type: 'loading',
      id: 'datadbwork',
      object: 'datadb',
      duration: 600,
    },
    {
      action_type: 'move',
      object: 'datar',
      from: 'datadb',
      to: 'data',
      duration: 600,
      wait_for: 'datadbwork',
    },
    {
      action_type: 'move',
      object: 'json',
      from: 'data',
      to: 'nginx',
      duration: 600,
    },
    {
      action_type: 'move',
      object: 'json',
      from: 'nginx',
      to: 'client',
      duration: 600,
    },
    {
      action_type: 'comment',
      object: 'client',
      text: 'Données affichées ✅',
      duration: 400,
    },
  ],
};

const spa: DataFlowSpec = {
  direction: 'left-to-right',
  static_objects: [
    {
      id: 'browser',
      object_type: 'laptop',
      text: 'Navigateur',
      subicon: 'chrome',
      lane: 1,
    },
    {
      id: 'web',
      object_type: 'server',
      text: 'Serveur web',
      subicon: 'nginx',
      lane: 2,
    },
    {
      id: 'api',
      object_type: 'server',
      text: 'Web API',
      subicon: 'dotnet',
      lane: 2,
    },
    {
      id: 'db',
      object_type: 'database',
      text: 'BD',
      subicon: 'postgres',
      align_with: 'api',
      lane: 3,
    },
  ],
  dynamic_objects: [
    {
      id: 'getindex',
      object_type: 'http_packet',
      packet_content: { header: 'GET /' },
    },
    {
      id: 'bundle',
      object_type: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: { content_type: 'text', content: 'index.html + app.js' },
      },
    },
    {
      id: 'apireq',
      object_type: 'http_packet',
      packet_content: { header: 'GET /api/products' },
    },
    {
      id: 'sql',
      object_type: 'sql_request',
      request_content: 'SELECT * FROM products',
    },
    { id: 'rows', object_type: 'sql_response', response_content: { rows: 12 } },
    {
      id: 'apires',
      object_type: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: { content_type: 'text', content: '[ 12 produits ]' },
      },
    },
  ],
  actions: [
    {
      action_type: 'comment',
      object: 'browser',
      text: "1. Chargement de l'application",
      duration: 500,
    },
    {
      action_type: 'move',
      object: 'getindex',
      from: 'browser',
      to: 'web',
      duration: 700,
    },
    {
      action_type: 'move',
      object: 'bundle',
      from: 'web',
      to: 'browser',
      duration: 700,
    },
    {
      action_type: 'set_content',
      object: 'browser',
      content: {
        content_type: 'text',
        url: 'https://mon-app.app',
        content: "✅ SPA chargée (React) — prête à appeler l'API",
      },
      keep_until: 'render',
    },
    {
      action_type: 'comment',
      object: 'browser',
      text: '2. La SPA appelle le Web API',
      duration: 500,
    },
    {
      action_type: 'move',
      object: 'apireq',
      from: 'browser',
      to: 'api',
      duration: 800,
    },
    { action_type: 'loading', object: 'api', duration: 400 },
    {
      action_type: 'move',
      object: 'sql',
      from: 'api',
      to: 'db',
      duration: 600,
    },
    { action_type: 'loading', id: 'dbwork', object: 'db', duration: 600 },
    {
      action_type: 'move',
      object: 'rows',
      from: 'db',
      to: 'api',
      duration: 600,
      wait_for: 'dbwork',
    },
    {
      action_type: 'move',
      object: 'apires',
      from: 'api',
      to: 'browser',
      duration: 800,
    },
    {
      action_type: 'set_content',
      id: 'render',
      object: 'browser',
      content: {
        content_type: 'text',
        url: 'https://mon-app.app/produits',
        content: '📦 12 produits affichés',
      },
    },
    {
      action_type: 'comment',
      object: 'browser',
      text: '3. Rendu des données',
      duration: 400,
    },
  ],
};

const highlightAlign: DataFlowSpec = {
  direction: 'left-to-right',
  static_objects: [
    // `align_with` aligne Client et BD sur l'axe de l'API (lane 2, en haut),
    // alors que Worker reste sur sa propre ligne.
    {
      id: 'client',
      object_type: 'laptop',
      text: 'Client',
      subicon: 'react',
      lane: 1,
      align_with: 'api',
    },
    { id: 'api', object_type: 'server', text: 'API', subicon: 'node', lane: 2 },
    {
      id: 'worker',
      object_type: 'server',
      text: 'Worker',
      subicon: 'dotnet',
      lane: 2,
    },
    {
      id: 'db',
      object_type: 'database',
      text: 'BD',
      subicon: 'postgres',
      lane: 3,
      align_with: 'api',
    },
  ],
  connections: [
    { id: 'link', from: 'client', to: 'api', style: 'dotted' },
    { from: 'api', to: 'db', style: 'dotted' },
  ],
  dynamic_objects: [
    {
      id: 'req',
      object_type: 'http_packet',
      packet_content: { header: 'GET /tasks' },
    },
  ],
  actions: [
    {
      action_type: 'comment',
      object: 'api',
      text: 'On met l’API en évidence',
      duration: 400,
    },
    { action_type: 'highlight', object: 'api', duration: 1200 },
    {
      action_type: 'move',
      object: 'req',
      from: 'client',
      to: 'api',
      duration: 800,
    },
    { action_type: 'highlight', object: 'link', duration: 1000 },
  ],
};

export const demos: Demo[] = [
  {
    id: 'http',
    title: 'Requête HTTP (client → API → BD)',
    category: 'Bases',
    description:
      'Parcours complet d’une requête : paquet HTTP, requête SQL, chargement, dépendance wait_for et commentaires.',
    spec: httpRequest,
  },
  {
    id: 'circular',
    title: 'Architecture circulaire',
    category: 'Bases',
    description:
      'Disposition circular : un nœud central is_main entouré de clients, envois simultanés (parallel).',
    spec: circular,
  },
  {
    id: 'collision',
    title: 'Anti-collision bidirectionnelle',
    category: 'Bases',
    description:
      'Deux trajets opposés sur le même segment : voies parallèles automatiques (path shifting).',
    spec: collision,
  },
  {
    id: 'set-content',
    title: 'set_content : code & fenêtre',
    category: 'Bases',
    description:
      'Mutation de nœuds : terminal de code colorisé puis fenêtre de navigateur.',
    spec: setContent,
  },
  {
    id: 'highlight-align',
    title: 'Surlignage & alignement',
    category: 'Bases',
    description:
      'Action highlight (nœud et connexion) et option align_with pour aligner des nœuds de lanes différentes.',
    spec: highlightAlign,
  },
  {
    id: 'signalr',
    title: 'Temps réel full-duplex (SignalR)',
    category: 'Cas réels',
    description:
      'Connexion WebSocket persistante : on voit le code client et le code du hub, et qui fait quoi à chaque étape.',
    spec: signalr,
  },
  {
    id: 'microservices',
    title: 'Microservices derrière un proxy Nginx',
    category: 'Cas réels',
    description:
      'Auth et Données derrière Nginx, chacun avec sa base : authentification (JWT) puis requête de données.',
    spec: microservices,
  },
  {
    id: 'spa',
    title: 'Chargement d’une SPA puis appels API',
    category: 'Cas réels',
    description:
      'Le navigateur charge le bundle depuis le serveur web, puis la SPA interroge le Web API et sa base.',
    spec: spa,
  },
];

export const demosById = Object.fromEntries(demos.map((d) => [d.id, d]));
