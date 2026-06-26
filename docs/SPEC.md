# Spécification fonctionnelle — React DataFlow Animator

> Source de vérité fonctionnelle de la librairie. Le **JSON Schema** complet (types,
> énumérations, valeurs par défaut) vit dans le code : [`packages/react-dataflow-animator/src/schema.ts`](../packages/react-dataflow-animator/src/schema.ts)
> et alimente la page « Documentation API » du site. Les **types TypeScript**
> correspondants sont dans [`packages/react-dataflow-animator/src/types.ts`](../packages/react-dataflow-animator/src/types.ts).

## 1. Vue d'ensemble

La librairie expose un composant React `<DataFlowPlayer spec={…} />` qui **compile**
une spécification JSON en une **animation déterministe** de flux de données
(client/serveur/SQL…), encapsulée dans un lecteur multimédia.

Principe central : le temps `t` (ms) est l'unique source de vérité. Le moteur est une
fonction **pure** `evaluate(timeline, t) → état visuel` ; la lecture ne fait
qu'avancer `t` via `requestAnimationFrame`, et `seek` ne fait que le poser. Cela rend
le scrubbing, la navigation par étapes et le SSR triviaux et déterministes.

> **Divergence assumée vs spec initiale :** le séquenceur n'utilise **pas GSAP**. Un
> moteur maison déterministe a été retenu (contrôle total de `seek`/étapes/cycle de
> vie, testabilité sans DOM, bundle léger, SSR-safe). L'overlay de débogage inspecte
> donc cette timeline interne.

## 2. Le lecteur (DataFlowPlayer)

Affiché selon la prop `controls` (défaut : `true`) :

- **Barre de lecture** : timeline cliquable pour sauter à n'importe quel instant.
- **Recommencer** : repart du début et relance la lecture.
- **Lecture / Pause**.
- **Navigation par étapes** (Précédent / Suivant) : navigue par « étapes logiques »
  (= actions racines). « Suivant » joue jusqu'à la fin de l'étape courante puis
  s'arrête ; « Précédent » revient au début de l'étape (puis de la précédente).
- **Plein écran** (Fullscreen API).
- **Débogage** (prop `debug`) : superpositions inspectant l'état interne de la timeline.

## 3. Moteur de rendu spatial (Layout Engine)

Positionne les nœuds **sans coordonnées (x, y) en entrée**, en ratios relatifs au
conteneur (placement CSS pur). Voir [`packages/react-dataflow-animator/src/engine/layout.ts`](../packages/react-dataflow-animator/src/engine/layout.ts).

- **Grilles linéaires** (`left-to-right`, `right-to-left`, `top-to-bottom`,
  `bottom-to-top`) : `lane` = position le long du flux ; les nœuds d'une même lane
  sont répartis et centrés sur l'axe transverse. Espacement proportionnel au conteneur.
- **Circulaire** (`circular`) : le nœud `is_main` est placé au centre ; les autres à
  équidistance sur un cercle (trigonométrie), ratio corrigé pour rester rond.
- **`align_with`** : aligne un nœud sur l'axe transverse d'un autre (vertical si la
  direction est horizontale) → aligner deux nœuds de lanes différentes.
