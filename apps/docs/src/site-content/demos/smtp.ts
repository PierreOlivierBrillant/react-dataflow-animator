import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Acheminement d'un courriel : du client d'Alice jusqu'à la boîte de Bob, en
 * passant par les serveurs de messagerie (MTA) et une résolution
 * d'enregistrement MX. On sépare bien l'envoi (SMTP) de la relève (IMAP).
 */
export const smtp: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'alice', type: 'laptop', text: 'Alice (client mail)', lane: 1 },
    { id: 'out', type: 'server', text: 'MTA expéditeur', lane: 2 },
    { id: 'dns', type: 'server', text: 'DNS (MX)', icon: 'DNS', lane: 3 },
    { id: 'in', type: 'server', text: 'MTA destinataire', lane: 4 },
    { id: 'bob', type: 'mobile', text: 'Bob (client mail)', lane: 5 },
  ],
  connections: [
    { from: 'alice', to: 'out', style: 'dotted' },
    { from: 'out', to: 'in', style: 'dotted' },
    { from: 'in', to: 'bob', style: 'dotted' },
  ],
  packets: [
    {
      id: 'submit',
      kind: 'http_packet',
      packet_content: {
        header: 'SMTP submission',
        body: { type: 'text', value: 'De: alice@a.fr\nÀ: bob@b.fr' },
      },
    },
    { id: 'mxq', kind: 'http_packet', packet_content: { header: 'MX? b.fr' } },
    {
      id: 'mxr',
      kind: 'http_packet',
      packet_content: {
        header: 'MX b.fr',
        body: { type: 'text', value: 'mx1.b.fr (prio 10)' },
      },
    },
    {
      id: 'relay',
      kind: 'http_packet',
      packet_content: {
        header: 'SMTP relay',
        body: { type: 'text', value: 'DATA … message' },
      },
    },
    {
      id: 'fetch',
      kind: 'http_packet',
      packet_content: { header: 'IMAP fetch' },
    },
    {
      id: 'mail',
      kind: 'http_packet',
      packet_content: {
        header: 'Nouveau message ✉️',
        body: { type: 'text', value: 'De: alice@a.fr' },
      },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'alice',
      text: '1. Alice rédige son message et l’envoie à son serveur sortant (SMTP)',
      duration: 2400,
    },
    {
      type: 'move',
      object: 'submit',
      from: 'alice',
      to: 'out',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'out',
      text: '2. Le serveur cherche quel serveur reçoit le courrier de « b.fr » (enregistrement MX)',
      duration: 2800,
    },
    { type: 'move', object: 'mxq', from: 'out', to: 'dns', duration: 1200 },
    { type: 'move', object: 'mxr', from: 'dns', to: 'out', duration: 1200 },
    {
      type: 'comment',
      object: 'out',
      text: '3. Il relaie le message au MTA destinataire',
      duration: 2200,
    },
    { type: 'move', object: 'relay', from: 'out', to: 'in', duration: 1400 },
    { type: 'loading', id: 'filter', object: 'in', duration: 1000 },
    {
      type: 'set_content',
      object: 'in',
      content: { type: 'text', value: '✓ anti-spam OK\n📥 déposé en boîte' },
      keep_until: 'deliver',
    },
    {
      type: 'comment',
      object: 'in',
      text: '4. Après filtrage anti-spam, le message attend dans la boîte de Bob',
      duration: 2600,
    },
    {
      type: 'comment',
      object: 'bob',
      text: '5. Le client de Bob relève sa boîte (IMAP) et récupère le message',
      duration: 2600,
    },
    { type: 'move', object: 'fetch', from: 'bob', to: 'in', duration: 1200 },
    {
      type: 'move',
      id: 'deliver',
      object: 'mail',
      from: 'in',
      to: 'bob',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'bob',
      text: 'Courriel reçu ✉️',
      duration: 2000,
    },
    { type: 'wait', duration: 1200 },
  ],
};
