# React DataFlow Animator

[![CI](https://github.com/PierreOlivierBrillant/react-dataflow-animator/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/PierreOlivierBrillant/react-dataflow-animator/actions/workflows/ci-cd.yml)
[![npm version](https://img.shields.io/npm/v/react-dataflow-animator.svg)](https://www.npmjs.com/package/react-dataflow-animator)
[![npm downloads](https://img.shields.io/npm/dm/react-dataflow-animator.svg)](https://www.npmjs.com/package/react-dataflow-animator)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-dataflow-animator)](https://bundlephobia.com/package/react-dataflow-animator)
[![license](https://img.shields.io/npm/l/react-dataflow-animator.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-%3E%3D18-61dafb)](https://react.dev/)

Composant React qui compile une spécification JSON en une animation déterministe
et navigable de flux de données (client/serveur, requêtes SQL, microservices…).

- Aucune coordonnée à fournir — le moteur place les nœuds.
- Lecteur intégré : lecture, pause, navigation par étapes, plein écran.
- SSR-safe, utilisable directement dans Docusaurus, Next.js, Vite, etc.
- Coloration syntaxique intégrée (Prism, remplaçable).

## Installation

```bash
npm install react-dataflow-animator
```

`react` et `react-dom` (≥ 18) sont attendus en `peerDependencies`.

## Utilisation

```tsx
import { DataFlowPlayer } from 'react-dataflow-animator';
import 'react-dataflow-animator/styles.css';

const spec = {
  direction: 'left-to-right',
  static_objects: [
    { id: 'browser', object_type: 'laptop', text: 'Navigateur', lane: 1 },
    { id: 'api', object_type: 'server', text: 'API', lane: 2 },
    { id: 'db', object_type: 'database', text: 'PostgreSQL', lane: 3 },
  ],
  dynamic_objects: [
    {
      id: 'req',
      object_type: 'http_packet',
      packet_content: { header: 'GET /users' },
    },
    {
      id: 'sql',
      object_type: 'sql_request',
      request_content: 'SELECT * FROM users',
    },
  ],
  actions: [
    { action_type: 'move', object: 'req', from: 'browser', to: 'api' },
    { action_type: 'move', object: 'sql', from: 'api', to: 'db' },
  ],
};

export default function Example() {
  return <DataFlowPlayer spec={spec} />;
}
```

## Concepts en une page

Une **spec** décrit trois choses :

1. **`static_objects`** — les nœuds du diagramme (serveurs, clients, bases…).
   Placement automatique selon `direction` (linéaire ou `circular`) et `lane`.
2. **`dynamic_objects`** — les payloads qui circuleront entre nœuds
   (paquets HTTP, requêtes/réponses SQL).
3. **`actions`** — la chronologie : `move`, `arrow`, `parallel`, `loading`,
   `set_content`, `comment`, `highlight`.

Le moteur compile la spec en une chronologie déterministe : le temps `t` (ms)
est l'unique source de vérité, ce qui rend le seek, la navigation par étapes
et le SSR triviaux.

## Props principales du `<DataFlowPlayer>`

| Prop        | Type                                       | Défaut          | Description                                           |
| ----------- | ------------------------------------------ | --------------- | ----------------------------------------------------- |
| `spec`      | `DataFlowSpec`                             | —               | La spécification à animer.                            |
| `height`    | `number \| string`                         | `420`           | Hauteur de la scène.                                  |
| `autoPlay`  | `boolean`                                  | `false`         | Démarre la lecture automatiquement.                   |
| `loop`      | `boolean`                                  | `false`         | Rejoue en boucle à la fin.                            |
| `controls`  | `boolean`                                  | `true`          | Affiche la barre de contrôles.                        |
| `theme`     | `'light' \| 'dark' \| 'auto'`              | `'auto'`        | Suit `prefers-color-scheme` et `[data-theme]` parent. |
| `density`   | `'compact' \| 'comfortable' \| 'spacious'` | `'comfortable'` | Échelle visuelle.                                     |
| `speed`     | `number`                                   | `1`             | Vitesse de lecture.                                   |
| `highlight` | `Highlighter`                              | Prism           | Remplacer la coloration syntaxique.                   |
| `debug`     | `boolean`                                  | `false`         | Overlay de debug de la timeline.                      |

## Extensibilité

```tsx
import { registerNodeIcon, registerSubIcon } from 'react-dataflow-animator';

registerNodeIcon('queue', <svg viewBox="0 0 24 24">{/* … */}</svg>);
registerSubIcon('kafka', <svg viewBox="0 0 24 24">{/* … */}</svg>);
```

Une sous-icône peut aussi être un **texte libre** (`'v2'`, `'API'`, `'JWT'`),
automatiquement rendu en pastille.

## Documentation

- **Site de documentation** (démos, playground interactif, référence API
  complète) — déployé depuis [`apps/docs`](./apps/docs).
- **Spécification fonctionnelle** : [`docs/SPEC.md`](./docs/SPEC.md).
- **Architecture interne** : [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
- **JSON Schema** : exposé via l'export `dataFlowSchema`.

## Structure du dépôt

Le projet est un monorepo npm workspaces :

```text
packages/
  react-dataflow-animator/   le package publié sur npm
apps/
  docs/                      site Docusaurus (démos, playground, doc API)
docs/
  SPEC.md, ARCHITECTURE.md   références internes
```

Pour contribuer ou exécuter localement : voir [`CLAUDE.md`](./CLAUDE.md)
(commandes qualité à exécuter avant chaque commit).

## Licence

[MIT](./LICENSE)
