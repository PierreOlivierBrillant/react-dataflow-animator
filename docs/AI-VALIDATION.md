# Faire valider le rendu par une IA

Comment demander à une IA (de vision ou non) de juger si une animation est
**claire** et **fluide**, en exploitant le fait que le moteur est une fonction
pure `evaluate(timeline, t)`.

## Principe : le temps est une donnée adressable

Faire regarder l'animation « en direct » à une IA est le pire médium : un modèle
lit mal une vidéo, et le live ajoute de la flakiness inutile. Comme tout découle
de `evaluate(timeline, t)`, on transforme le temps en données et on sépare deux
questions qui n'ont rien à voir :

| Question                                            | Bon medium                            | Outil                             |
| --------------------------------------------------- | ------------------------------------- | --------------------------------- |
| « Est-ce **clair** ? » (chevauchements, lisibilité) | images fixes                          | harnais Vite → planche-contact    |
| « Est-ce **fluide** ? » (`set_content`, `move`)     | **courbe de la valeur-dans-le-temps** | harnais Vite → panneaux de courbe |
| Garde-fou structurel (CI, pré-commit)               | JSON                                  | `extract-curves.mjs` (headless)   |

La fluidité **n'est pas dans une frame** : c'est une propriété de la dérivée. Un
screenshot ne peut pas la révéler ; il faut tracer la courbe.

## Outil 1 — harnais visuel (les deux canaux)

Vite sert un harnais qui, pour une démo, rend **un `Stage` figé à chaque
`timeline.stops[]`** (planche-contact) et, pour chaque `set_content`, trace
l'**opacité de crossfade réelle** (`clipOpacity`, qui pilote aussi le lerp de
géométrie) contre la même courbe passée dans `easeInOutCubic`.

```bash
npm run harness -w react-dataflow-animator
# → http://localhost:5199/?demo=spa&theme=light
```

Paramètres d'URL : `?demo=<id>` (voir la barre de navigation pour la liste) et
`?theme=light|dark`.

Le harnais importe `Stage`, `clipOpacity`, `easeInOutCubic` **depuis `src`**
(elles ne sont pas publiques) : une seule source de vérité, aucune duplication à
resynchroniser. La mesure DOM est réelle → on voit aussi le **re-layout** d'un
`set_content` (refit de police, ResizeObserver), pas seulement le mouvement
« voulu » par le moteur.

### Comment une IA le consomme

Via le serveur MCP **chrome-devtools** déjà en place :

1. `navigate_page` / `new_page` → l'URL ci-dessus.
2. `take_screenshot` (`fullPage: true`) → **une seule image** donne la
   planche-contact + les courbes. L'IA juge clarté et fluidité d'un coup.
3. `evaluate_script` → `window.__VALIDATION__` expose les séries numériques
   (`stops`, et par `set_content` les échantillons `{ t, actual, eased }`), pour
   raisonner sur les chiffres sans OCR de la courbe.

## Outil 2 — extracteur headless (structure, sans navigateur)

Détecte les défauts qui se décident à la compilation, sans rendre de pixels :
fondus explicites coupés/courts, chevauchement de deux contenus sur le même
nœud. Signal rapide pour la CI.

```bash
npm run build:lib                                   # le dist doit exister
node scripts/extract-curves.mjs --demo spa          # résumé lisible
node scripts/extract-curves.mjs --demo spa --json   # JSON
```

> Volontairement limité à l'API publique (`compile`) : il **ne réimplémente pas**
> `clipOpacity`. La durée du fondu par DÉFAUT n'est donc pas visible ici — si la
> spec ne fixe pas `fadeInMs`/`fadeOutMs`, c'est au harnais de montrer la courbe
> réelle. L'outil n'invente aucun chiffre de fondu.

## Cas travaillé : « le `set_content` manque de fluidité »

Le harnais le rend évident. La courbe **rouge** (opacité réelle) est un
**trapèze linéaire** : vélocité constante puis coupure nette aux coins
(`discontinuité max ≈ 4/s`). La courbe **verte** montre le même crossfade passé
dans `easeInOutCubic` — départ et arrivée adoucis. Le moteur a déjà la fonction
d'easing ; le crossfade de `clipOpacity`, lui, est linéaire. C'est là que se
gagne la fluidité, et l'IA voit immédiatement quoi changer et où.

Le contraste est le plus parlant sur une **fenêtre courte** (peu de hold) : la
démo `spa` a un second `set_content` de ~750 ms qui l'illustre bien.

## Pistes pour aller plus loin

- **Automatiser en CI** : un script Playwright (utiliser `channel: 'chrome'`
  pour réemployer le Chrome système, sans télécharger Chromium) qui charge le
  harnais, attend la mesure, screenshote et lit `__VALIDATION__`.
- **Régression visuelle** : comme le rendu est déterministe, des planches-contacts
  de référence (golden) + un diff pixel (`odiff`, `pixelmatch`,
  `jest-image-snapshot`) donnent des snapshots **non flaky** — le point douloureux
  habituel disparaît.
