import type { DataFlowSpec } from 'react-dataflow-animator';
import type { Locale } from '../i18n';
import { signalr } from './demos/signalr';
import { microservices } from './demos/microservices';
import { spa } from './demos/spa';
import { clientServer } from './demos/clientServer';
import { crypto } from './demos/crypto';
import { tls } from './demos/tls';
import { oauth } from './demos/oauth';
import { dos } from './demos/dos';
import { ddos } from './demos/ddos';
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
import { pushNotifications } from './demos/pushNotifications';

/** Clé de catégorie (stable, indépendante de la langue). Les libellés affichés
 * sont traduits via le dictionnaire (`gallery.categories`). */
export type DemoCategory =
  | 'web-api'
  | 'realtime'
  | 'security'
  | 'infrastructure'
  | 'distributed'
  | 'engine';

/** Ordre d'affichage des catégories dans le filtre de la galerie. */
export const demoCategories: DemoCategory[] = [
  'web-api',
  'realtime',
  'security',
  'infrastructure',
  'distributed',
  'engine',
];

/** Valeur localisée : `fr` est obligatoire (source) ; `en` est optionnel et
 * sert de traduction, avec repli sur `fr` tant qu'il manque. */
type Localized<T> = { fr: T; en?: T };

export function pickLocale<T>(value: Localized<T>, locale: Locale): T {
  return value[locale] ?? value.fr;
}

/** Une spec peut être un objet (pas encore traduit → FR dans les deux langues)
 * ou un builder qui rend la version localisée. */
type LocalizedSpec = DataFlowSpec | ((locale: Locale) => DataFlowSpec);

export function getSpec(demo: Demo, locale: Locale): DataFlowSpec {
  return typeof demo.spec === 'function' ? demo.spec(locale) : demo.spec;
}

export interface Demo {
  id: string;
  title: Localized<string>;
  description: Localized<string>;
  /** Catégorie de classement (filtre de la galerie). */
  category: DemoCategory;
  /** Mots-clés libres, indexés par la recherche textuelle de la galerie. */
  tags?: Localized<string[]>;
  spec: LocalizedSpec;
}

