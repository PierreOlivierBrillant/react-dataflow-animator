import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Résolution DNS récursive. Le résolveur interroge tour à tour la racine, le
 * TLD puis le serveur autoritaire avant de répondre au client. La cascade
 * d'allers-retours est volontairement détaillée pour rendre la récursion
 * lisible.
 */
export const dns: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    {
      id: 'client',
      type: 'laptop',
      text: 'Navigateur',
      icon: 'firefox',
      lane: 1,
    },
    {
      id: 'resolver',
      type: 'server',
      text: 'Résolveur récursif',
      icon: 'DNS',
      lane: 2,
    },
    { id: 'root', type: 'server', text: 'Serveur racine « . »', lane: 3 },
    { id: 'tld', type: 'server', text: 'TLD « .com »', lane: 3 },
    { id: 'auth', type: 'server', text: 'Autoritaire', lane: 3 },
  ],
  packets: [
    {
      id: 'q',
      kind: 'http_packet',
      packet_content: { header: 'A? www.exemple.com' },
    },
    {
      id: 'qroot',
      kind: 'http_packet',
      packet_content: { header: 'A? www.exemple.com' },
    },
    {
      id: 'rroot',
      kind: 'http_packet',
      packet_content: {
        header: 'Va voir le TLD .com',
        body: { type: 'text', value: 'NS a.gtld-servers.net' },
      },
    },
    {
      id: 'qtld',
      kind: 'http_packet',
      packet_content: { header: 'A? www.exemple.com' },
    },
    {
      id: 'rtld',
      kind: 'http_packet',
      packet_content: {
        header: 'Va voir l’autoritaire',
        body: { type: 'text', value: 'NS ns1.exemple.com' },
      },
    },
    {
      id: 'qauth',
      kind: 'http_packet',
      packet_content: { header: 'A? www.exemple.com' },
    },
    {
      id: 'rauth',
      kind: 'http_packet',
      packet_content: {
        header: 'Réponse faisant autorité',
        body: { type: 'text', value: 'A 93.184.216.34' },
      },
    },
    {
      id: 'answer',
      kind: 'http_packet',
      packet_content: {
        header: 'Réponse',
        body: { type: 'text', value: '93.184.216.34 (TTL 3600)' },
      },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'client',
      text: 'Le navigateur ne connaît pas l’adresse IP de www.exemple.com',
      duration: 2200,
    },
    {
      type: 'move',
      object: 'q',
      from: 'client',
      to: 'resolver',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'resolver',
      text: '1. Le résolveur demande à un serveur racine par où commencer',
      duration: 2400,
    },
    {
      type: 'move',
      object: 'qroot',
      from: 'resolver',
      to: 'root',
      duration: 1300,
    },
    {
      type: 'move',
      object: 'rroot',
      from: 'root',
      to: 'resolver',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'resolver',
      text: '2. La racine renvoie vers le TLD « .com »',
      duration: 2200,
    },
    {
      type: 'move',
      object: 'qtld',
      from: 'resolver',
      to: 'tld',
      duration: 1300,
    },
    {
      type: 'move',
      object: 'rtld',
      from: 'tld',
      to: 'resolver',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'resolver',
      text: '3. Le TLD renvoie vers le serveur autoritaire du domaine',
      duration: 2200,
    },
    {
      type: 'move',
      object: 'qauth',
      from: 'resolver',
      to: 'auth',
      duration: 1300,
    },
    { type: 'loading', id: 'lookup', object: 'auth', duration: 800 },
    {
      type: 'move',
      object: 'rauth',
      from: 'auth',
      to: 'resolver',
      duration: 1300,
      wait_for: 'lookup',
    },
    {
      type: 'comment',
      object: 'resolver',
      text: '4. Réponse faisant autorité — le résolveur la met en cache (TTL)',
      duration: 2400,
    },
    {
      type: 'move',
      object: 'answer',
      from: 'resolver',
      to: 'client',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'client',
      text: 'IP résolue, le navigateur peut se connecter ✅',
      duration: 2000,
    },
    { type: 'wait', duration: 1200 },
  ],
};
