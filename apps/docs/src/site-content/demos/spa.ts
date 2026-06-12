import type { DataFlowSpec } from 'react-dataflow-animator';

export const spa: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    {
      id: 'browser',
      type: 'laptop',
      text: 'Navigateur',
      icon: 'chrome',
      lane: 1,
    },
    {
      id: 'web',
      type: 'server',
      text: 'Serveur web',
      icon: 'nginx',
      lane: 2,
    },
    {
      id: 'api',
      type: 'server',
      text: 'Web API',
      icon: 'dotnet',
      lane: 2,
    },
    {
      id: 'db',
      type: 'database',
      text: 'BD',
      icon: 'postgres',
      align_with: 'api',
      lane: 3,
    },
  ],
  packets: [
    {
      id: 'getindex',
      kind: 'http_packet',
      packet_content: { header: 'GET /' },
    },
    {
      id: 'bundle',
      kind: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: { content_type: 'text', content: 'index.html + app.js' },
      },
    },
    {
      id: 'apireq',
      kind: 'http_packet',
      packet_content: { header: 'GET /api/products' },
    },
    {
      id: 'sql',
      kind: 'sql_request',
      request_content: 'SELECT * FROM products',
    },
    { id: 'rows', kind: 'sql_response', response_content: { rows: 12 } },
    {
      id: 'apires',
      kind: 'http_packet',
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
  timeline: [
    {
      type: 'comment',
      object: 'browser',
      text: "1. Chargement de l'application",
      duration: 500,
    },
    {
      type: 'move',
      object: 'getindex',
      from: 'browser',
      to: 'web',
      duration: 700,
    },
    {
      type: 'move',
      object: 'bundle',
      from: 'web',
      to: 'browser',
      duration: 700,
    },
    {
      type: 'set_content',
      object: 'browser',
      content: {
        content_type: 'text',
        url: 'https://mon.app',
        content: "✅ SPA chargée (React) — prête à appeler l'API",
      },
      keep_until: 'render',
    },
    {
      type: 'comment',
      object: 'browser',
      text: '2. La SPA appelle le Web API',
      duration: 500,
    },
    {
      type: 'move',
      object: 'apireq',
      from: 'browser',
      to: 'api',
      duration: 800,
    },
    { type: 'loading', object: 'api', duration: 400 },
    {
      type: 'move',
      object: 'sql',
      from: 'api',
      to: 'db',
      duration: 600,
    },
    { type: 'loading', id: 'dbwork', object: 'db', duration: 600 },
    {
      type: 'move',
      object: 'rows',
      from: 'db',
      to: 'api',
      duration: 600,
      wait_for: 'dbwork',
    },
    {
      type: 'move',
      object: 'apires',
      from: 'api',
      to: 'browser',
      duration: 800,
    },
    {
      type: 'set_content',
      id: 'render',
      object: 'browser',
      content: {
        content_type: 'text',
        url: 'https://mon.app/produits',
        content: '📦 12 produits affichés',
      },
    },
    {
      type: 'comment',
      object: 'browser',
      text: '3. Rendu des données',
      duration: 400,
    },
  ],
};
