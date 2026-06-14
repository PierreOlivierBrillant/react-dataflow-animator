import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * Cache d'un CDN : la même ressource est demandée deux fois. Le premier appel
 * rate le cache (cache MISS → aller jusqu'à l'origine), le second le touche
 * (cache HIT → réponse immédiate depuis le bord). Les deux phases sont bien
 * séparées pour faire ressortir le gain.
 */
export const cdn: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'user', type: 'user', text: 'Visiteur', lane: 1 },
    {
      id: 'edge',
      type: 'server',
      text: 'Nœud de bord (CDN)',
      icon: 'cloud',
      lane: 2,
    },
    {
      id: 'origin',
      type: 'server',
      text: 'Serveur d’origine',
      icon: 'nginx',
      lane: 3,
    },
  ],
  connections: [
    { from: 'user', to: 'edge', style: 'dotted' },
    { from: 'edge', to: 'origin', style: 'dotted' },
  ],
  packets: [
    {
      id: 'req1',
      kind: 'http_packet',
      packet_content: { header: 'GET /logo.png' },
    },
    {
      id: 'pull',
      kind: 'http_packet',
      packet_content: {
        header: 'GET /logo.png',
        body: { type: 'text', value: 'au cache de remplir' },
      },
    },
    {
      id: 'fromOrigin',
      kind: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: { type: 'text', value: 'logo.png + Cache-Control' },
      },
    },
    {
      id: 'res1',
      kind: 'http_packet',
      packet_content: {
        header: '200 OK (MISS)',
        body: { type: 'text', value: 'logo.png' },
      },
    },
    {
      id: 'req2',
      kind: 'http_packet',
      packet_content: { header: 'GET /logo.png' },
    },
    {
      id: 'res2',
      kind: 'http_packet',
      packet_content: {
        header: '200 OK (HIT) ⚡',
        body: { type: 'text', value: 'logo.png — servi du bord' },
      },
    },
  ],
  timeline: [
    {
      type: 'comment',
      text: 'Premier visiteur : la ressource n’est pas encore en cache au plus près de lui.',
      duration: 2600,
    },
    { type: 'move', object: 'req1', from: 'user', to: 'edge', duration: 1300 },
    {
      type: 'set_content',
      object: 'edge',
      content: { type: 'text', value: '❌ cache MISS' },
      keep_until: 'store',
    },
    {
      type: 'comment',
      object: 'edge',
      text: '1. Cache MISS → le bord va chercher la ressource à l’origine',
      duration: 2400,
    },
    {
      type: 'move',
      object: 'pull',
      from: 'edge',
      to: 'origin',
      duration: 1300,
    },
    { type: 'loading', id: 'gen', object: 'origin', duration: 1100 },
    {
      type: 'move',
      object: 'fromOrigin',
      from: 'origin',
      to: 'edge',
      duration: 1300,
      wait_for: 'gen',
    },
    {
      type: 'set_content',
      id: 'store',
      object: 'edge',
      content: { type: 'text', value: '💾 mis en cache (TTL 24 h)' },
      keep_until_end: true,
    },
    {
      type: 'comment',
      object: 'edge',
      text: '2. Le bord mémorise la copie puis répond au visiteur',
      duration: 2400,
    },
    { type: 'move', object: 'res1', from: 'edge', to: 'user', duration: 1300 },
    { type: 'wait', duration: 1400 },
    {
      type: 'comment',
      text: 'Plus tard, un second visiteur demande exactement la même ressource…',
      duration: 2600,
    },
    { type: 'move', object: 'req2', from: 'user', to: 'edge', duration: 1300 },
    {
      type: 'comment',
      object: 'edge',
      text: '3. Cache HIT ⚡ → réponse immédiate, sans toucher l’origine',
      duration: 2600,
    },
    { type: 'move', object: 'res2', from: 'edge', to: 'user', duration: 1100 },
    {
      type: 'comment',
      object: 'user',
      text: 'Latence divisée : tout l’intérêt du CDN ✅',
      duration: 2200,
    },
    { type: 'wait', duration: 1200 },
  ],
};