- **Zones** (tableau racine `zones`) : rectangles d'arrière-plan englobant un
  groupe de nœuds et/ou d'autres zones (`contains`), avec `color` et `label`
  optionnels. Dimensionnées automatiquement (point fixe pour gérer l'imbrication),
  rendues sous les flèches et les nœuds.

**Types de nœuds** : treize **pictogrammes** (`desktop`, `laptop`, `client`, `server`,
`database`, `mobile`, `user`, `admin`, `users`, `cloud`, `alice`, `bob`, `eve` — les
trois derniers représentent des **personnages nommés** : Alice (chignon), Bob (casquette),
Ève (casque d'écoute, espionne), utiles pour les schémas de cryptographie et de
protocoles réseau), deux nœuds **textuels**
(`simple_node` = boîte de texte sans pictogramme, `complex_node` = en-tête + corps à
la manière d'un paquet HTTP) et huit **formes géométriques** (`square`, `diamond`,
`circle`, `triangle`, `parallelogram`, `width_rectangle`, `height_rectangle`, `star`).
Chaque nœud peut recevoir : un `text` (label), un `subicon` (techno connue, icône
enregistrée **ou texte libre**), une `url` (rendant le nœud cliquable), un
`content` initial, et des **couleurs** `background_color` / `border_color`.

**Couleurs** (`background_color`, `border_color`, `text_color`) : changent le fond,
la bordure et le texte du nœud — remplissage/trait d'une forme, fond/bordure d'un
panneau, pastille + traits d'un pictogramme, et couleur du texte interne. Chaque champ
accepte une couleur CSS **prédéfinie** (nom : `tomato`, `steelblue`…) ou une valeur
**hexadécimale** exacte (`#3b82f6`). Dérivations automatiques (CSS pur, sans JS,
valables pour noms comme pour hex) quand un `background_color` est fourni sans la
couleur correspondante : `border_color` → fond assombri (`color-mix`) ; `text_color`
→ noir ou blanc selon la luminance du fond (`oklch(from …)`), pour un très fort
contraste. `text_color` ne s'applique **que si la coloration syntaxique est désactivée**
(sans `language`) ; sinon les couleurs des tokens priment. Sans effet quand un
`set_content` occupe le nœud.

**Nœuds textuels** (`simple_node`, `complex_node`) : le contenu se met dans `body`
(corps) et, pour `complex_node` uniquement, `header` (en-tête, séparé du corps par un
trait). Le champ `language` applique la **coloration syntaxique** à _toutes_ les zones
de texte du nœud (header + body). Le `subicon` reste disponible ; un `set_content`
actif prend la priorité sur le panneau textuel (comme il masque le pictogramme).

**Formes géométriques** (`square`, `diamond`, `circle`, `triangle`, `parallelogram`,
`width_rectangle`, `height_rectangle`, `star`) : une forme dessinée en SVG qui peut
contenir un **court texte centré** via `body` (`text` reste le label sous la forme).
La forme s'agrandit pour accueillir le texte, mais celui-ci est borné (`max-width`)
et **recadré** (`overflow:hidden`) pour ne jamais déborder du tracé visible — le `body`
est donc pensé pour une étiquette brève, pas un paragraphe. Le `subicon` reste
disponible et un `set_content` actif remplace la forme. Toutes ces familles partagent
le même chemin de rendu (`NodeView`) : `isPanelNode`/`isShapeType` (module `nodeKinds`)
arbitrent panneau/forme/pictogramme.

**Mise à l'échelle responsive** : une « cellule » (plus petite distance entre deux
nœuds, en px) pilote un facteur d'échelle global (`--rdfa-scale` : icônes/polices plus
grandes en plein écran, plus petites si l'espace est serré) et plafonne la largeur des
panneaux/paquets (`--rdfa-maxw`) pour qu'ils ne débordent jamais sur les voisins.

**Espacement & bornes** : pour peu de lanes, les nœuds s'étalent vers les bords pour
utiliser l'espace disponible (distance maximale entre eux). Aucun élément ne sort du
canevas : la largeur des panneaux tient compte des bords, et la position de chaque nœud
est bornée selon sa taille mesurée (les commentaires basculent sous le nœud si besoin).
La police des panneaux/commentaires suit l'échelle de façon modérée (max ~1.15×) pour
ne pas déborder.

## 4. Routage et prévention des collisions

Les connexions sont tracées entre les `BoundingClientRect` réels des nœuds (mesurés
côté client). Les flèches et paquets s'arrêtent à une **marge** de quelques pixels du
nœud (`NODE_GAP`). Voir [`packages/react-dataflow-animator/src/engine/geometry.ts`](../packages/react-dataflow-animator/src/engine/geometry.ts).

- **Décalage bidirectionnel (path shifting)** : le compilateur scanne toute la spec
  (connexions permanentes + actions `move`/`arrow`). Si un segment A↔B est utilisé dans
  les deux sens, les deux trajets sont décalés perpendiculairement (`SHIFT_RATIO` × la
  taille du nœud) ; le signe dépend de l'ordre alphabétique des id → deux voies
  parallèles. La perpendiculaire est calculée dans un repère canonique pour ne jamais
  superposer A→B et B→A.

## 5. Moteur d'animation et actions

La timeline compile un tableau d'actions ordonnées. Voir
[`packages/react-dataflow-animator/src/engine/compiler.ts`](../packages/react-dataflow-animator/src/engine/compiler.ts).

1. **move** : déplace un objet dynamique (paquet/requête) de `from` vers `to` ;
   interpolation sur `duration` ms ; épouse la voie décalée si bidirectionnel.
2. **arrow** : trace une ligne SVG entre deux nœuds (dessin progressif `x2/y2`).
   Styles de trait `solid` / `dotted` / `dashed` / `animated` et forme de tracé
   `path` (`bezier` par défaut, `simplebezier` / `straight` / `step` / `smoothstep`),
   texte médian optionnel. Les flèches **permanentes** (décor) se déclarent dans le
   tableau racine `connections` (affichées dès l'init).
3. **parallel** : encapsule des actions enfants exécutées au même timestamp.
4. **loading** : spinner attaché à un nœud cible (simule un traitement).
5. **set_content** : mute le contenu d'un nœud. Mode `code` (terminal + coloration
   Prism, **sans barre d'URL** ; le code ne revient jamais à la ligne, sa police
   s'ajuste pour tenir), ou `text`/`image` (fenêtre de navigateur avec barre d'URL
   paramétrable via `content.url`).
6. **comment** : bulle de texte en fondu près d'un nœud (`object`).
7. **highlight** : surligne (halo pulsé) un nœud statique ou une connexion (par `object` = id).
8. **wait** : temps mort — aucun clip émis, l'étape occupe simplement `duration` ms
   (défaut 1000) pour figer l'image avant l'étape suivante.
9. **set_visible** : affiche ou cache un nœud statique (`object`) avec un fondu.
   L'état de visibilité persiste jusqu'à la fin de la chronologie (ou un
   `set_visible` contraire) ; complète le champ `visible` initial des nœuds.

## 6. Cycle de vie temporel

- **`wait_for`** : l'action démarre à la **fin** de l'action référencée (par id).
  - _Sur une action racine_ (directement dans `timeline`) : `startMs` effectif =
    `max(ref.endMs, stepStart)`. `wait_for` ne peut que **retarder** l'action,
    jamais la faire démarrer avant le début de son propre step. Cette borne empêche
    qu'un wait_for vers une action très antérieure produise un clip hors de sa plage
    d'étape (step de durée nulle, navigation incorrecte).
  - _Sur un enfant de `parallel`_ : sémantique stricte — `startMs = ref.endMs`,
    sans plancher. Le clip peut alors démarrer avant le début du bloc parallel si la
    référence est antérieure.
- **`keep_until`** : reste visible jusqu'au **début** de l'action ciblée.
- **Pause inter-étapes** (`STEP_GAP`) : une courte pause sépare deux étapes racines,
  pour que l'arrêt « Suivant » montre l'étape « posée » seule (sans chevaucher
  l'apparition de la suivante).
- **`keep_until_next`** : reste visible jusqu'au début de l'étape racine suivante
  (donc à travers la pause). Les étapes `wait` sont **sautées** dans cette
  résolution : le contenu posé reste affiché pendant le temps mort.
- **`keep_until_end`** (booléen) : reste visible jusqu'à la fin de la chronologie.
  Défauts : `move` → `false` ; `arrow`/`comment`/`set_content` → `true` ; `loading` → `false`.

## 7. Site vitrine (GitHub Pages)

`apps/docs/` — site Docusaurus : **Accueil**, **Démonstrations** (galerie),
**Terrain de jeu** (éditeur live), **Documentation** (intro, concepts,
référence API générée depuis le JSON Schema). Buildé via
`npm run build:docs` et déployé sur GitHub Pages par
`.github/workflows/ci-cd.yml`.

## 8. Notes d'implémentation et évolutions

- Nœuds **textuels** `simple_node` / `complex_node` : boîte de texte (`body`, plus
  `header` pour `complex_node`) au lieu d'un pictogramme, coloration optionnelle via
  `language` (appliquée à toutes les zones). `complex_node` reprend l'allure d'un
  paquet HTTP. Rendus par `NodePanel` (cf. `components/nodes/StaticNode.tsx`).
- **Formes géométriques** (`square` … `star`) : forme SVG (`preserveAspectRatio="none"`,
  `non-scaling-stroke`) avec un court `body` centré. Marge de sécurité par forme +
  `max-width` + `overflow:hidden` garantissent que le texte ne déborde pas du tracé.
  Rendues par `ShapeNode` via `NodeView` ; le prédicat `isShapeType` vit dans
  `components/nodes/nodeKinds.ts` (source de vérité unique, comme `isPanelNode`).
- **Couleurs des nœuds** (`background_color` / `border_color` / `text_color`) : posées
  en variables CSS `--rdfa-fill` / `--rdfa-stroke` / `--rdfa-ink` sur la racine
  `.rdfa-node` (`nodeColors.ts`), lues par le CSS des formes/panneaux/pictogrammes avec
  fallback sur le thème. Dérivations auto (CSS pur, SSR-safe, indépendant du format) :
  bordure = `color-mix(in srgb, <fond>, #000 32%)` ; texte = `oklch(from var(--rdfa-fill)
clamp(0, (0.62 − l) × 1000, 1) 0 0)` (noir/blanc selon la luminance). `--rdfa-ink`
  n'est lu que **hors zones de code** (`:not(.rdfa-code)`) : la coloration syntaxique
  prime. Un `background_color` sur un pictogramme ajoute une pastille (`rdfa-node--tinted`).
- `is_navigable` a été **retiré de la spec** : la navigabilité est une prop `controls`.
- Les flèches de décor ont migré de `static_objects` vers le tableau racine `connections`.
- `comment` utilise `object` (et non plus `next_to`) pour cibler son nœud.
- `style` : terminologie SVG/CSS `solid`/`dotted`/`dashed` (`full` toléré en alias).
- `path` : forme du tracé d'une flèche/connexion (`bezier` par défaut,
  `simplebezier`/`straight`/`step`/`smoothstep`) — orthogonal à `style`. La
  courbure n'apparaît qu'avec un décalage transverse ; les paquets `move`
  épousent le tracé `bezier` par défaut.
- `subicon` accepte du **texte libre** en plus des icônes (react-icons).
- `response_content.data` retiré (jamais rendu) ; seul `rows` est affiché.
- Actions modélisées en **union discriminée** (TS + `oneOf` schéma) → validation réelle.
- **`language` : divergence TS ↔ schéma (intentionnelle).** Le type TypeScript est
  `HighlightLanguage | (string & {})` — n'importe quelle chaîne est valide à la
  compilation pour ne pas casser les consommateurs. Mais le script
  `packages/react-dataflow-animator/scripts/schema-patches.mjs` retire la branche
  `{type:string}` libre du schéma généré et ne conserve que le `$ref` vers
  `HighlightLanguage`. Conséquence : un langage hors de l'énumération passe le
  compilateur TypeScript mais est rejeté par Ajv. C'est voulu : le schéma est plus strict
  que les types pour préserver l'auto-complétion et la validation.
- Une référence manquante (champ requis absent, id `wait_for` inconnu…) produit un
  **avertissement non bloquant** (visible avec `debug`) plutôt qu'un crash.
- Coloration syntaxique : **Prism** (dépendance), remplaçable via la prop `highlight`.
- Styles **scopés** sous `.rdfa-` + variables CSS (thèmes clair/sombre, prop `theme`).
- **Thème `auto` (défaut)** : suit `prefers-color-scheme` ET un ancêtre `[data-theme]`
  (convention Docusaurus) → se synchronise avec le toggle de thème de l'hôte.
- Les objets en mouvement (paquets) sont rendus **au premier plan** (au-dessus des
  panneaux `set_content`). `set_content` apparaît/disparaît en **fondu**.
