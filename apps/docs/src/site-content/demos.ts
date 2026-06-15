import type { DataFlowSpec } from 'react-dataflow-animator';
import { signalr } from './demos/signalr';
import { microservices } from './demos/microservices';
import { spa } from './demos/spa';
import { clientServer } from './demos/clientServer';
import { crypto } from './demos/crypto';
import { tls } from './demos/tls';
import { oauth } from './demos/oauth';
import { dns } from './demos/dns';
import { cicd } from './demos/cicd';
import { raft } from './demos/raft';
import { messageQueue } from './demos/messageQueue';
import { cdn } from './demos/cdn';
import { loadBalancer } from './demos/loadBalancer';
import { kubernetes } from './demos/kubernetes';
import { payment } from './demos/payment';
import { blockchain } from './demos/blockchain';
import { smtp } from './demos/smtp';
import { graphql } from './demos/graphql';
import { webhook } from './demos/webhook';
import { circular } from './demos/circular';
import { collision } from './demos/collision';

/** Catégorie de classement d'un exemple (filtre de la galerie). */
export type DemoCategory =
  | 'Web & API'
  | 'Temps réel'
  | 'Sécurité'
  | 'Infrastructure'
  | 'Systèmes distribués'
  | 'Concepts moteur';

/** Ordre d'affichage des catégories dans le filtre de la galerie. */
export const demoCategories: DemoCategory[] = [
  'Web & API',
  'Temps réel',
  'Sécurité',
  'Infrastructure',
  'Systèmes distribués',
  'Concepts moteur',
];

export interface Demo {
  id: string;
  title: string;
  description: string;
  /** Catégorie de classement (filtre de la galerie). */
  category: DemoCategory;
  /** Mots-clés libres, indexés par la recherche textuelle de la galerie. */
  tags?: string[];
  spec: DataFlowSpec;
}

