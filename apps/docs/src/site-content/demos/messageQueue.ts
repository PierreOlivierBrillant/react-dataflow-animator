import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Messagerie asynchrone publish/subscribe. Un producteur publie un message
 * dans un broker, qui le distribue à trois consommateurs abonnés. On illustre
 * le découplage : le producteur n'attend personne, le broker temporise.
 */
export const messageQueue: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    {
      id: 'producer',
      type: 'server',
      text: 'Producteur',
      icon: 'node',
      lane: 1,
    },
    {
      id: 'broker',
      type: 'server',
      text: 'Broker (file)',
      icon: 'MQ',
      lane: 2,
    },
    { id: 'c1', type: 'server', text: 'Worker A', icon: 'python', lane: 3 },
    { id: 'c2', type: 'server', text: 'Worker B', icon: 'python', lane: 3 },
    { id: 'c3', type: 'server', text: 'Worker C', icon: 'python', lane: 3 },
  ],
  connections: [
    { from: 'producer', to: 'broker', style: 'animated' },
    { from: 'broker', to: 'c1', style: 'dotted' },
    { from: 'broker', to: 'c2', style: 'dotted' },
    { from: 'broker', to: 'c3', style: 'dotted' },
  ],
  packets: [
    {
      id: 'pub',
      kind: 'http_packet',
      packet_content: {
        header: 'publish',
        body: { type: 'text', value: 'order.created #4815' },
      },
    },
    {
      id: 'd1',
      kind: 'http_packet',
      packet_content: {
        header: 'deliver',
        body: { type: 'text', value: 'order.created #4815' },
      },
    },
    {
      id: 'd2',
      kind: 'http_packet',
      packet_content: {
        header: 'deliver',
        body: { type: 'text', value: 'order.created #4815' },
      },
    },
    {
      id: 'd3',
      kind: 'http_packet',
      packet_content: {
        header: 'deliver',
        body: { type: 'text', value: 'order.created #4815' },
      },
    },
    { id: 'ack1', kind: 'http_packet', packet_content: { header: 'ack ✅' } },
    { id: 'ack2', kind: 'http_packet', packet_content: { header: 'ack ✅' } },
    { id: 'ack3', kind: 'http_packet', packet_content: { header: 'ack ✅' } },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'producer',
      text: '1. Le producteur publie un événement, puis passe à autre chose (asynchrone)',
      duration: 2600,
    },
    {
      type: 'move',
      object: 'pub',
      from: 'producer',
      to: 'broker',
      duration: 1300,
    },
    {
      type: 'set_content',
      object: 'broker',
      content: { type: 'text', value: '📥 1 message en file' },
      keep_until: 'fanout',
    },
    {
      type: 'comment',
      object: 'broker',
      text: '2. Le broker conserve le message le temps que les workers soient prêts',
      duration: 2400,
    },
    { type: 'loading', object: 'broker', duration: 1000 },
    {
      type: 'comment',
      object: 'broker',
      text: '3. Diffusion (fan-out) à tous les abonnés, légèrement décalée',
      duration: 2400,
    },
    {
      type: 'parallel',
      id: 'fanout',
      duration: 1600,
      actions: [
        { type: 'move', object: 'd1', from: 'broker', to: 'c1' },
        { type: 'move', object: 'd2', from: 'broker', to: 'c2', delay_ms: 250 },
        { type: 'move', object: 'd3', from: 'broker', to: 'c3', delay_ms: 500 },
      ],
    },
    {
      type: 'comment',
      text: '4. Chaque worker traite puis accuse réception ; le message ne quitte la file qu’une fois acquitté.',
      duration: 2800,
    },
    {
      type: 'parallel',
      duration: 1600,
      actions: [
        { type: 'move', object: 'ack1', from: 'c1', to: 'broker' },
        {
          type: 'move',
          object: 'ack2',
          from: 'c2',
          to: 'broker',
          delay_ms: 300,
        },
        {
          type: 'move',
          object: 'ack3',
          from: 'c3',
          to: 'broker',
          delay_ms: 600,
        },
      ],
    },
    {
      type: 'set_content',
      object: 'broker',
      content: { type: 'text', value: '✅ file vide' },
      keep_until_end: true,
    },
    { type: 'wait', duration: 1400 },
  ],
};
