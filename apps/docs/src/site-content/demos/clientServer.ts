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
      text: 'Serveur Web',
      subicon: 'dotnet',
      lane: 2,
    },
    {
      id: 'db',
      object_type: 'database',
      text: 'Base de données',
      subicon: 'mssql',
      lane: 3,
    },
  ],
  connections: [
    { from: 'browser', to: 'api', arrowHead: 'both', style: 'dashed' },
    { from: 'api', to: 'db', arrowHead: 'both', style: 'dashed' },
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
        body: {
          content_type: 'text',
          content: '<div>\n  <h2>Alice</h2>\n  <h2>Bob</h2>\n</div>',
          language: 'html',
        },
      },
    },
  ],
  actions: [
    {
      action_type: 'comment',
      object: 'browser',
      text: "L'utilisateur ouvre la page, la requête HTTP est envoyée au serveur",
      duration: 1500,
    },
    {
      action_type: 'parallel',
      actions: [
        {
          action_type: 'move',
          object: 'req',
          from: 'browser',
          to: 'api',
          duration: 900,
        },
        {
          action_type: 'loading',
          object: 'browser',
          keep_until: 'display_html',
        },
      ],
    },
    {
      action_type: 'move',
      object: 'sql',
      from: 'api',
      to: 'db',
      duration: 700,
    },
    {
      action_type: 'move',
      object: 'rows',
      from: 'db',
      to: 'api',
      duration: 700,
      wait_for: 'dbwork',
    },
    {
      action_type: 'move',
      object: 'res',
      from: 'api',
      to: 'browser',
    },
    {
      action_type: 'parallel',
      actions: [
        {
          id: 'display_html',
          action_type: 'set_content',
          object: 'browser',
          content: {
            url: 'exemple.com/users',
            content_type: 'text',
            content: 'Alice\nBob',
          },
        },
        {
          action_type: 'comment',
          object: 'browser',
          text: 'Page affichée 🎉',
        },
      ],
    },
  ],
};
