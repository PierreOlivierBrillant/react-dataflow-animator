import type { DataFlowSpec } from 'react-dataflow-animator';

export const signalr: DataFlowSpec = {
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
      action_type: 'parallel',
      duration: 1000,
      actions: [
        {
          action_type: 'comment',
          object: 'hub',
          text: '2. Connexion établie',
        },
        {
          action_type: 'arrow',
          from: 'client',
          to: 'hub',
          style: 'dashed',
          keep_until_end: true,
        },
        {
          action_type: 'arrow',
          from: 'hub',
          to: 'client',
          style: 'dashed',
          keep_until_end: true,
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
