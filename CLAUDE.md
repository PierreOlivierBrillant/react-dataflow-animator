# CLAUDE.md

Instructions pour Claude (et tout autre agent) travaillant sur ce dépôt.

## Le projet en bref

`react-dataflow-animator` est un composant React qui compile une
spécification JSON en animation déterministe et navigable de flux de données.
Le moteur est une fonction pure `evaluate(timeline, t)` : pas de DOM, pas
d'horloge réelle, scrubbing arrière gratuit.

Le dépôt est un **monorepo npm workspaces** :

```text
packages/react-dataflow-animator/   le package npm publié
apps/docs/                          site Docusaurus (démos, playground, doc API)
docs/                               SPEC.md, ARCHITECTURE.md (références internes)
```

## Documentation à consulter avant d'agir

Lis ces fichiers avant toute modification non triviale :

- [`README.md`](./README.md) — vue utilisateur de la lib.
- [`docs/SPEC.md`](./docs/SPEC.md) — spécification fonctionnelle (source de
  vérité sur les comportements attendus).
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — découpage des modules,
  pipeline de rendu, points d'extension.
- [`apps/docs/docs/`](./apps/docs/docs/) — documentation utilisateur MDX
  (concepts, références).
- [`packages/react-dataflow-animator/src/types.ts`](./packages/react-dataflow-animator/src/types.ts)
  et [`schema.ts`](./packages/react-dataflow-animator/src/schema.ts) — forme
  exacte de la spec.

## Règles dures avant chaque commit

**Tu DOIS exécuter cette séquence depuis la racine et obtenir un succès
complet avant de proposer un commit.** Tu ne peux pas marquer une tâche
comme terminée si l'un de ces checks échoue.

```bash
npm run format:check     # Prettier
npm run lint             # ESLint sur tous les workspaces
npm run deadcode         # knip : code mort / exports inutilisés
npm run test:coverage    # vitest + seuils de couverture
npm run build            # build lib + site (typecheck inclus)
npm run test:integration -w react-dataflow-animator

```

### Que faire en cas d'échec

- **`format:check`** échoue → `npm run format:write` puis stage le diff
  introduit ; ne le mélange pas à des changements logiques.
- **`lint`** échoue → corrige les warnings au lieu de les ignorer. N'ajoute
  pas `eslint-disable` sans une vraie justification (commentaire qui
  explique le pourquoi).
- **`deadcode`** échoue → soit supprime le code mort, soit ajoute-le à
  `ignoreExports` de `knip.json` si c'est un export public volontaire,
  avec un commentaire.
- **`test:coverage`** échoue sur les seuils → ajoute des tests, ne baisse
  pas les seuils sans accord explicite de l'utilisateur.
- **`build`** échoue → corrige avant de proposer le commit. Un build cassé
  n'est jamais fusionnable.

## Conventions de code

- **TypeScript strict.** Pas de `any`. Si tu as besoin d'un `as unknown as
X`, écris en commentaire pourquoi.
- **Pas de breaking change** sur l'API publique (`packages/react-dataflow-animator/src/index.ts`)
  sans changer la version majeure et le documenter.
- **Tests d'abord** pour les zones non couvertes que tu vas refactorer.
- **Commentaires** : décris le _pourquoi_, pas le _quoi_. Le code suffit
  à dire ce qu'il fait. Un commentaire qui explique un piège évité
  (ex. Babel loose mode dans Docusaurus) est précieux ; un commentaire
  qui paraphrase la ligne suivante ne l'est pas.
- **SSR-safe** : aucun accès `window` / `document` / `requestAnimationFrame`
  hors d'un `useEffect` ou `useLayoutEffect`. Vérifie avant de proposer.
- **Spec et types liés** : si tu modifies `types.ts`, vérifie que
  `schema.ts` reflète le même changement (deux sources de vérité
  aujourd'hui).

## Scripts disponibles (référence rapide)

Racine du monorepo :

| Script                  | Effet                                               |
| ----------------------- | --------------------------------------------------- |
| `npm run dev`           | Build la lib puis lance le site Docusaurus en watch |
| `npm run build`         | Build complet (lib + site)                          |
| `npm run build:lib`     | Build du package uniquement                         |
| `npm run build:docs`    | Build du site uniquement                            |
| `npm run lint`          | ESLint sur tous les workspaces qui l'exposent       |
| `npm run format:check`  | Vérifie le formatage Prettier                       |
| `npm run format:write`  | Applique Prettier                                   |
| `npm test`              | Tests vitest de la lib                              |
| `npm run test:coverage` | Tests + seuils de couverture                        |
| `npm run deadcode`      | knip — détection de code mort                       |

Package (`packages/react-dataflow-animator/`) :

| Script                     | Effet                                       |
| -------------------------- | ------------------------------------------- |
| `npm run build`            | Typecheck + vite build + déclarations .d.ts |
| `npm run dev`              | vite build en mode watch                    |
| `npm run lint`             | ESLint sur src/                             |
| `npm test`                 | Tests vitest unitaires                      |
| `npm run test:coverage`    | Tests + couverture                          |
| `npm run test:integration` | Tests d'intégration sur les démos           |

## Workflows à éviter

- Ne fais **jamais** `git add .` ni `git add -A` — ajoute les fichiers
  nommément.
- Ne fais **jamais** `git commit --amend` sans en discuter (Claude par
  défaut crée un nouveau commit).
- Ne mets **jamais** `--no-verify` pour passer un hook.
- N'invente pas une URL de doc, un nom de package npm, ou une version. Si
  tu hésites, demande ou vérifie avec `npm view`.
- Ne supprime pas un export public de `src/index.ts` sans confirmation
  explicite.

## Pour démarrer une session de travail

1. Lis le fichier `README.md` et `docs/SPEC.md` si tu n'as pas le projet
   en tête.
2. Lance les checks ci-dessus pour confirmer l'état vert de la base.
3. Travaille sur ta tâche.
4. Relance la même séquence de checks avant de proposer le commit.
