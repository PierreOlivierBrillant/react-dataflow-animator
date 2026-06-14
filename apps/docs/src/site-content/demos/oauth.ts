import type { DataFlowSpec } from 'react-dataflow-animator';

/**
 * OAuth 2.0 / OpenID Connect — flot « Authorization Code ». Quatre acteurs :
 * l'utilisateur, l'application cliente, le serveur d'autorisation et l'API de
 * ressources. On distingue bien le canal frontal (redirections) du canal
 * arrière (échange code ↔ token), d'où le rythme étalé.
 */
export const oauth: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'user', type: 'user', text: 'Utilisateur', lane: 1 },
    { id: 'app', type: 'server', text: 'Application', icon: 'react', lane: 2 },
    {
      id: 'idp',
      type: 'server',
      text: 'Serveur d’autorisation',
      icon: 'OIDC',
      lane: 3,
    },
    {
      id: 'api',
      type: 'server',
      text: 'API de ressources',
      icon: 'node',
      lane: 4,
    },
  ],
  connections: [
    { from: 'user', to: 'app', style: 'dotted' },
    { from: 'app', to: 'idp', style: 'dotted' },
    { from: 'app', to: 'api', style: 'dotted' },
  ],
  packets: [
    {
      id: 'login',
      kind: 'http_packet',
      packet_content: { header: 'Se connecter' },
    },
    {
      id: 'redirect',
      kind: 'http_packet',
      packet_content: {
        header: '302 → /authorize',
        body: { type: 'text', value: 'client_id, scope, state' },
      },
    },
    {
      id: 'consent',
      kind: 'http_packet',
      packet_content: { header: 'J’autorise ✅' },
    },
    {
      id: 'code',
      kind: 'http_packet',
      packet_content: {
        header: '302 → /callback',
        body: { type: 'text', value: 'code=AUTH_CODE' },
      },
    },
    {
      id: 'exchange',
      kind: 'http_packet',
      packet_content: {
        header: 'POST /token',
        body: { type: 'text', value: 'code + client_secret' },
      },
    },
    {
      id: 'token',
      kind: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: { type: 'text', value: 'access_token (JWT)' },
      },
    },
    {
      id: 'call',
      kind: 'http_packet',
      packet_content: {
        header: 'GET /me',
        body: { type: 'text', value: 'Bearer access_token' },
      },
    },
    {
      id: 'profile',
      kind: 'http_packet',
      packet_content: {
        header: '200 OK',
        body: { type: 'text', value: '{ "name": "Alice" }' },
      },
    },
  ],
  timeline: [
    {
      type: 'comment',
      object: 'user',
      text: '1. L’utilisateur clique sur « Se connecter »',
      duration: 2000,
    },
    { type: 'move', object: 'login', from: 'user', to: 'app', duration: 1200 },
    {
      type: 'comment',
      object: 'app',
      text: '2. L’app redirige le navigateur vers le serveur d’autorisation',
      duration: 2200,
    },
    {
      type: 'move',
      object: 'redirect',
      from: 'app',
      to: 'idp',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'idp',
      text: '3. L’utilisateur s’authentifie et accorde les permissions demandées',
      duration: 2400,
    },
    {
      type: 'move',
      object: 'consent',
      from: 'user',
      to: 'idp',
      duration: 1300,
    },
    {
      type: 'comment',
      object: 'idp',
      text: '4. Le serveur renvoie un code d’autorisation à usage unique',
      duration: 2200,
    },
    { type: 'move', object: 'code', from: 'idp', to: 'app', duration: 1300 },
    {
      type: 'comment',
      object: 'app',
      text: '5. Canal arrière : l’app échange le code contre un jeton (avec son secret)',
      duration: 2600,
    },
    {
      type: 'move',
      object: 'exchange',
      from: 'app',
      to: 'idp',
      duration: 1300,
    },
    { type: 'loading', id: 'mint', object: 'idp', duration: 1000 },
    {
      type: 'move',
      object: 'token',
      from: 'idp',
      to: 'app',
      duration: 1300,
      wait_for: 'mint',
    },
    {
      type: 'comment',
      object: 'app',
      text: '6. Munie du jeton d’accès, l’app appelle l’API de ressources',
      duration: 2400,
    },
    { type: 'move', object: 'call', from: 'app', to: 'api', duration: 1300 },
    { type: 'loading', id: 'check', object: 'api', duration: 900 },
    {
      type: 'move',
      object: 'profile',
      from: 'api',
      to: 'app',
      duration: 1300,
      wait_for: 'check',
    },
    {
      type: 'comment',
      object: 'app',
      text: 'Profil obtenu, utilisateur connecté 🎉',
      duration: 2000,
    },
    { type: 'wait', duration: 1200 },
  ],
};
