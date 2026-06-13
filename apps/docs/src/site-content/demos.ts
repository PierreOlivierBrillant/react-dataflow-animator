import type { DataFlowSpec } from 'react-dataflow-animator';
import { signalr } from './demos/signalr';
import { microservices } from './demos/microservices';
import { spa } from './demos/spa';
import { clientServer } from './demos/clientServer';

export interface Demo {
  id: string;
  title: string;
  description: string;
  spec: DataFlowSpec;
}

export const demos: Demo[] = [
  {
    id: 'clientServer',
    title: 'Client-Serveur',
    description: 'Architecture client serveur',
    spec: clientServer,
  },
  {
    id: 'signalr',
    title: 'Temps réel full-duplex (SignalR)',
    description:
      'Connexion WebSocket persistante : on voit le code client et le code du hub, puis un SendAll qui diffuse le message à tous les clients connectés.',
    spec: signalr,
  },
  {
    id: 'microservices',
    title: 'Microservices derrière un proxy Nginx',
    description:
      'Auth et Données derrière Nginx, chacun avec sa base : authentification (JWT) puis requête de données.',
    spec: microservices,
  },
  {
    id: 'spa',
    title: 'Chargement d’une SPA puis appels API',
    description:
      'Le navigateur charge le bundle depuis le serveur web, puis la SPA interroge le Web API et sa base.',
    spec: spa,
  },
];

export const demosById = Object.fromEntries(demos.map((d) => [d.id, d]));
