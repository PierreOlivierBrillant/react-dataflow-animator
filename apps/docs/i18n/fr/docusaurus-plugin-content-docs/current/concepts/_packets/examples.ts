import { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Un aller-retour complet montrant les trois `kind` de paquets :
 * http_packet (avec corps), sql_request, sql_response (tableau).
 */
export const packetsExample: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    {
      id: 'browser',
      type: 'laptop',
      text: 'Navigateur',
      icon: 'chrome',
      lane: 1,
    },
    { id: 'api', type: 'server', text: 'API', icon: 'node', lane: 2 },
    { id: 'db', type: 'database', text: 'DB', icon: 'postgres', lane: 3 },
  ],
  packets: [
    {
      id: 'req',
      kind: 'http_packet',
      packet_content: {
        header: 'GET /users',
        body: { type: 'text', value: 'Accept: application/json' },
      },
    },
    {
      id: 'sql',
      kind: 'sql_request',
      request_content: 'SELECT id, nom FROM users',
    },
    {
      id: 'rows',
      kind: 'sql_response',
      response_content: {
        header: '2 lignes',
        body: {
          type: 'table',
          columns: ['id', 'nom'],
          rows_data: [
            [1, 'Alice'],
            [2, 'Bob'],
          ],
        },
      },
    },
    {
      id: 'res',
      kind: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: {
          type: 'text',
          value: '[{ id: 1 }, { id: 2 }]',
          language: 'json',
        },
      },
    },
  ],
  timeline: [
    { type: 'move', object: 'req', from: 'browser', to: 'api', duration: 700 },
    {
      id: 'q',
      type: 'move',
      object: 'sql',
      from: 'api',
      to: 'db',
      duration: 700,
    },
    { type: 'loading', id: 'work', object: 'db', duration: 600, wait_for: 'q' },
    {
      type: 'move',
      object: 'rows',
      from: 'db',
      to: 'api',
      duration: 700,
      wait_for: 'work',
    },
    { type: 'move', object: 'res', from: 'api', to: 'browser', duration: 700 },
  ],
};
