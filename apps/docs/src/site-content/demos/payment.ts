import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Paiement en ligne avec prestataire (type Stripe) et authentification forte
 * 3-D Secure. On distingue l'autorisation synchrone de la confirmation
 * asynchrone par webhook, ce qui explique le rythme en deux temps.
 */
export const payment: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'buyer', type: 'mobile', text: 'Client', lane: 1 },
    { id: 'shop', type: 'server', text: 'Boutique', icon: 'react', lane: 2 },
    { id: 'psp', type: 'cloud', text: 'Prestataire', icon: 'Pay', lane: 3 },
    { id: 'bank', type: 'server', text: 'Banque', icon: 'bank', lane: 4 },
  ],
  connections: [
    { from: 'buyer', to: 'shop', style: 'dotted' },
    { from: 'shop', to: 'psp', style: 'dotted' },
    { from: 'psp', to: 'bank', style: 'dotted' },
  ],
  packets: [
    {
      id: 'pay',
      kind: 'http_packet',
      packet_content: { header: 'Payer 49,90 €' },
    },
    {
      id: 'intent',
      kind: 'http_packet',
      packet_content: {
        header: 'create PaymentIntent',
        body: { type: 'text', value: 'amount: 4990, eur' },
      },
    },
    {
      id: 'auth',
      kind: 'http_packet',
      packet_content: {
        header: 'autorisation',
        body: { type: 'text', value: 'carte •••• 4242' },
      },
    },
    {
      id: 'challenge',
      kind: 'http_packet',
      packet_content: {
        header: '3-D Secure',
        body: { type: 'text', value: 'valider sur l’app bancaire' },
      },
    },
    {
      id: 'approved',
      kind: 'http_packet',
      packet_content: { header: 'approuvé ✅' },
    },
    {
      id: 'webhook',
      kind: 'http_packet',
      packet_content: {
        header: 'webhook',
        body: { type: 'text', value: 'payment_intent.succeeded' },
      },
    },
    {
      id: 'receipt',
      kind: 'http_packet',
      packet_content: { header: 'Commande confirmée 🎉' },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'buyer',
      text: '1. Le client valide son panier et paie',
      duration: 2000,
    },
    { type: 'move', object: 'pay', from: 'buyer', to: 'shop', duration: 1200 },
    {
      type: 'comment',
      object: 'shop',
      text: '2. La boutique crée une intention de paiement chez le prestataire',
      duration: 2400,
    },
    { type: 'move', object: 'intent', from: 'shop', to: 'psp', duration: 1300 },
    {
      type: 'comment',
      object: 'psp',
      text: '3. Le prestataire demande l’autorisation à la banque émettrice',
      duration: 2400,
    },
    { type: 'move', object: 'auth', from: 'psp', to: 'bank', duration: 1300 },
    {
      type: 'comment',
      object: 'bank',
      text: '4. La banque exige une authentification forte (3-D Secure)',
      duration: 2600,
    },
    {
      type: 'move',
      object: 'challenge',
      from: 'bank',
      to: 'buyer',
      duration: 1400,
    },
    { type: 'loading', id: 'sca', object: 'buyer', duration: 1200 },
    {
      type: 'comment',
      object: 'buyer',
      text: 'Le client confirme dans son application bancaire',
      duration: 2200,
      wait_for: 'sca',
    },
    {
      type: 'move',
      object: 'approved',
      from: 'bank',
      to: 'psp',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'psp',
      text: '5. Paiement capturé. Le prestataire notifie la boutique de façon asynchrone (webhook).',
      duration: 2800,
    },
    {
      type: 'move',
      object: 'webhook',
      from: 'psp',
      to: 'shop',
      duration: 1300,
    },
    {
      type: 'move',
      object: 'receipt',
      from: 'shop',
      to: 'buyer',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'buyer',
      text: 'Commande confirmée 🎉',
      duration: 2000,
    },
    { type: 'wait', duration: 1200 },
  ],
};
