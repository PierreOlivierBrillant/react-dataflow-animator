import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Livraison d'un webhook avec ré-essais et back-off exponentiel. Le premier
 * envoi échoue (récepteur indisponible), le deuxième aussi, le troisième
 * réussit. Les temps morts entre tentatives matérialisent le back-off, d'où le
 * rythme délibérément lent.
 */
export const webhook: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'provider', type: 'cloud', text: 'Service émetteur', lane: 1 },
    { id: 'app', type: 'server', text: 'Ton endpoint', icon: 'node', lane: 2 },
  ],
  connections: [{ from: 'provider', to: 'app', style: 'dotted' }],
  packets: [
    {
      id: 'evt1',
      kind: 'http_packet',
      packet_content: {
        header: 'POST /webhook',
        body: { type: 'text', value: 'invoice.paid · essai 1' },
      },
    },
    {
      id: 'err1',
      kind: 'http_packet',
      packet_content: { header: '503 Service Unavailable' },
    },
    {
      id: 'evt2',
      kind: 'http_packet',
      packet_content: {
        header: 'POST /webhook',
        body: { type: 'text', value: 'invoice.paid · essai 2' },
      },
    },
    {
      id: 'err2',
      kind: 'http_packet',
      packet_content: { header: '500 Internal Error' },
    },
    {
      id: 'evt3',
      kind: 'http_packet',
      packet_content: {
        header: 'POST /webhook',
        body: { type: 'text', value: 'invoice.paid · essai 3' },
      },
    },
    { id: 'ok', kind: 'http_packet', packet_content: { header: '200 OK ✅' } },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'provider',
      text: 'Un événement vient de se produire : l’émetteur tente de le livrer.',
      duration: 2400,
    },
    {
      type: 'comment',
      object: 'provider',
      text: 'Tentative 1',
      duration: 1600,
    },
    {
      type: 'move',
      object: 'evt1',
      from: 'provider',
      to: 'app',
      duration: 1300,
    },
    {
      type: 'set_content',
      object: 'app',
      content: { type: 'text', value: '🛑 service en maintenance' },
      keep_until: 'recover',
    },
    {
      type: 'move',
      object: 'err1',
      from: 'app',
      to: 'provider',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'provider',
      text: 'Échec (503). L’émetteur attend avant de réessayer (back-off).',
      duration: 2600,
    },
    { type: 'wait', duration: 1600 },
    {
      type: 'comment',
      object: 'provider',
      text: 'Tentative 2 (après ~1 s)',
      duration: 1800,
    },
    {
      type: 'move',
      object: 'evt2',
      from: 'provider',
      to: 'app',
      duration: 1300,
    },
    {
      type: 'move',
      object: 'err2',
      from: 'app',
      to: 'provider',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'provider',
      text: 'Encore raté (500). On double le délai d’attente.',
      duration: 2400,
    },
    { type: 'wait', duration: 1800 },
    {
      type: 'set_content',
      id: 'recover',
      object: 'app',
      content: { type: 'text', value: '🟢 service rétabli' },
      keep_until_end: true,
    },
    {
      type: 'comment',
      object: 'provider',
      text: 'Tentative 3 (après ~2 s) — cette fois l’endpoint répond',
      duration: 2600,
    },
    {
      type: 'move',
      object: 'evt3',
      from: 'provider',
      to: 'app',
      duration: 1300,
    },
    { type: 'loading', id: 'process', object: 'app', duration: 900 },
    {
      type: 'move',
      object: 'ok',
      from: 'app',
      to: 'provider',
      duration: 1300,
      wait_for: 'process',
    },
    {
      type: 'comment',
      object: 'provider',
      text: 'Accusé 200 reçu : la livraison est marquée réussie ✅',
      duration: 2400,
    },
    { type: 'wait', duration: 1200 },
  ],
};
