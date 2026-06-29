/**
 * Dictionnaire français = SOURCE DE VÉRITÉ.
 *
 * Le type `Messages` en est dérivé (`typeof fr`), ce qui force la version
 * anglaise (`en.ts`) à fournir exactement les mêmes clés / la même structure.
 *
 * Les chaînes contenant du `code` entre backticks sont rendues telles quelles
 * (texte littéral) côté accueil ; sur l'intro elles sont découpées pour un
 * vrai rendu `<code>`.
 */
export const fr = {
  nav: {
    documentation: 'Documentation',
    examples: 'Exemples',
    playground: 'Playground',
    sources: 'Sources',
    toggleMenu: 'Ouvrir/fermer la navigation',
    languageLabel: 'Langue',
  },
  home: {
    pageTitle: 'Accueil',
    pageDescription: 'Animations de flux de données pour React et Docusaurus.',
  },
  hero: {
    titlePre: 'Vos architectures, ',
    titleHighlight: 'animées',
    titlePost: ' en JSON.',
    subtitle:
      "Un composant React qui transforme une spécification JSON en animation déterministe et navigable. Idéal pour vos démonstrations d'architecture, tutoriels et documentation interactive.",
    ctaPlayground: 'Essayer dans le terrain de jeu',
    ctaDocs: 'Documentation',
  },
  showcase: {
    eyebrow: 'Démonstrations',
    titlePre: 'Trois lignes de JSON.',
    titleHighlight: 'Des animations infinies.',
    subtitle:
      "Chaque scénario ci-dessous est généré depuis la spec JSON affichée. Modifiez la spec, l'animation se met à jour instantanément.",
    hideSpec: '▲ Masquer',
    showSpec: '▼ Voir la spec JSON',
    explore: (count: number) => `Explorer les ${count} exemples`,
  },
  features: {
    eyebrow: 'Fonctionnalités',
    titlePre: 'Tout ce qu’il vous faut, ',
    titleHighlight: 'rien de plus.',
    items: [
      {
        title: 'Placement automatique',
        description:
          'Définissez uniquement les lanes — la librairie positionne chaque nœud automatiquement, en left-to-right, circular ou top-to-bottom.',
      },
      {
        title: 'Lecteur intégré',
        description:
          "Lecture, pause, retour au début et navigation step-by-step. Vos utilisateurs contrôlent l'animation à leur propre rythme.",
      },
      {
        title: 'Spec JSON simple',
        description:
          "Décrivez nœuds, connexions et actions dans un seul objet JSON. TypeScript first, avec un schéma complet pour l'autocomplétion.",
      },
      {
        title: 'Actions parallèles',
        description:
          'Lancez plusieurs animations simultanément avec le type `parallel`. Idéal pour illustrer des requêtes concurrentes ou microservices.',
      },
      {
        title: 'Contenu riche',
        description:
          "Les nœuds peuvent afficher du code avec coloration syntaxique, du texte formaté ou des images. Le contenu mute en cours d'animation.",
      },
      {
        title: 'Sous-icônes technos',
        description:
          "Ajoutez un badge `subicon` pour afficher une technologie connue (React, PostgreSQL, Node…) ou n'importe quelle icône personnalisée.",
      },
    ],
  },
  cta: {
    eyebrow: 'Prêt à commencer ?',
    titlePre: 'Votre prochaine animation, ',
    titleHighlight: 'à portée de JSON.',
    subtitle:
      'Installez la librairie, copiez un exemple, et vous avez votre première animation en moins de 5 minutes.',
    primary: 'Ouvrir le Playground',
    secondary: 'Voir sur GitHub',
  },
  footer: {
    taglineLine1: "Animations d'architecture",
    taglineLine2: 'pilotées par JSON.',
    // Les libellés/colonnes du footer viennent de la config Docusaurus (FR).
    // On les retraduit à l'affichage via cette table, en gardant la config
    // comme source de la structure (hrefs/ordre).
    labels: {
      SITE: 'SITE',
      PROJET: 'PROJET',
      Documentation: 'Documentation',
      Exemples: 'Exemples',
      Playground: 'Playground',
      npm: 'npm',
      GitHub: 'GitHub',
    } as Record<string, string>,
  },
  intro: {
    leadPost:
      ' compile une spécification JSON en animation déterministe et navigable de flux de données.',
    overviewTitle: 'Aperçu',
    overviewIntro: 'Vous décrivez :',
    overviewItems: [
      {
        pre: 'des ',
        strong: 'objets statiques',
        post: ' (les nœuds : serveurs, clients, bases de données…) ;',
      },
      {
        pre: 'des ',
        strong: 'objets dynamiques',
        post: ' (les payloads qui se déplaceront : paquets HTTP, requêtes SQL…) ;',
      },
      {
        pre: "une suite d'",
        strong: 'actions',
        post: ' (déplacements, flèches, commentaires, chargements…).',
      },
    ],
    overviewOutro:
      "Le moteur place les nœuds, trace les trajets et déroule la timeline sans qu'aucune coordonnée manuelle ne soit nécessaire.",
    principlesTitle: 'Principes',
    principles: [
      {
        strong: "Le temps est l'unique source de vérité.",
        rest: ' Le moteur compile la spec en une chronologie pure : t (ms) → état visuel. Le seek arrière, la navigation par étapes et le SSR sont triviaux et déterministes.',
      },
      {
        strong: 'Disposition automatique.',
        rest: ' Linéaire (selon direction et lane) ou circular. Aucune coordonnée à fournir.',
      },
      {
        strong: 'SSR-safe.',
        rest: ' Aucun accès au DOM pendant le rendu — utilisable directement dans Docusaurus, Next.js, ou tout site React.',
      },
      {
        strong: 'Extensible.',
        rest: ' Icônes de nœuds, sous-icônes technos et coloration syntaxique sont enregistrables / remplaçables.',
      },
    ],
    furtherTitle: 'Pour aller plus loin',
    furtherItems: [
      {
        to: '/docs/installation',
        label: 'Installation',
        desc: ' — démarrer en 5 lignes.',
      },
      {
        to: '/docs/concepts/nodes',
        label: 'Nœuds',
        desc: ' — types, badges, contenu et visibilité.',
      },
      {
        to: '/docs/concepts/packets',
        label: 'Paquets',
        desc: ' — les objets dynamiques qui se déplacent.',
      },
      {
        to: '/docs/concepts/decor',
        label: 'Connexions et zones',
        desc: ' — le décor permanent de la scène.',
      },
      {
        to: '/docs/concepts/layout',
        label: 'Disposition',
        desc: ' — comment les nœuds sont placés.',
      },
      {
        to: '/docs/concepts/timeline',
        label: 'Timeline et étapes',
        desc: ' — comment les actions se chaînent et persistent.',
      },
      {
        to: '/docs/reference/actions',
        label: "Types d'actions",
        desc: ' — move, arrow, parallel, loading, set_content, comment, highlight, set_visible, wait.',
      },
      {
        to: '/docs/reference/components',
        label: 'Composants et API JavaScript',
        desc: ' — props de <DataFlowPlayer>, icônes, coloration syntaxique.',
      },
      {
        to: '/docs/reference/api',
        label: 'Référence API (spec JSON)',
        desc: ' — générée depuis le JSON Schema.',
      },
    ],
  },
};

export type Messages = typeof fr;
