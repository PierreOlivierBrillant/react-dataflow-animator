# Spécification fonctionnelle — React DataFlow Animator

> Source de vérité fonctionnelle de la librairie. Le **JSON Schema** complet (types,
> énumérations, valeurs par défaut) vit dans le code : [`src/lib/schema.ts`](../src/lib/schema.ts)
> et alimente la page « Documentation API » du site. Les **types TypeScript**
> correspondants sont dans [`src/lib/types.ts`](../src/lib/types.ts).

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

Affiché si `spec.is_navigable` est vrai (ou prop `controls`) :

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
conteneur (placement CSS pur). Voir [`src/lib/engine/layout.ts`](../src/lib/engine/layout.ts).

- **Grilles linéaires** (`left-to-right`, `right-to-left`, `top-to-bottom`,
  `bottom-to-top`) : `lane` = position le long du flux ; les nœuds d'une même lane
  sont répartis et centrés sur l'axe transverse. Espacement proportionnel au conteneur.
- **Circulaire** (`circular`) : le nœud `is_main` est placé au centre ; les autres à
  équidistance sur un cercle (trigonométrie), ratio corrigé pour rester rond.

**Types de nœuds** : `desktop`, `laptop`, `client`, `server`, `database`, `mobile`,
`user`, `admin`, `users`. Chaque nœud peut recevoir : un `text` (label), un `subicon`
(badge techno), une `url` (rendant le nœud cliquable), et un `content` initial.

## 4. Routage et prévention des collisions

Les connexions sont tracées entre les `BoundingClientRect` réels des nœuds (mesurés
côté client). Les flèches et paquets s'arrêtent à une **marge** de quelques pixels du
nœud (`NODE_GAP`). Voir [`src/lib/engine/geometry.ts`](../src/lib/engine/geometry.ts).

- **Décalage bidirectionnel (path shifting)** : le compilateur scanne toute la spec
  (flèches statiques + actions `move`/`arrow`). Si un segment A↔B est utilisé dans les
  deux sens, les deux trajets sont décalés perpendiculairement de ±15 % de la taille
  du nœud ; le signe dépend de l'ordre alphabétique des id → deux voies parallèles.

## 5. Moteur d'animation et actions

La timeline compile un tableau d'actions ordonnées. Voir
[`src/lib/engine/compiler.ts`](../src/lib/engine/compiler.ts).

1. **move** : déplace un objet dynamique (paquet/requête) de `from` vers `to` ;
   interpolation sur `duration` ms ; épouse la voie décalée si bidirectionnel.
2. **arrow** : trace une ligne SVG entre deux nœuds (dessin progressif `x2/y2`).
   Styles `full` / `dotted` / `dashed`, texte médian optionnel. Les flèches **statiques**
   se déclarent comme `static_objects` de type `arrow` (décor permanent).
3. **parallel** : encapsule des actions enfants exécutées au même timestamp.
4. **loading** : spinner attaché à un nœud cible (simule un traitement).
5. **set_content** : mute le contenu d'un nœud ; mode `code` (terminal + coloration
   syntaxique Prism) ou `text` (fenêtre de navigateur factice) ou `image`.
6. **comment** : bulle de texte en fondu près d'un nœud (`next_to`).

## 6. Cycle de vie temporel

- **`wait_for`** : l'action démarre à la **fin** de l'action référencée (par id).
- **`keep_until`** : reste visible jusqu'au **début** de l'action ciblée.
- **Pause inter-étapes** (`STEP_GAP`) : une courte pause sépare deux étapes racines,
  pour que l'arrêt « Suivant » montre l'étape « posée » seule (sans chevaucher
  l'apparition de la suivante).
- **`keep_until_next`** : reste visible jusqu'au début de l'étape racine suivante
  (donc à travers la pause).
  Défauts : `move` → `false` ; `arrow`/`comment`/`set_content` → `true` ; `loading` → `false`.

## 7. Site vitrine (GitHub Pages)

`src/demo/` — onglets **Démos** (spécs d'exemple), **Installation**, **Documentation
API** (générée depuis le JSON Schema). Buildé par `vite.demo.config.ts`.

## 8. Notes d'implémentation

- Une référence manquante (`from`/`to`/`object` absent, id `wait_for` inconnu…) produit
  un **avertissement non bloquant** (visible avec `debug`) plutôt qu'un crash.
- Ajout vs spec initiale : champ `url` sur les nœuds (cliquables).
- Coloration syntaxique : **Prism** (dépendance), remplaçable via la prop `highlight`.
- Styles **scopés** sous `.rdfa-` + variables CSS (thèmes clair/sombre, prop `theme`).
