# Architecture

Référence interne pour le développement et l'extension de la librairie.
Voir aussi [SPEC.md](./SPEC.md) (spécification fonctionnelle).

## Décisions clés

1. **Moteur déterministe maison (pas de GSAP).** Cœur = fonction pure
   `evaluate(timeline, t)`. Avantages : seek / étapes / cycle de vie
   maîtrisés, tests sans DOM, bundle léger, SSR-safe.
2. **Séparation compilateur → IR → runtime.** `compile(spec)` produit une
   `Timeline` (clips datés + étapes + durée), indépendante du DOM. Le rendu
   résout la géométrie à partir des mesures réelles au moment du rendu.
3. **Monorepo npm workspaces.** La librairie publiée (`packages/react-dataflow-animator`)
   est isolée du site de documentation (`apps/docs`). Le site consomme la
   lib comme une dépendance workspace.
4. **CSS scopée** (`.rdfa-`) + variables CSS, compilée en `dist/style.css`.
   Aucun framework CSS imposé au consommateur.
5. **SSR-safe** : aucun accès DOM pendant le rendu (mesure et horloge dans
   des effets).
6. **Registres extensibles** (icônes nœuds, sous-icônes, highlighter).

## Pipeline de rendu

```text
spec ──compile()──▶ Timeline (clips, steps, durationMs)   [pur, sans DOM]
                          │
useClock (rAF) ──▶ t ─────┤
                          ▼
            Stage: evaluate(timeline, t) ──▶ clips actifs (+ progress)
                          │
   layout (ratios CSS) + geometry (BoundingClientRect mesurés)
                          ▼
        nœuds / flèches / paquets / spinners / contenus / commentaires
```

## Structure du monorepo

```text
packages/
  react-dataflow-animator/          le package npm publié
    src/
      DataFlowPlayer.tsx            composant racine
      index.ts                      exports publics
      types.ts                      types TS de la spec et des props
      schema.ts                     JSON Schema (alimente la doc API)
      engine/
        compiler.ts                 spec.actions → Timeline
        timeline.ts                 IR + evaluate (pur) + navigation
        layout.ts                   placement des nœuds (lanes / circular)
        geometry.ts                 points de connexion + routage
      hooks/
        useClock.ts                 horloge rAF (play/pause/seek/playTo)
        useStageGeometry.ts         mesure DOM + ResizeObserver
      highlight/
        highlight.ts                wrapper Prism (remplaçable)
      components/
        Stage.tsx                   orchestration du rendu
        Controls.tsx                barre de contrôles
        nodes/                      StaticNode + registres d'icônes
        dynamic/                    Packet, ArrowLine, ContentPanel
      styles/
        dataflow.css                styles scopés .rdfa-
apps/
  docs/                             site Docusaurus
    docs/                           contenu MDX (intro, concepts, reference)
    src/                            composants React du site
      site-content/demos/           démos importables dans la lib
docs/
  SPEC.md, ARCHITECTURE.md          références internes
```

## Ajouter une nouvelle composante

### Nouveau type d'action

1. Ajouter le type dans `types.ts` (`ActionType`) et l'enum dans `schema.ts`.
2. Ajouter une variante de clip dans `engine/timeline.ts` (union `Clip`)
   avec son défaut de `keep_until_next` et sa durée par défaut dans
   `engine/compiler.ts`, et un `case` dans `compileAction`.
3. Rendre le clip dans `components/Stage.tsx` (filtre `active` sur le `kind`).
4. Styles `.rdfa-…` dans `styles/dataflow.css`. Test dans
   `engine/compiler.test.ts`.

### Nouveau type de nœud ou nouvelle sous-icône

- `registerNodeIcon(type, svg)` / `registerSubIcon(name, svg)` à
  l'exécution ;
- ou enrichir `nodeIcons.tsx` / `subIcons.tsx` directement dans la lib.

## Build et publication

Tout part de la racine via npm workspaces :

```bash
npm run build       # build complet (lib puis site)
npm run build:lib   # uniquement le package npm
npm run build:docs  # uniquement le site
```

Le build du package :

- `tsc -b` : typecheck ;
- `vite build` : bundle ESM + `style.css` ;
- `tsc -p tsconfig.dts.json` : déclarations `.d.ts`.

Résultat dans `packages/react-dataflow-animator/dist/` : `index.js`,
`index.d.ts`, `style.css`. Le champ `exports` du `package.json` les expose
sous `react-dataflow-animator` et `react-dataflow-animator/styles.css`.

`react` et `react-dom` sont en `peerDependencies` (externalisés du bundle).

## Tests et qualité

| Commande (racine) | Effet |
| --- | --- |
| `npm run lint` | Lint des workspaces qui exposent un script lint |
| `npm run format:check` | Vérifie le formatage Prettier |
| `npm run format:write` | Applique Prettier |
| `npm test` | Tests vitest de la lib |
| `npm run test:coverage` | Tests + rapport de couverture |
| `npm run deadcode` | knip — détection de code mort |
| `npm run build` | Build complet (lib + docs) |

Côté package, deux configurations vitest cohabitent : `vitest.config.ts`
(unitaires, sous `src/**/*.test.{ts,tsx}`) et `vitest.integration.config.ts`
(tests d'intégration sur les démos).

## Déploiement

`.github/workflows/ci-cd.yml` lint + teste sur chaque push / PR, puis
build et déploie le site Docusaurus sur GitHub Pages sur la branche `main`.
La publication npm de la lib reste manuelle.
