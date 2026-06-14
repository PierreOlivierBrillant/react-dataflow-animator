import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Poignée de main TLS 1.3 entre un navigateur et un serveur. On insiste sur
 * les allers-retours (ClientHello / ServerHello) puis sur le passage au canal
 * chiffré. Rythme posé pour bien séparer négociation et données applicatives.
 */
export const tls: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    {
      id: 'client',
      type: 'laptop',
      text: 'Navigateur',
      icon: 'chrome',
      lane: 1,
    },
    {
      id: 'server',
      type: 'server',
      text: 'Serveur HTTPS',
      icon: 'nginx',
      lane: 2,
    },
  ],
  connections: [
    { from: 'client', to: 'server', style: 'dotted', arrow_head: 'both' },
  ],
  packets: [
    {
      id: 'hello',
      kind: 'http_packet',
      packet_content: {
        header: 'ClientHello',
        body: { type: 'text', value: 'TLS 1.3\nkey_share\ncipher_suites' },
      },
    },
    {
      id: 'shello',
      kind: 'http_packet',
      packet_content: {
        header: 'ServerHello + Certificate',
        body: { type: 'text', value: 'key_share\ncertificat\nFinished' },
      },
    },
    {
      id: 'finished',
      kind: 'http_packet',
      packet_content: {
        header: 'Finished 🔒',
        body: { type: 'text', value: 'handshake vérifié' },
      },
    },
    {
      id: 'get',
      kind: 'http_packet',
      packet_content: {
        header: 'GET / 🔒',
        body: { type: 'text', value: 'Application Data (chiffré)' },
      },
    },
    {
      id: 'page',
      kind: 'http_packet',
      packet_content: {
        header: '200 OK 🔒',
        body: { type: 'text', value: '<html> … </html>' },
      },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'client',
      text: '1. Le navigateur propose ses suites de chiffrement et sa part de clé (ClientHello)',
      duration: 2400,
    },
    {
      type: 'move',
      object: 'hello',
      from: 'client',
      to: 'server',
      duration: 1300,
    },
    { type: 'loading', object: 'server', duration: 1000 },
    {
      type: 'comment',
      object: 'server',
      text: '2. Le serveur choisit la suite, envoie son certificat et sa part de clé',
      duration: 2400,
    },
    {
      type: 'move',
      object: 'shello',
      from: 'server',
      to: 'client',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'client',
      text: '3. Le navigateur valide le certificat et dérive la clé de session',
      duration: 2400,
    },
    { type: 'loading', object: 'client', duration: 1000 },
    {
      type: 'move',
      object: 'finished',
      from: 'client',
      to: 'server',
      duration: 1300,
    },
    {
      type: 'arrow',
      from: 'client',
      to: 'server',
      text: '🔒 canal chiffré établi',
      style: 'solid',
      arrow_head: 'both',
      keep_until_end: true,
      duration: 1200,
    },
    {
      type: 'comment',
      text: 'À partir d’ici, tout est chiffré avec la clé de session : Application Data.',
      duration: 2600,
    },
    {
      type: 'move',
      object: 'get',
      from: 'client',
      to: 'server',
      duration: 1300,
    },
    { type: 'loading', id: 'render', object: 'server', duration: 900 },
    {
      type: 'move',
      object: 'page',
      from: 'server',
      to: 'client',
      duration: 1300,
      wait_for: 'render',
    },
    {
      type: 'comment',
      object: 'client',
      text: 'Page chargée sur une connexion sécurisée ✅',
      duration: 2000,
    },
    { type: 'wait', duration: 1200 },
  ],
};
