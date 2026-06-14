import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Échange de clés Diffie-Hellman sur un canal public écouté par Ève.
 * Démo « hors flux web classique » : on illustre pourquoi Ève, qui voit
 * passer A et B, ne peut pas pour autant reconstituer la clé partagée K.
 * Rythme volontairement lent (longs commentaires + highlights) pour laisser
 * le temps de lire chaque étape du protocole.
 */
export const crypto: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'alice', type: 'user', text: 'Alice', lane: 1 },
    // Ève est posée sur la lane médiane : le trafic Alice ↔ Bob lui passe
    // littéralement sous le nez.
    { id: 'eve', type: 'admin', text: 'Ève (sur le câble)', lane: 2 },
    { id: 'bob', type: 'user', text: 'Bob', lane: 3 },
  ],
  connections: [
    {
      from: 'alice',
      to: 'bob',
      style: 'dashed',
      arrow_head: 'both',
      text: 'canal public (écouté)',
    },
  ],
  packets: [
    {
      id: 'pubA',
      kind: 'http_packet',
      packet_content: {
        header: 'A = gᵃ mod p',
        body: { type: 'text', value: 'valeur publique d’Alice' },
      },
    },
    {
      id: 'pubB',
      kind: 'http_packet',
      packet_content: {
        header: 'B = gᵇ mod p',
        body: { type: 'text', value: 'valeur publique de Bob' },
      },
    },
    {
      id: 'cipher',
      kind: 'http_packet',
      packet_content: {
        header: '🔒 message chiffré',
        body: { type: 'text', value: 'Vm0wd2QyUXlVWGxW…' },
      },
    },
  ],
  timeline: [
    {
      type: 'comment',
      text: 'Diffie-Hellman : se mettre d’accord sur une clé secrète commune, sur un canal que tout le monde peut écouter.',
      duration: 2600,
    },
    {
      type: 'comment',
      object: 'alice',
      text: 'Alice tire un secret a, puis calcule sa valeur publique A = gᵃ mod p',
      duration: 2200,
    },
    {
      type: 'set_content',
      id: 'a_pub',
      object: 'alice',
      content: {
        type: 'code',
        language: 'python',
        value:
          'a = 6            # secret, jamais transmis\nA = (g**a) % p   # public',
      },
      keep_until: 'a_key',
    },
    { type: 'move', object: 'pubA', from: 'alice', to: 'bob', duration: 1400 },
    {
      type: 'parallel',
      duration: 2200,
      actions: [
        { type: 'highlight', object: 'eve' },
        {
          type: 'comment',
          object: 'eve',
          text: 'Ève note A au passage… mais A seul ne lui apprend rien.',
        },
      ],
    },
    {
      type: 'comment',
      object: 'bob',
      text: 'Bob tire son secret b, calcule B = gᵇ mod p et le renvoie',
      duration: 2200,
    },
    {
      type: 'set_content',
      id: 'b_pub',
      object: 'bob',
      content: {
        type: 'code',
        language: 'python',
        value:
          'b = 15           # secret, jamais transmis\nB = (g**b) % p   # public',
      },
      keep_until: 'b_key',
    },
    { type: 'move', object: 'pubB', from: 'bob', to: 'alice', duration: 1400 },
    {
      type: 'parallel',
      duration: 2400,
      actions: [
        { type: 'highlight', object: 'eve' },
        {
          type: 'comment',
          object: 'eve',
          text: 'Ève connaît maintenant A et B — mais toujours ni a, ni b.',
        },
      ],
    },
    {
      type: 'comment',
      text: 'Chacun élève la valeur reçue à son propre secret : K = Bᵃ = Aᵇ mod p. La même clé, sans l’avoir jamais transmise !',
      duration: 2800,
    },
    {
      type: 'parallel',
      duration: 1800,
      actions: [
        {
          type: 'set_content',
          id: 'a_key',
          object: 'alice',
          content: {
            type: 'code',
            language: 'python',
            value: 'K = (B**a) % p   # clé partagée 🔑',
          },
          keep_until_end: true,
        },
        {
          type: 'set_content',
          id: 'b_key',
          object: 'bob',
          content: {
            type: 'code',
            language: 'python',
            value: 'K = (A**b) % p   # clé partagée 🔑',
          },
          keep_until: 'b_msg',
        },
      ],
    },
    {
      type: 'comment',
      object: 'alice',
      text: 'Alice chiffre son message avec K et l’envoie',
      duration: 2000,
    },
    {
      type: 'move',
      object: 'cipher',
      from: 'alice',
      to: 'bob',
      duration: 1400,
    },
    {
      type: 'parallel',
      duration: 2600,
      actions: [
        { type: 'highlight', object: 'eve' },
        {
          type: 'comment',
          object: 'eve',
          text: 'Ève ne capte qu’un bloc chiffré : illisible sans K 🔒',
        },
      ],
    },
    {
      type: 'set_content',
      id: 'b_msg',
      object: 'bob',
      content: {
        type: 'text',
        url: 'message déchiffré',
        value: 'Salut Bob 👋',
      },
      keep_until_end: true,
    },
    {
      type: 'comment',
      object: 'bob',
      text: 'Bob déchiffre avec K et lit le message en clair ✅',
      duration: 2200,
    },
    {
      type: 'comment',
      text: 'Retrouver le secret à partir de A et B (le « logarithme discret ») est infaisable en pratique : Ève reste dans le noir.',
      duration: 3000,
    },
    { type: 'wait', duration: 1400 },
  ],
};
