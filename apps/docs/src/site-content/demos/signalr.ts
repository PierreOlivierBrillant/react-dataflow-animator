import type { DataFlowSpec } from 'react-dataflow-animator';

export const signalr: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    {
      id: 'client',
      type: 'laptop',
      text: 'Navigateur',
      icon: 'typescript',
      lane: 1,
    },
    {
      id: 'hub',
      type: 'server',
      text: 'SignalR Hub',
      icon: 'csharp',
      lane: 2,
    },
  ],
  packets: [
    {
      id: 'handshake',
      kind: 'http_packet',
      packet_content: { header: 'WebSocket ⇄' },
    },
    {
      id: 'send',
      kind: 'http_packet',
      packet_content: { header: 'SendMessage("Salut")' },
    },
    {
      id: 'recv',
      kind: 'http_packet',
      packet_content: { header: 'ReceiveMessage' },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'client',
      text: '1. Le client ouvre une connexion temps réel',
      duration: 1500,
    },
    {
      type: 'set_content',
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
      type: 'move',
      object: 'handshake',
      from: 'client',
      to: 'hub',
      duration: 800,
    },
    {
      type: 'parallel',
      duration: 1000,
      actions: [
        {
          type: 'comment',
          object: 'hub',
          text: '2. Connexion établie',
        },
        {
          type: 'arrow',
          from: 'client',
          to: 'hub',
          style: 'dashed',
          keep_until_end: true,
        },
        {
          type: 'arrow',
          from: 'hub',
          to: 'client',
          style: 'dashed',
          keep_until_end: true,
        },
      ],
    },
    {
      type: 'set_content',
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
      type: 'comment',
      object: 'client',
      text: '3. Le client envoie un message',
      duration: 500,
    },
    {
      type: 'move',
      object: 'send',
      from: 'client',
      to: 'hub',
      duration: 800,
    },
    {
      type: 'comment',
      object: 'hub',
      text: '4. Le hub diffuse à tous (full duplex)',
      duration: 500,
    },
    {
      type: 'move',
      id: 'end',
      object: 'recv',
      from: 'hub',
      to: 'client',
      duration: 800,
    },
  ],
};
