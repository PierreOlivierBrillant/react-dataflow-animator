# React DataFlow Animator Monorepo

[![CI](https://github.com/PierreOlivierBrillant/react-dataflow-animator/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/PierreOlivierBrillant/react-dataflow-animator/actions/workflows/ci-cd.yml)
[![npm version](https://img.shields.io/npm/v/react-dataflow-animator.svg)](https://www.npmjs.com/package/react-dataflow-animator)
[![npm downloads](https://img.shields.io/npm/dm/react-dataflow-animator.svg)](https://www.npmjs.com/package/react-dataflow-animator)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-dataflow-animator)](https://bundlephobia.com/package/react-dataflow-animator)
[![license](https://img.shields.io/npm/l/react-dataflow-animator.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-%3E%3D18-61dafb)](https://react.dev/)

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
