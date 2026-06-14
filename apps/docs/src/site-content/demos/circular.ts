import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Démo de la disposition `circular` (référencée par la page « Disposition »).
 * Un orchestrateur central (`main`) distribue une commande aux services
 * satellites, puis agrège leurs réponses. Le nœud central reste au milieu, les
 * autres sont répartis sur un cercle.
 */
export const circular: DataFlowSpec = {
  direction: 'circular',
  nodes: [
    {
      id: 'orch',
      type: 'server',
      text: 'Orchestrateur',
      icon: 'go',
      main: true,
    },
    { id: 'inv', type: 'server', text: 'Stock', icon: 'postgres', lane: 1 },
    { id: 'pay', type: 'server', text: 'Paiement', icon: 'Pay', lane: 2 },
    { id: 'ship', type: 'server', text: 'Expédition', icon: 'node', lane: 3 },
    {
      id: 'mail',
      type: 'server',
      text: 'Notification',
      icon: 'redis',
      lane: 4,
    },
  ],
  packets: [
    {
      id: 'cmdInv',
      kind: 'http_packet',
      packet_content: { header: 'réserver stock' },
    },
    {
      id: 'cmdPay',
      kind: 'http_packet',
      packet_content: { header: 'débiter' },
    },
    {
      id: 'cmdShip',
      kind: 'http_packet',
      packet_content: { header: 'préparer colis' },
    },
    {
      id: 'cmdMail',
      kind: 'http_packet',
      packet_content: { header: 'notifier client' },
    },
    {
      id: 'okInv',
      kind: 'http_packet',
      packet_content: { header: 'réservé ✅' },
    },
    { id: 'okPay', kind: 'http_packet', packet_content: { header: 'payé ✅' } },
    {
      id: 'okShip',
      kind: 'http_packet',
      packet_content: { header: 'prêt ✅' },
    },
    {
      id: 'okMail',
      kind: 'http_packet',
      packet_content: { header: 'envoyée ✅' },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'orch',
      text: 'Une commande arrive : l’orchestrateur coordonne tous les services autour de lui.',
      duration: 2800,
    },
    {
      type: 'comment',
      object: 'orch',
      text: '1. Il déclenche chaque étape, légèrement décalée',
      duration: 2200,
    },
    {
      type: 'parallel',
      duration: 1800,
      actions: [
        { type: 'move', object: 'cmdInv', from: 'orch', to: 'inv' },
        {
          type: 'move',
          object: 'cmdPay',
          from: 'orch',
          to: 'pay',
          delay_ms: 300,
        },
        {
          type: 'move',
          object: 'cmdShip',
          from: 'orch',
          to: 'ship',
          delay_ms: 600,
        },
        {
          type: 'move',
          object: 'cmdMail',
          from: 'orch',
          to: 'mail',
          delay_ms: 900,
        },
      ],
    },
    {
      type: 'comment',
      text: '2. Chaque service fait son travail puis confirme à l’orchestrateur.',
      duration: 2600,
    },
    {
      type: 'parallel',
      duration: 1800,
      actions: [
        { type: 'move', object: 'okInv', from: 'inv', to: 'orch' },
        {
          type: 'move',
          object: 'okPay',
          from: 'pay',
          to: 'orch',
          delay_ms: 300,
        },
        {
          type: 'move',
          object: 'okShip',
          from: 'ship',
          to: 'orch',
          delay_ms: 600,
        },
        {
          type: 'move',
          object: 'okMail',
          from: 'mail',
          to: 'orch',
          delay_ms: 900,
        },
      ],
    },
    {
      type: 'set_content',
      object: 'orch',
      content: { type: 'text', value: '✅ commande traitée' },
      keep_until_end: true,
    },
    {
      type: 'comment',
      object: 'orch',
      text: 'Toutes les confirmations reçues : la commande est complète 🎉',
      duration: 2400,
    },
    { type: 'wait', duration: 1400 },
  ],
};
