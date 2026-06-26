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
- [`docs/AI-VALIDATION.md`](./docs/AI-VALIDATION.md) — comment faire valider le
  rendu (clarté/fluidité) par une IA via le harnais déterministe et la
  régression visuelle Playwright.
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
npm run check:schema
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
- **Spec et types liés** : le schéma JSON est GÉNÉRÉ depuis `types.ts`
  (`npm run generate:schema`, vérifié par `check:schema`). Si tu modifies
  `types.ts`, régénère le schéma — ne l'édite jamais à la main. NB : le patch
  de `scripts/schema-patches.mjs` rend le schéma plus strict que les types TS
  pour `language` (voulu).
- **Documente toute évolution de la spec.** Dès que tu ajoutes, modifies ou
  retires un champ, un type d'action, une valeur d'énum ou une valeur par
  défaut dans `types.ts`, tu DOIS répercuter le changement dans la doc, dans
  le même commit :
  - `docs/SPEC.md` (source de vérité fonctionnelle) ;
  - la doc utilisateur MDX concernée sous `apps/docs/docs/` (concept ou
    référence), avec **au moins un exemple concret** dans le style existant
    (cf. les onglets d'orientation et les exemples co-localisés `_dossier/*.ts`) ;
  - les liens d'`intro.mdx` et la `sidebars.ts` si tu crées une page.

  Une PR qui change la spec sans toucher la doc est incomplète. La page
  « Référence API » est générée depuis le schéma, mais ne dispense PAS d'une
  explication en prose + exemple : le schéma seul ne documente pas l'intention.

## Corriger la cause, pas seulement le symptôme (patch vs. redesign)

Avant de coder le correctif le plus court, demande-toi si le problème
local est en réalité le symptôme d'une structure qui ne tient plus. Sur un
produit construit par incréments, empiler des patchs ponctuels fait
s'accumuler des cas particuliers qui finissent par coûter plus cher que la
dette qu'ils prétendaient éviter. **Évalue systématiquement si une solution
plus globale — un petit redesign de la zone concernée — réglerait la cause
plutôt que de masquer le symptôme**, et fais-en la base de ta proposition.

Signaux qu'un redesign cadré vaut mieux qu'un énième patch :

- tu ajoutes un **3ᵉ cas particulier** (`if`/override/exception) à un endroit
  qui en a déjà ;
- deux éléments doivent rester **synchronisés à la main** (mêmes coordonnées,
  mêmes valeurs dupliquées) au lieu de dériver d'une source unique — cf. la
  refonte du badge `subicon` + spinner en un conteneur commun ;
- un correctif n'a d'effet qu'en **compensant** un autre module au lieu de le
  corriger là où la décision se prend ;
- tu te bats contre la structure existante (sélecteurs de plus en plus
  spécifiques, marges de compensation, `!important`…).

Garde-fous — la règle n'est PAS « redessine souvent » :

- **Reste dans le périmètre.** Le redesign couvre la zone que la tâche touche,
  pas un refactor opportuniste du voisinage.
- **Pas de breaking change furtif.** Respecte la règle sur l'API publique ; un
  redesign qui la modifie suit la procédure (version majeure + doc).
- **Propose avant d'exécuter les gros.** Un changement contenu (comme le badge),
  tu peux le mener puis le présenter. Dès qu'il déborde sur plusieurs modules,
  l'API publique ou la spec, **expose l'option et son coût à l'utilisateur**
  avant de t'engager — ne refonds pas en douce une large surface.

## Points de vigilance (issus de revues de code)

Pièges déjà rencontrés dans ce dépôt — vérifie-les quand tu touches la zone
concernée (le détail des cas est dans `todo.md` tant qu'il existe) :

- **Pas de champ d'IR mort** : toute donnée calculée par le compilateur doit
  être consommée par le rendu, sinon supprimée. N'exporte pas d'API non
  branchée.
- **Mesure DOM** : la `signature` de `useStageGeometry` doit refléter TOUT
  champ de spec qui influence la _position_ des nœuds — un ResizeObserver ne
  voit que les redimensionnements, pas les déplacements.
- **Unités cohérentes en géométrie** : les décisions horizontal/vertical et les
  offsets se prennent en pixels mesurés, pas en ratios 0..1 (ou alors en
  corrigeant par l'aspect du Stage). Deux modules qui décident différemment se
  contredisent sur les stages non carrés.
- **Boucles rAF** : plafonne le delta de temps (onglet inactif → `dt` énorme au
  retour).
- **Chemins doubles** : si une fonction a un chemin optimisé et un fallback
  (ex. `evaluate`), un test doit prouver leur équivalence — le chemin de prod
  n'est pas forcément celui que les tests exercent.
- **Publication npm** : avant tout `npm publish`, vérifie le tarball avec
  `npm pack --dry-run` (LICENSE présent, `files`/`exports` corrects).

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

| Script                     | Effet                                        |
| -------------------------- | -------------------------------------------- |
| `npm run build`            | Typecheck + vite build + déclarations .d.ts  |
| `npm run dev`              | vite build en mode watch                     |
| `npm run lint`             | ESLint sur src/                              |
| `npm test`                 | Tests vitest unitaires                       |
| `npm run test:coverage`    | Tests + couverture                           |
| `npm run test:integration` | Tests d'intégration sur les démos            |
| `npm run harness`          | Harnais de validation visuelle (Vite, :5199) |
| `npm run curves`           | Passe structurelle headless (`--demo <id>`)  |
| `npm run test:visual`      | Régression visuelle Playwright (goldens)     |

## Workflows à éviter

- Ne fais **jamais** `git add .` ni `git add -A` — ajoute les fichiers
  nommément.
- Ne fais **jamais** `git commit` de ta propre initiative — propose le
  message et attends une confirmation explicite de l'utilisateur.
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
