# React DataFlow Animator

Composant React qui compile une **spécification JSON** en une **animation
déterministe et navigable** de flux de données (client / serveur / SQL…).
Pensé pour illustrer des architectures dans des cours et de la documentation
(Docusaurus & co.).

- 🎬 Lecteur intégré : lecture/pause, navigation par étapes, timeline cliquable, plein écran
- 🧭 Placement automatique des nœuds (grilles linéaires ou disposition circulaire), **sans coordonnées**
- ↔️ Anti-collision : voies parallèles automatiques pour les trajets bidirectionnels
- ⏱️ Moteur déterministe (fonction pure du temps) → seek et SSR fiables, **zéro GSAP**
- 🎨 Styles scopés + thèmes clair/sombre ; coloration syntaxique (Prism) remplaçable

## Installation

```bash
npm install react-dataflow-animator
```

`react` et `react-dom` (≥ 18) sont des *peer dependencies*.

## Utilisation

```tsx
import { DataFlowPlayer } from 'react-dataflow-animator';
import 'react-dataflow-animator/styles.css';

const spec = {
  direction: 'left-to-right',
  static_objects: [
    { id: 'client', object_type: 'laptop', text: 'Navigateur', lane: 1 },
    { id: 'api', object_type: 'server', text: 'API', subicon: 'node', lane: 2 },
    { id: 'db', object_type: 'database', text: 'PostgreSQL', subicon: 'postgres', lane: 3 },
  ],
  dynamic_objects: [
    { id: 'req', object_type: 'http_packet', packet_content: { header: 'GET /users' } },
    { id: 'sql', object_type: 'sql_request', request_content: 'SELECT * FROM users' },
  ],
  actions: [
    { action_type: 'move', object: 'req', from: 'client', to: 'api' },
    { action_type: 'move', object: 'sql', from: 'api', to: 'db' },
    { action_type: 'loading', object: 'db', duration: 800 },
  ],
};

export default () => <DataFlowPlayer spec={spec} />;
```

## Docusaurus

Le composant est **SSR-safe** : il s'hydrate sans divergence et s'utilise
directement dans un fichier `.mdx`. Importez le CSS une seule fois, par exemple dans
`src/css/custom.css` :

```css
@import 'react-dataflow-animator/styles.css';
```

## Props principales

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `spec` | `DataFlowSpec` | — | La spécification à animer (**requis**) |
| `height` | `number \| string` | `420` | Hauteur de la scène |
| `autoPlay` | `boolean` | `false` | Démarre la lecture automatiquement |
| `loop` | `boolean` | `false` | Rejoue en boucle |
| `controls` | `boolean` | `true` | Affiche les contrôles de navigation |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Thème visuel |
| `speed` | `number` | `1` | Vitesse de lecture |
| `debug` | `boolean` | `false` | Overlay de débogage de la timeline |
| `highlight` | `(code, lang) => string` | Prism | Coloration syntaxique personnalisée |

La structure complète de `spec` est documentée par le **JSON Schema** exporté
(`dataFlowSchema`) et dans [`docs/SPEC.md`](./docs/SPEC.md).

## Développement

```bash
npm run dev        # site de démonstration (http://localhost:5173)
npm run test       # tests du moteur (Vitest)
npm run lint       # ESLint
npm run build      # build de la librairie (dist/)
npm run build:demo # build du site vitrine (dist-demo/)
```

## Licence

MIT