export const demos: Demo[] = [
  {
    id: 'clientServer',
    title: { fr: 'Client-Serveur', en: 'Client-Server' },
    description: {
      fr: 'Architecture client serveur',
      en: 'Client-server architecture',
    },
    category: 'web-api',
    tags: {
      fr: ['http', 'rest', 'sql', 'navigateur', 'base de données'],
      en: ['http', 'rest', 'sql', 'browser', 'database'],
    },
    spec: clientServer,
  },
  {
    id: 'signalr',
    title: {
      fr: 'Temps réel full-duplex (SignalR)',
      en: 'Full-duplex real-time (SignalR)',
    },
    description: {
      fr: 'Connexion WebSocket persistante : on voit le code client et le code du hub, puis un SendAll qui diffuse le message à tous les clients connectés.',
      en: 'Persistent WebSocket connection: we see the client code and the hub code, then a SendAll broadcasting the message to all connected clients.',
    },
    category: 'realtime',
    tags: {
      fr: ['websocket', 'hub', 'diffusion', 'full-duplex', 'signalr'],
      en: ['websocket', 'hub', 'broadcast', 'full-duplex', 'signalr'],
    },
    spec: signalr,
  },
  {
    id: 'microservices',
    title: {
      fr: 'Microservices derrière un proxy Nginx',
      en: 'Microservices behind an Nginx proxy',
    },
    description: {
      fr: 'Auth et Données derrière Nginx, chacun avec sa base : authentification (JWT) puis requête de données.',
      en: 'Auth and Data behind Nginx, each with its database: authentication (JWT) then data request.',
    },
    category: 'infrastructure',
    tags: {
      fr: ['nginx', 'jwt', 'proxy', 'auth', 'microservices'],
      en: ['nginx', 'jwt', 'proxy', 'auth', 'microservices'],
    },
    spec: microservices,
  },
  {
    id: 'spa',
    title: {
      fr: 'Chargement d’une SPA puis appels API',
      en: 'SPA loading then API calls',
    },
    description: {
      fr: 'Le navigateur charge le bundle depuis le serveur web, puis la SPA interroge le Web API et sa base.',
      en: 'The browser loads the bundle from the web server, then the SPA queries the Web API and its database.',
    },
    category: 'web-api',
    tags: {
      fr: ['react', 'bundle', 'api', 'single-page', 'navigateur'],
      en: ['react', 'bundle', 'api', 'single-page', 'browser'],
    },
    spec: spa,
  },
  {
    id: 'crypto',
    title: {
      fr: 'Cryptographie : Alice, Bob & Ève',
      en: 'Cryptography: Alice, Bob & Eve',
    },
    description: {
      fr: 'Échange de clés Diffie-Hellman sur un canal public écouté par Ève : elle voit passer les valeurs publiques mais ne peut pas reconstituer la clé partagée.',
      en: 'Diffie-Hellman key exchange on a public channel eavesdropped by Eve: she sees the public values pass by but cannot reconstruct the shared key.',
    },
    category: 'security',
    tags: {
      fr: [
        'diffie-hellman',
        'chiffrement',
        'mitm',
        'alice',
        'bob',
        'ève',
        'clé',
      ],
      en: [
        'diffie-hellman',
        'encryption',
        'mitm',
        'alice',
        'bob',
        'eve',
        'key',
      ],
    },
    spec: crypto,
  },
  {
    id: 'tls',
    title: { fr: 'Poignée de main TLS 1.3', en: 'TLS 1.3 handshake' },
    description: {
      fr: 'ClientHello / ServerHello, validation du certificat, dérivation de la clé de session, puis bascule en canal chiffré pour les données applicatives.',
      en: 'ClientHello / ServerHello, certificate validation, session key derivation, then switch to encrypted channel for application data.',
    },
    category: 'security',
    tags: {
      fr: ['https', 'handshake', 'certificat', 'chiffrement', 'tls'],
      en: ['https', 'handshake', 'certificate', 'encryption', 'tls'],
    },
    spec: tls,
  },
  {
    id: 'oauth',
    title: {
      fr: 'OAuth 2.0 — Authorization Code',
      en: 'OAuth 2.0 — Authorization Code',
    },
    description: {
      fr: 'Connexion déléguée : redirection vers le serveur d’autorisation, code à usage unique, échange contre un jeton sur le canal arrière, puis appel de l’API.',
      en: 'Delegated login: redirection to the authorization server, single-use code, exchange for a token on the back channel, then API call.',
    },
    category: 'security',
    tags: {
      fr: ['oauth2', 'oidc', 'jeton', 'authentification', 'sso'],
      en: ['oauth2', 'oidc', 'token', 'authentication', 'sso'],
    },
    spec: oauth,
  },
  {
    id: 'dos',
    title: {
      fr: 'Attaque par déni de service (DoS)',
      en: 'Denial-of-service attack (DoS)',
    },
    description: {
      fr: 'Une seule machine inonde le serveur de requêtes jusqu’à le saturer ; l’utilisateur légitime est alors privé de service. Comme tout vient d’une IP unique, l’attaque reste blocable.',
      en: 'A single machine floods the server with requests until it saturates; the legitimate user is then denied service. Since everything comes from one IP, the attack stays blockable.',
    },
    category: 'security',
    tags: {
      fr: ['dos', 'flood', 'saturation', 'déni de service', 'attaque'],
      en: ['dos', 'flood', 'saturation', 'denial of service', 'attack'],
    },
    spec: dos,
  },
  {
    id: 'ddos',
    title: {
      fr: 'Attaque par déni de service distribué (DDoS)',
      en: 'Distributed denial-of-service attack (DDoS)',
    },
    description: {
      fr: 'Un serveur de commande (C&C) ordonne à un botnet d’attaquer : tous les bots inondent la cible simultanément. Le trafic venant de milliers d’IP, on ne peut pas simplement bloquer une adresse.',
      en: 'A command-and-control server (C&C) orders a botnet to attack: every bot floods the target simultaneously. With traffic coming from thousands of IPs, you cannot just block one address.',
    },
    category: 'security',
    tags: {
      fr: ['ddos', 'botnet', 'flood', 'c&c', 'déni de service', 'attaque'],
      en: ['ddos', 'botnet', 'flood', 'c&c', 'denial of service', 'attack'],
    },
    spec: ddos,
  },
  {
    id: 'dns',
    title: { fr: 'Résolution DNS récursive', en: 'Recursive DNS resolution' },
    description: {
      fr: 'Le résolveur interroge tour à tour la racine, le TLD puis le serveur autoritaire avant de renvoyer l’adresse IP au navigateur (et de la mettre en cache).',
      en: 'The resolver queries the root, the TLD and then the authoritative server in turn before returning the IP address to the browser (and caching it).',
    },
    category: 'infrastructure',
    tags: {
      fr: ['dns', 'résolution', 'récursif', 'résolveur', 'tld'],
      en: ['dns', 'resolution', 'recursive', 'resolver', 'tld'],
    },
    spec: dns,
  },
  {
    id: 'cicd',
    title: { fr: 'Pipeline CI/CD', en: 'CI/CD pipeline' },
    description: {
      fr: 'Du git push au déploiement : webhook, tests et build dans le runner, publication de l’image dans le registry, puis mise en production.',
      en: 'From git push to deployment: webhook, tests and build in the runner, publishing the image to the registry, then deploying to production.',
    },
    category: 'infrastructure',
    tags: {
      fr: ['git', 'pipeline', 'docker', 'déploiement', 'ci/cd'],
      en: ['git', 'pipeline', 'docker', 'deployment', 'ci/cd'],
    },
    spec: cicd,
  },
  {
    id: 'raft',
    title: {
      fr: 'Consensus Raft — élection de leader',
      en: 'Raft consensus — leader election',
    },
    description: {
      fr: 'Disposition circulaire : un candidat sollicite les votes des suiveurs, obtient la majorité, devient leader puis maintient son autorité par des battements de cœur.',
      en: 'Circular layout: a candidate requests votes from followers, gets the majority, becomes leader then maintains authority via heartbeats.',
    },
    category: 'distributed',
    tags: {
      fr: ['consensus', 'élection', 'leader', 'quorum', 'raft'],
      en: ['consensus', 'election', 'leader', 'quorum', 'raft'],
    },
    spec: raft,
  },
  {
    id: 'messageQueue',
    title: {
      fr: 'File de messages (publish/subscribe)',
      en: 'Message queue (publish/subscribe)',
    },
    description: {
      fr: 'Un producteur publie un événement dans un broker, qui le distribue à plusieurs workers ; chacun traite puis accuse réception.',
      en: 'A producer publishes an event in a broker, which distributes it to multiple workers; each processes then acknowledges.',
    },
    category: 'realtime',
    tags: {
      fr: ['pub/sub', 'broker', 'file', 'asynchrone', 'workers'],
      en: ['pub/sub', 'broker', 'queue', 'asynchronous', 'workers'],
    },
    spec: messageQueue,
  },
  {
    id: 'cdn',
    title: { fr: 'Cache CDN — MISS puis HIT', en: 'CDN cache — MISS then HIT' },
    description: {
      fr: 'La même ressource demandée deux fois : premier appel en cache MISS (aller jusqu’à l’origine), second en cache HIT servi immédiatement depuis le bord.',
      en: 'The same resource requested twice: first call is a cache MISS (goes to origin), second is a cache HIT served immediately from the edge.',
    },
    category: 'web-api',
    tags: {
      fr: ['cache', 'edge', 'latence', 'hit', 'miss', 'cdn'],
      en: ['cache', 'edge', 'latency', 'hit', 'miss', 'cdn'],
    },
    spec: cdn,
  },
  {
    id: 'loadBalancer',
    title: {
      fr: 'Répartiteur de charge (round-robin)',
      en: 'Load balancer (round-robin)',
    },
    description: {
      fr: 'Trois requêtes successives distribuées chacune à un backend différent ; la quatrième reboucle sur le premier.',
      en: 'Three successive requests distributed to different backends; the fourth loops back to the first.',
    },
    category: 'web-api',
    tags: {
      fr: ['répartiteur', 'round-robin', 'backend', 'scalabilité', 'nginx'],
      en: ['load balancer', 'round-robin', 'backend', 'scalability', 'nginx'],
    },
    spec: loadBalancer,
  },
  {
    id: 'kubernetes',
    title: { fr: 'Déploiement Kubernetes', en: 'Kubernetes deployment' },
    description: {
      fr: 'De kubectl apply au pod Running : l’API Server persiste l’état désiré dans etcd, le scheduler choisit un nœud, le kubelet lance le conteneur.',
      en: 'From kubectl apply to Running pod: the API Server persists the desired state in etcd, the scheduler picks a node, the kubelet starts the container.',
    },
    category: 'infrastructure',
    tags: {
      fr: ['k8s', 'pod', 'scheduler', 'conteneur', 'orchestration'],
      en: ['k8s', 'pod', 'scheduler', 'container', 'orchestration'],
    },
    spec: kubernetes,
  },
  {
    id: 'payment',
    title: {
      fr: 'Paiement en ligne (3-D Secure)',
      en: 'Online payment (3-D Secure)',
    },
    description: {
      fr: 'Intention de paiement, autorisation bancaire avec authentification forte, puis confirmation asynchrone de la boutique par webhook.',
      en: 'Payment intent, bank authorization with strong authentication, then asynchronous shop confirmation via webhook.',
    },
    category: 'web-api',
    tags: {
      fr: ['stripe', '3d secure', 'webhook', 'banque', 'e-commerce'],
      en: ['stripe', '3d secure', 'webhook', 'bank', 'e-commerce'],
    },
    spec: payment,
  },
  {
    id: 'blockchain',
    title: { fr: 'Transaction blockchain', en: 'Blockchain transaction' },
    description: {
      fr: 'Une transaction signée rejoint le mempool, plusieurs mineurs cherchent le nonce, l’un forge le bloc et le propage au réseau.',
      en: 'A signed transaction joins the mempool, multiple miners search for the nonce, one forges the block and propagates it to the network.',
    },
    category: 'distributed',
    tags: {
      fr: ['transaction', 'mempool', 'minage', 'preuve de travail', 'bitcoin'],
      en: ['transaction', 'mempool', 'mining', 'proof of work', 'bitcoin'],
    },
    spec: blockchain,
  },
  {
    id: 'smtp',
    title: { fr: 'Acheminement d’un courriel', en: 'Email routing' },
    description: {
      fr: 'Du client d’Alice à la boîte de Bob : envoi SMTP, résolution de l’enregistrement MX, relais entre serveurs de messagerie, puis relève IMAP.',
      en: "From Alice's client to Bob's inbox: SMTP dispatch, MX record resolution, relay between mail servers, then IMAP retrieval.",
    },
    category: 'infrastructure',
    tags: {
      fr: ['email', 'courriel', 'mx', 'imap', 'smtp', 'messagerie'],
      en: ['email', 'mail', 'mx', 'imap', 'smtp', 'messaging'],
    },
    spec: smtp,
  },
  {
    id: 'graphql',
    title: {
      fr: 'Passerelle GraphQL fédérée',
      en: 'Federated GraphQL gateway',
    },
    description: {
      fr: 'Une requête unique éclatée par la gateway vers plusieurs sous-graphes, dont les réponses sont recomposées en un seul objet.',
      en: 'A single request split by the gateway to multiple subgraphs, whose responses are recomposed into a single object.',
    },
    category: 'web-api',
    tags: {
      fr: ['graphql', 'gateway', 'fédération', 'sous-graphe', 'requête'],
      en: ['graphql', 'gateway', 'federation', 'subgraph', 'request'],
    },
    spec: graphql,
  },
  {
    id: 'webhook',
    title: {
      fr: 'Webhook avec ré-essais (back-off)',
      en: 'Webhook with retries (back-off)',
    },
    description: {
      fr: 'La livraison échoue deux fois (récepteur indisponible) puis réussit ; les temps morts entre tentatives matérialisent le back-off exponentiel.',
      en: 'Delivery fails twice (receiver unavailable) then succeeds; the dead times between attempts materialize the exponential back-off.',
    },
    category: 'realtime',
    tags: {
      fr: ['webhook', 'back-off', 'ré-essai', 'livraison', 'événement'],
      en: ['webhook', 'back-off', 'retry', 'delivery', 'event'],
    },
    spec: webhook,
  },
  {
    id: 'circular',
    title: { fr: 'Orchestration circulaire', en: 'Circular orchestration' },
    description: {
      fr: 'Disposition circulaire : un orchestrateur central distribue une commande aux services satellites puis agrège leurs confirmations.',
      en: 'Circular layout: a central orchestrator distributes a command to satellite services then aggregates their confirmations.',
    },
    category: 'engine',
    tags: {
      fr: ['disposition', 'circulaire', 'orchestrateur', 'layout', 'fan-out'],
      en: ['layout', 'circular', 'orchestrator', 'layout', 'fan-out'],
    },
    spec: circular,
  },
  {
    id: 'collision',
    title: {
      fr: 'Anti-collision (voies parallèles)',
      en: 'Anti-collision (parallel lanes)',
    },
    description: {
      fr: 'Le segment App ↔ BD est emprunté dans les deux sens en même temps : le moteur décale automatiquement les trajets sur des voies parallèles.',
      en: 'The App ↔ DB segment is used in both directions simultaneously: the engine automatically offsets the paths into parallel lanes.',
    },
    category: 'engine',
    tags: {
      fr: ['anti-collision', 'voies parallèles', 'décalage', 'connexions'],
      en: ['anti-collision', 'parallel lanes', 'offset', 'connections'],
    },
    spec: collision,
  },
  {
    id: 'pushNotifications',
    title: { fr: 'Notifications push (FCM)', en: 'Push notifications (FCM)' },
    description: {
      fr: "Cycle de vie complet d'une notification push : comment l'appareil d'Alice fait connaître son adresse de livraison (le token FCM), puis comment un message envoyé par Bob est acheminé jusqu'à elle, même si son application est fermée.",
      en: "Full lifecycle of a push notification: how Alice's device registers its delivery address (the FCM token), then how a message sent by Bob is routed to her, even if her app is closed.",
    },
    category: 'realtime',
    tags: {
      fr: ['push', 'notification', 'fcm', 'firebase', 'mobile'],
      en: ['push', 'notification', 'fcm', 'firebase', 'mobile'],
    },
    spec: pushNotifications,
  },
];

export const demosById: Record<string, Demo> = Object.fromEntries(
  demos.map((d) => [d.id, d])
);
