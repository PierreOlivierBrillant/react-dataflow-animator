import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Passerelle GraphQL fédérée : une seule requête est éclatée par la gateway
 * vers plusieurs sous-graphes, dont les réponses sont recomposées en un objet
 * unique. Illustre le fan-out / fan-in et le résultat agrégé.
 */
export const graphql: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'client', type: 'laptop', text: 'Client', icon: 'react', lane: 1 },
    { id: 'gw', type: 'server', text: 'Gateway', icon: 'graphql', lane: 2 },
    { id: 'users', type: 'server', text: 'Sous-graphe Users', lane: 3 },
    { id: 'orders', type: 'server', text: 'Sous-graphe Orders', lane: 3 },
    { id: 'reviews', type: 'server', text: 'Sous-graphe Reviews', lane: 3 },
  ],
  connections: [
    { from: 'client', to: 'gw', style: 'dotted' },
    { from: 'gw', to: 'users', style: 'dotted' },
    { from: 'gw', to: 'orders', style: 'dotted' },
    { from: 'gw', to: 'reviews', style: 'dotted' },
  ],
  packets: [
    {
      id: 'query',
      kind: 'http_packet',
      packet_content: {
        header: 'POST /graphql',
        body: { type: 'text', value: '{ user { name orders reviews } }' },
      },
    },
    { id: 'qU', kind: 'http_packet', packet_content: { header: 'user(id)' } },
    {
      id: 'qO',
      kind: 'http_packet',
      packet_content: { header: 'orders(userId)' },
    },
    {
      id: 'qR',
      kind: 'http_packet',
      packet_content: { header: 'reviews(userId)' },
    },
    {
      id: 'rU',
      kind: 'http_packet',
      packet_content: {
        header: 'name',
        body: { type: 'text', value: '"Alice"' },
      },
    },
    {
      id: 'rO',
      kind: 'http_packet',
      packet_content: {
        header: 'orders',
        body: { type: 'text', value: '[ 3 commandes ]' },
      },
    },
    {
      id: 'rR',
      kind: 'http_packet',
      packet_content: {
        header: 'reviews',
        body: { type: 'text', value: '[ 5 avis ]' },
      },
    },
    {
      id: 'merged',
      kind: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: {
          type: 'text',
          value: '{ name, orders, reviews }',
          language: 'json',
        },
      },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'client',
      text: '1. Le client envoie une seule requête, qui touche plusieurs domaines',
      duration: 2600,
    },
    { type: 'move', object: 'query', from: 'client', to: 'gw', duration: 1300 },
    {
      type: 'comment',
      object: 'gw',
      text: '2. La gateway planifie la requête et interroge chaque sous-graphe en parallèle',
      duration: 2800,
    },
    {
      type: 'parallel',
      duration: 1400,
      actions: [
        { type: 'move', object: 'qU', from: 'gw', to: 'users' },
        { type: 'move', object: 'qO', from: 'gw', to: 'orders', delay_ms: 200 },
        {
          type: 'move',
          object: 'qR',
          from: 'gw',
          to: 'reviews',
          delay_ms: 400,
        },
      ],
    },
    {
      type: 'parallel',
      duration: 1200,
      actions: [
        { type: 'loading', object: 'users' },
        { type: 'loading', object: 'orders' },
        { type: 'loading', object: 'reviews' },
      ],
    },
    {
      type: 'comment',
      text: '3. Chaque service répond pour sa part du graphe',
      duration: 2400,
    },
    {
      type: 'parallel',
      duration: 1500,
      actions: [
        { type: 'move', object: 'rU', from: 'users', to: 'gw' },
        { type: 'move', object: 'rO', from: 'orders', to: 'gw', delay_ms: 250 },
        {
          type: 'move',
          object: 'rR',
          from: 'reviews',
          to: 'gw',
          delay_ms: 500,
        },
      ],
    },
    { type: 'loading', id: 'stitch', object: 'gw', duration: 1000 },
    {
      type: 'comment',
      object: 'gw',
      text: '4. La gateway recompose un seul objet à partir des trois réponses',
      duration: 2600,
      wait_for: 'stitch',
    },
    {
      type: 'move',
      object: 'merged',
      from: 'gw',
      to: 'client',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'client',
      text: 'Une requête, une réponse — la fédération est invisible côté client ✅',
      duration: 2600,
    },
    { type: 'wait', duration: 1200 },
  ],
};