export const demos: Demo[] = [
  {
    id: 'clientServer',
    title: 'Client-Serveur',
    description: 'Architecture client serveur',
    category: 'Web & API',
    tags: ['http', 'rest', 'sql', 'navigateur', 'base de données'],
    spec: clientServer,
  },
  {
    id: 'signalr',
    title: 'Temps réel full-duplex (SignalR)',
    description:
      'Connexion WebSocket persistante : on voit le code client et le code du hub, puis un SendAll qui diffuse le message à tous les clients connectés.',
    category: 'Temps réel',
    tags: ['websocket', 'hub', 'diffusion', 'full-duplex', 'signalr'],
    spec: signalr,
  },
  {
    id: 'microservices',
    title: 'Microservices derrière un proxy Nginx',
    description:
      'Auth et Données derrière Nginx, chacun avec sa base : authentification (JWT) puis requête de données.',
    category: 'Infrastructure',
    tags: ['nginx', 'jwt', 'proxy', 'auth', 'microservices'],
    spec: microservices,
  },
  {
    id: 'spa',
    title: 'Chargement d’une SPA puis appels API',
    description:
      'Le navigateur charge le bundle depuis le serveur web, puis la SPA interroge le Web API et sa base.',
    category: 'Web & API',
    tags: ['react', 'bundle', 'api', 'single-page', 'navigateur'],
    spec: spa,
  },
  {
    id: 'crypto',
    title: 'Cryptographie : Alice, Bob & Ève',
    description:
      'Échange de clés Diffie-Hellman sur un canal public écouté par Ève : elle voit passer les valeurs publiques mais ne peut pas reconstituer la clé partagée.',
    category: 'Sécurité',
    tags: [
      'diffie-hellman',
      'chiffrement',
      'mitm',
      'alice',
      'bob',
      'ève',
      'clé',
    ],
    spec: crypto,
  },
  {
    id: 'tls',
    title: 'Poignée de main TLS 1.3',
    description:
      'ClientHello / ServerHello, validation du certificat, dérivation de la clé de session, puis bascule en canal chiffré pour les données applicatives.',
    category: 'Sécurité',
    tags: ['https', 'handshake', 'certificat', 'chiffrement', 'tls'],
    spec: tls,
  },
  {
    id: 'oauth',
    title: 'OAuth 2.0 — Authorization Code',
    description:
      'Connexion déléguée : redirection vers le serveur d’autorisation, code à usage unique, échange contre un jeton sur le canal arrière, puis appel de l’API.',
    category: 'Sécurité',
    tags: ['oauth2', 'oidc', 'jeton', 'authentification', 'sso'],
    spec: oauth,
  },
  {
    id: 'dns',
    title: 'Résolution DNS récursive',
    description:
      'Le résolveur interroge tour à tour la racine, le TLD puis le serveur autoritaire avant de renvoyer l’adresse IP au navigateur (et de la mettre en cache).',
    category: 'Infrastructure',
    tags: ['dns', 'résolution', 'récursif', 'résolveur', 'tld'],
    spec: dns,
  },
  {
    id: 'cicd',
    title: 'Pipeline CI/CD',
    description:
      'Du git push au déploiement : webhook, tests et build dans le runner, publication de l’image dans le registry, puis mise en production.',
    category: 'Infrastructure',
    tags: ['git', 'pipeline', 'docker', 'déploiement', 'ci/cd'],
    spec: cicd,
  },
  {
    id: 'raft',
    title: 'Consensus Raft — élection de leader',
    description:
      'Disposition circulaire : un candidat sollicite les votes des suiveurs, obtient la majorité, devient leader puis maintient son autorité par des battements de cœur.',
    category: 'Systèmes distribués',
    tags: ['consensus', 'élection', 'leader', 'quorum', 'raft'],
    spec: raft,
  },
  {
    id: 'messageQueue',
    title: 'File de messages (publish/subscribe)',
    description:
      'Un producteur publie un événement dans un broker, qui le distribue à plusieurs workers ; chacun traite puis accuse réception.',
    category: 'Temps réel',
    tags: ['pub/sub', 'broker', 'file', 'asynchrone', 'workers'],
    spec: messageQueue,
  },
  {
    id: 'cdn',
    title: 'Cache CDN — MISS puis HIT',
    description:
      'La même ressource demandée deux fois : premier appel en cache MISS (aller jusqu’à l’origine), second en cache HIT servi immédiatement depuis le bord.',
    category: 'Web & API',
    tags: ['cache', 'edge', 'latence', 'hit', 'miss', 'cdn'],
    spec: cdn,
  },
  {
    id: 'loadBalancer',
    title: 'Répartiteur de charge (round-robin)',
    description:
      'Trois requêtes successives distribuées chacune à un backend différent ; la quatrième reboucle sur le premier.',
    category: 'Web & API',
    tags: ['répartiteur', 'round-robin', 'backend', 'scalabilité', 'nginx'],
    spec: loadBalancer,
  },
  {
    id: 'kubernetes',
    title: 'Déploiement Kubernetes',
    description:
      'De kubectl apply au pod Running : l’API Server persiste l’état désiré dans etcd, le scheduler choisit un nœud, le kubelet lance le conteneur.',
    category: 'Infrastructure',
    tags: ['k8s', 'pod', 'scheduler', 'conteneur', 'orchestration'],
    spec: kubernetes,
  },
  {
    id: 'payment',
    title: 'Paiement en ligne (3-D Secure)',
    description:
      'Intention de paiement, autorisation bancaire avec authentification forte, puis confirmation asynchrone de la boutique par webhook.',
    category: 'Web & API',
    tags: ['stripe', '3d secure', 'webhook', 'banque', 'e-commerce'],
    spec: payment,
  },
  {
    id: 'blockchain',
    title: 'Transaction blockchain',
    description:
      'Une transaction signée rejoint le mempool, plusieurs mineurs cherchent le nonce, l’un forge le bloc et le propage au réseau.',
    category: 'Systèmes distribués',
    tags: ['transaction', 'mempool', 'minage', 'preuve de travail', 'bitcoin'],
    spec: blockchain,
  },
  {
    id: 'smtp',
    title: 'Acheminement d’un courriel',
    description:
      'Du client d’Alice à la boîte de Bob : envoi SMTP, résolution de l’enregistrement MX, relais entre serveurs de messagerie, puis relève IMAP.',
    category: 'Infrastructure',
    tags: ['email', 'courriel', 'mx', 'imap', 'smtp', 'messagerie'],
    spec: smtp,
  },
  {
    id: 'graphql',
    title: 'Passerelle GraphQL fédérée',
    description:
      'Une requête unique éclatée par la gateway vers plusieurs sous-graphes, dont les réponses sont recomposées en un seul objet.',
    category: 'Web & API',
    tags: ['graphql', 'gateway', 'fédération', 'sous-graphe', 'requête'],
    spec: graphql,
  },
  {
    id: 'webhook',
    title: 'Webhook avec ré-essais (back-off)',
    description:
      'La livraison échoue deux fois (récepteur indisponible) puis réussit ; les temps morts entre tentatives matérialisent le back-off exponentiel.',
    category: 'Temps réel',
    tags: ['webhook', 'back-off', 'ré-essai', 'livraison', 'événement'],
    spec: webhook,
  },
  {
    id: 'circular',
    title: 'Orchestration circulaire',
    description:
      'Disposition circulaire : un orchestrateur central distribue une commande aux services satellites puis agrège leurs confirmations.',
    category: 'Concepts moteur',
    tags: ['disposition', 'circulaire', 'orchestrateur', 'layout', 'fan-out'],
    spec: circular,
  },
  {
    id: 'collision',
    title: 'Anti-collision (voies parallèles)',
    description:
      'Le segment App ↔ BD est emprunté dans les deux sens en même temps : le moteur décale automatiquement les trajets sur des voies parallèles.',
    category: 'Concepts moteur',
    tags: ['anti-collision', 'voies parallèles', 'décalage', 'connexions'],
    spec: collision,
  },
];

export const demosById = Object.fromEntries(demos.map((d) => [d.id, d]));
