import type { DataFlowSpec } from 'react-dataflow-animator';

export const clientServer: DataFlowSpec = {
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
        header: 'GET /users\nAccept: application/json',
      },
    },
    {
      id: 'sql',
      object_type: 'sql_request',
      request_content: 'SELECT * FROM users',
    },
    {
      id: 'rows',
      object_type: 'sql_response',
      response_content: {
        header: '2 Lignes',
        body: {
          content_type: 'table',
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
