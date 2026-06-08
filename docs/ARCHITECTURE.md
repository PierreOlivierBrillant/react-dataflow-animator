# Architecture

Référence interne pour le développement et l'extension de la librairie.
Voir aussi [SPEC.md](./SPEC.md) (spécification fonctionnelle).

## Décisions clés

1. **Moteur déterministe maison (pas de GSAP).** Cœur = fonction pure
   `evaluate(timeline, t)`. Avantages : seek/étapes/cycle de vie maîtrisés,
   tests sans DOM, bundle léger, SSR-safe.
2. **Séparation compilateur → IR → runtime.** `compile(spec)` produit une
   `Timeline` (clips datés + étapes + durée), indépendante du DOM. Le rendu résout
   la géométrie à partir des mesures réelles au moment du rendu.
3. **CSS scopée** (`.rdfa-`) + variables CSS, compilée en `dist/style.css`. Aucun
   framework CSS imposé au consommateur (bon pour Docusaurus).
4. **Paquet unique** : `src/lib/` (npm) + `src/demo/` (site vitrine). `vite.config.ts`
   = build lib ; `vite.demo.config.ts` = build site ; `dev` sert le site.
5. **SSR-safe** : aucun accès DOM pendant le rendu (mesure/horloge dans des effets).
6. **Registres extensibles** (icônes nœuds, sous-icônes, highlighter).

## Pipeline de rendu

```
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

## Carte des modules (`src/lib/`)

| Fichier | Rôle |
|---|---|
| `index.ts` | Exports publics |
| `types.ts` | Types de la spec + props |
| `schema.ts` | JSON Schema (alimente la doc API) |
| `DataFlowPlayer.tsx` | Composant racine (compile + horloge + plein écran + thème) |
| `engine/timeline.ts` | IR + `evaluate` (pur) + helpers d'étapes |
| `engine/compiler.ts` | `spec.actions` → `Timeline` (parallel/wait_for/lifecycle/anti-collision) |
| `engine/layout.ts` | Placement des nœuds (linéaire par lanes, circular) |
| `engine/geometry.ts` | Points de connexion + path shifting |
| `hooks/useClock.ts` | Horloge rAF (play/pause/seek/playTo) |
| `hooks/useStageGeometry.ts` | Mesure des nœuds + ResizeObserver |
| `highlight/highlight.ts` | Wrapper Prism (remplaçable) |
| `components/…` | Rendu : `Stage`, `Controls`, nœuds, dynamiques (`Packet`, `ArrowLine`, `ContentPanel`) |
| `styles/dataflow.css` | Styles scopés `.rdfa-` |

## Ajouter une nouvelle composante

**Nouveau type d'action** (ex: `highlight_node`) :
1. Ajouter le type dans `types.ts` (`ActionType`) et l'enum dans `schema.ts`.
2. Ajouter une variante de clip dans `engine/timeline.ts` (union `Clip`) + son défaut
   de `keep_until_next` et sa durée dans `engine/compiler.ts`, et un `case` dans
   `compileAction`.
3. Rendre le clip dans `components/Stage.tsx` (filtre `active` sur le `kind`).
4. Styles `.rdfa-…` dans `styles/dataflow.css`. Test dans `engine/compiler.test.ts`.

**Nouveau type de nœud / sous-icône** : `registerNodeIcon(type, svg)` /
`registerSubIcon(name, svg)`, ou enrichir `nodeIcons.tsx` / `subIcons.tsx`.

## Build & publication

- `npm run build` : `tsc -b` (typecheck) + `vite build` (ESM + `style.css`) +
  `tsc -p tsconfig.dts.json` (déclarations `.d.ts`).
- `dist/` contient `index.js`, `index.d.ts`, `style.css` (champ `exports`).
- `react`/`react-dom` en `peerDependencies` (externalisés du bundle).
- `npm run build:demo` : site GitHub Pages dans `dist-demo/` (CI `.github/workflows`).
