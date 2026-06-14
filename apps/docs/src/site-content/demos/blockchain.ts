import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Cycle de vie d'une transaction sur une blockchain à preuve de travail. La
 * transaction signée rejoint le mempool, plusieurs mineurs entrent en
 * compétition, l'un trouve le bloc et le diffuse au réseau. Démo « hors web »
 * volontairement étalée pour bien voir la compétition puis la confirmation.
 */
export const blockchain: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'wallet', type: 'mobile', text: 'Portefeuille', lane: 1 },
    { id: 'mempool', type: 'server', text: 'Mempool', lane: 2 },
    { id: 'm1', type: 'desktop', text: 'Mineur A', lane: 3 },
    { id: 'm2', type: 'desktop', text: 'Mineur B', lane: 3 },
    { id: 'm3', type: 'desktop', text: 'Mineur C', lane: 3 },
    { id: 'chain', type: 'database', text: 'Chaîne de blocs', lane: 4 },
  ],
  connections: [
    { from: 'wallet', to: 'mempool', style: 'dotted' },
    { from: 'mempool', to: 'm1', style: 'dotted' },
    { from: 'mempool', to: 'm2', style: 'dotted' },
    { from: 'mempool', to: 'm3', style: 'dotted' },
    { from: 'm2', to: 'chain', style: 'dotted' },
  ],
  packets: [
    {
      id: 'tx',
      kind: 'http_packet',
      packet_content: {
        header: 'tx signée',
        body: { type: 'text', value: '0,5 ₿ → Bob\nfrais 0,0002 ₿' },
      },
    },
    { id: 'p1', kind: 'http_packet', packet_content: { header: 'tx' } },
    { id: 'p2', kind: 'http_packet', packet_content: { header: 'tx' } },
    { id: 'p3', kind: 'http_packet', packet_content: { header: 'tx' } },
    {
      id: 'block',
      kind: 'http_packet',
      packet_content: {
        header: 'bloc #842 317',
        body: { type: 'text', value: 'nonce trouvé · hash 0000a3f…' },
      },
    },
    {
      id: 'gossip1',
      kind: 'http_packet',
      packet_content: { header: 'nouveau bloc' },
    },
    {
      id: 'gossip3',
      kind: 'http_packet',
      packet_content: { header: 'nouveau bloc' },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'wallet',
      text: '1. Le portefeuille signe une transaction et la diffuse au réseau',
      duration: 2400,
    },
    {
      type: 'move',
      object: 'tx',
      from: 'wallet',
      to: 'mempool',
      duration: 1300,
    },
    {
      type: 'set_content',
      object: 'mempool',
      content: { type: 'text', value: '⏳ en attente de minage' },
      keep_until: 'mined',
    },
    {
      type: 'comment',
      object: 'mempool',
      text: '2. La transaction rejoint le mempool : tous les mineurs la récupèrent',
      duration: 2600,
    },
    {
      type: 'parallel',
      duration: 1400,
      actions: [
        { type: 'move', object: 'p1', from: 'mempool', to: 'm1' },
        { type: 'move', object: 'p2', from: 'mempool', to: 'm2' },
        { type: 'move', object: 'p3', from: 'mempool', to: 'm3' },
      ],
    },
    {
      type: 'comment',
      text: '3. Les mineurs cherchent en parallèle un nonce valide (preuve de travail).',
      duration: 2800,
    },
    {
      type: 'parallel',
      duration: 1800,
      actions: [
        { type: 'loading', object: 'm1' },
        { type: 'loading', object: 'm2' },
        { type: 'loading', object: 'm3' },
      ],
    },
    {
      type: 'comment',
      object: 'm2',
      text: '4. Le mineur B trouve le nonce le premier et forge le bloc 🎉',
      duration: 2600,
    },
    {
      type: 'move',
      id: 'mined',
      object: 'block',
      from: 'm2',
      to: 'chain',
      duration: 1400,
    },
    {
      type: 'set_content',
      object: 'mempool',
      content: { type: 'text', value: '✅ incluse au bloc' },
      keep_until_end: true,
    },
    {
      type: 'comment',
      object: 'chain',
      text: '5. Le bloc est ajouté ; B le propage aux autres nœuds, qui le vérifient',
      duration: 2600,
    },
    {
      type: 'parallel',
      duration: 1400,
      actions: [
        { type: 'move', object: 'gossip1', from: 'm2', to: 'm1' },
        {
          type: 'move',
          object: 'gossip3',
          from: 'm2',
          to: 'm3',
          delay_ms: 250,
        },
      ],
    },
    {
      type: 'comment',
      text: 'Au fil des blocs suivants, la transaction accumule des confirmations.',
      duration: 2600,
    },
    { type: 'wait', duration: 1400 },
  ],
};
