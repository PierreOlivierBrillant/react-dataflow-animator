# React DataFlow Animator Monorepo

Le dépôt est maintenant structuré en **monorepo npm workspaces** pour séparer la librairie publiée et le site Docusaurus.

## Structure

```text
apps/
  docs/                          site Docusaurus (inclut demos/playground/référence API)
packages/
  react-dataflow-animator/       package npm publié
```

## Commandes racine

```bash
npm install
npm run dev        # build la librairie puis lance Docusaurus
npm run build      # build complet du package et du site
npm run test       # tests de la librairie
npm run lint       # lint des workspaces qui exposent un script lint
```

## Package publié

Le package publié reste `react-dataflow-animator` et vit désormais dans [packages/react-dataflow-animator](./packages/react-dataflow-animator).

```tsx
import { DataFlowPlayer } from 'react-dataflow-animator';
import 'react-dataflow-animator/styles.css';

export default function Example() {
  return <DataFlowPlayer spec={spec} />;
}
```

Le composant reste SSR-safe et utilisable directement dans Docusaurus ou dans tout autre site React.

## Site Docusaurus

Le nouveau site vit dans [apps/docs](./apps/docs) et réutilise des briques extraites du site initial :

- catalogue de démos ;
- playground JSON interactif ;
- référence API dérivée du JSON Schema.

La documentation MDX et les contenus interactifs sont désormais centralisés directement dans le site Docusaurus.

## Licence

MIT
