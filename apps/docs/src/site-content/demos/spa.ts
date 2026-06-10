import type { DataFlowSpec } from 'react-dataflow-animator';

export const spa: DataFlowSpec = {
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
  connections: [
    { from: 'browser', to: 'web', style: 'dotted' },
    { from: 'browser', to: 'api', style: 'dotted' },
    { from: 'api', to: 'db', style: 'dotted' },
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
        url: 'https://mon.app',
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
        url: 'https://mon.app/produits',
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
