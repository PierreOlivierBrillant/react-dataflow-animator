import type { DataFlowSpec } from 'react-dataflow-animator';

export const signalr: DataFlowSpec = {
  direction: 'circular',
  nodes: [
    {
      id: 'client1',
      type: 'laptop',
      text: 'Client 1',
      icon: 'react',
    },
    {
      id: 'client2',
      type: 'laptop',
      text: 'Client 2',
      icon: 'react',
    },
    {
      id: 'client3',
      type: 'laptop',
      text: 'Client 3',
      icon: 'react',
    },
    {
      id: 'hub',
      type: 'server',
      text: 'SignalR Hub',
      icon: 'csharp',
      main: true,
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
      object: 'client1',
      text: '1. Le client demande au serveur pour ouvrir une connexion',
      duration: 1500,
    },
    {
      type: 'set_content',
      id: 'clientCode',
      object: 'client1',
      content: {
        type: 'code',
        language: 'typescript',
        value:
          'const conn = new HubConnectionBuilder()\n  .withUrl("/chatHub").build();\nconn.on("ReceiveMessage", render);\nawait conn.start();',
      },
      keep_until: 'end',
    },
    {
      type: 'move',
      object: 'handshake',
      from: 'client1',
      to: 'hub',
      duration: 1500,
    },
    {
      type: 'parallel',
      duration: 1500,
      actions: [
        {
          type: 'comment',
          object: 'hub',
          text: '2. Connexion établie',
        },
        {
          type: 'arrow',
          from: 'client1',
          to: 'hub',
          style: 'dashed',
          keep_until_end: true,
        },
        {
          type: 'arrow',
          from: 'hub',
          to: 'client1',
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
        type: 'code',
        language: 'csharp',
        value:
          'public async Task SendMessage(string m) =>\n  await Clients.All\n    .SendAsync("ReceiveMessage", m);',
      },
      keep_until: 'end',
    },
    {
      type: 'comment',
      object: 'client1',
      text: '3. Le client envoie un message',
      duration: 500,
    },
    {
      type: 'move',
      object: 'send',
      from: 'client1',
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
      to: 'client1',
      duration: 800,
    },
  ],
};
