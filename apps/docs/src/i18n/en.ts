import type { Messages } from './fr';

// Must reflect exactly the structure of `fr` (`Messages` type).
export const en: Messages = {
  nav: {
    documentation: 'Documentation',
    examples: 'Examples',
    playground: 'Playground',
    sources: 'Source',
    toggleMenu: 'Toggle navigation',
    languageLabel: 'Language',
    toggleTheme: 'Toggle light/dark theme',
  },
  home: {
    pageTitle: 'Home',
    pageDescription: 'Data flow animations for React and Docusaurus.',
  },
  hero: {
    titlePre: 'Your architectures, ',
    titleHighlight: 'animated',
    titlePost: ' in JSON.',
    subtitle:
      'A React component that turns a JSON specification into a deterministic, navigable animation. Perfect for your architecture demos, tutorials and interactive documentation.',
    ctaPlayground: 'Try it in the playground',
    ctaDocs: 'Documentation',
  },
  showcase: {
    eyebrow: 'Demos',
    titlePre: 'Three lines of JSON.',
    titleHighlight: 'Endless animations.',
    subtitle:
      'Every scenario below is generated from the JSON spec shown. Edit the spec, and the animation updates instantly.',
    hideSpec: '▲ Hide',
    showSpec: '▼ View JSON spec',
    explore: (count: number) => `Explore the ${count} examples`,
  },
  features: {
    eyebrow: 'Features',
    titlePre: 'Everything you need, ',
    titleHighlight: 'nothing more.',
    items: [
      {
        title: 'Automatic layout',
        description:
          'Define only the lanes — the library positions each node automatically, in left-to-right, circular or top-to-bottom.',
      },
      {
        title: 'Built-in player',
        description:
          'Play, pause, restart and step-by-step navigation. Your users control the animation at their own pace.',
      },
      {
        title: 'Simple JSON spec',
        description:
          'Describe nodes, connections and actions in a single JSON object. TypeScript-first, with a complete schema for autocompletion.',
      },
      {
        title: 'Parallel actions',
        description:
          'Run several animations simultaneously with the `parallel` type. Perfect for illustrating concurrent requests or microservices.',
      },
      {
        title: 'Rich content',
        description:
          'Nodes can display syntax-highlighted code, formatted text or images. Content can change mid-animation.',
      },
      {
        title: 'Tech sub-icons',
        description:
          'Add a `subicon` badge to show a known technology (React, PostgreSQL, Node…) or any custom icon.',
      },
    ],
  },
  cta: {
    eyebrow: 'Ready to get started?',
    titlePre: 'Your next animation, ',
    titleHighlight: 'just a JSON away.',
    subtitle:
      "Install the library, copy an example, and you'll have your first animation in under 5 minutes.",
    primary: 'Open the Playground',
    secondary: 'View on GitHub',
  },
  footer: {
    taglineLine1: 'Architecture animations',
    taglineLine2: 'driven by JSON.',
    repoAria: 'Project GitHub repository',
    labels: {
      SITE: 'SITE',
      PROJET: 'PROJECT',
      Documentation: 'Documentation',
      Exemples: 'Examples',
      Playground: 'Playground',
      npm: 'npm',
      GitHub: 'GitHub',
    },
  },
  intro: {
    leadPost:
      ' compiles a JSON specification into a deterministic, navigable data flow animation.',
    overviewTitle: 'Overview',
    overviewIntro: 'You describe:',
    overviewItems: [
      {
        pre: '',
        strong: 'static objects',
        post: ' (the nodes: servers, clients, databases…);',
      },
      {
        pre: '',
        strong: 'dynamic objects',
        post: ' (the payloads that will move: HTTP packets, SQL queries…);',
      },
      {
        pre: 'a sequence of ',
        strong: 'actions',
        post: ' (moves, arrows, comments, loaders…).',
      },
    ],
    overviewOutro:
      'The engine places the nodes, draws the paths and plays the timeline without any manual coordinates.',
    principlesTitle: 'Principles',
    principles: [
      {
        strong: 'Time is the single source of truth.',
        rest: ' The engine compiles the spec into a pure timeline: t (ms) → visual state. Backward seeking, step-by-step navigation and SSR are trivial and deterministic.',
      },
      {
        strong: 'Automatic layout.',
        rest: ' Linear (based on direction and lane) or circular. No coordinates to provide.',
      },
      {
        strong: 'SSR-safe.',
        rest: ' No DOM access during render — usable directly in Docusaurus, Next.js, or any React site.',
      },
      {
        strong: 'Extensible.',
        rest: ' Node icons, tech sub-icons and syntax highlighting are registrable / replaceable.',
      },
    ],
    furtherTitle: 'Going further',
    furtherItems: [
      {
        to: '/docs/installation',
        label: 'Installation',
        desc: ' — get started in 5 lines.',
      },
      {
        to: '/docs/concepts/nodes',
        label: 'Nodes',
        desc: ' — types, badges, content and visibility.',
      },
      {
        to: '/docs/concepts/packets',
        label: 'Packets',
        desc: ' — the dynamic objects that move.',
      },
      {
        to: '/docs/concepts/decor',
        label: 'Connections and zones',
        desc: ' — the permanent scenery of the stage.',
      },
      {
        to: '/docs/concepts/layout',
        label: 'Layout',
        desc: ' — how nodes are placed.',
      },
      {
        to: '/docs/concepts/timeline',
        label: 'Timeline and steps',
        desc: ' — how actions chain and persist.',
      },
      {
        to: '/docs/reference/actions',
        label: 'Action types',
        desc: ' — move, arrow, parallel, loading, set_content, comment, highlight, set_visible, wait.',
      },
      {
        to: '/docs/reference/components',
        label: 'Components and JavaScript API',
        desc: ' — <DataFlowPlayer> props, icons, syntax highlighting.',
      },
      {
        to: '/docs/reference/api',
        label: 'API reference (JSON spec)',
        desc: ' — generated from the JSON Schema.',
      },
    ],
  },
  examples: {
    pageTitle: 'Examples',
    pageDescription:
      'Browse the gallery of examples: animated previews, search, and category filters.',
    gallery: 'Gallery',
    title: 'Explore the examples',
    subtitle:
      'Hover over a thumbnail to see the animation, search by keyword or filter by category. Click to open the full preview, then load the spec in the Playground.',
  },
  gallery: {
    searchPlaceholder:
      'Search an example (e.g. “encryption”, “cache”, “alice”)…',
    searchAria: 'Search an example',
    clearSearch: 'Clear search',
    allCategory: 'All',
    openLarge: 'Click to open full size',
    close: 'Close',
    openInPlayground: 'Open in the Playground',
    resetFilters: 'Reset filters',
    noResults: (query: string) => `No example matches “${query}”.`,
    categories: {
      'web-api': 'Web & API',
      realtime: 'Real-time',
      security: 'Security',
      infrastructure: 'Infrastructure',
      distributed: 'Distributed systems',
      engine: 'Engine concepts',
    },
  },
  playground: {
    pageTitle: 'Playground',
    pageDescription: 'Interactive editor to test your JSON specifications.',
    title: 'Playground',
    subtitle:
      'Edit the JSON spec on the left — the animation updates in real time.',
    format: 'Format',
    densityCompact: 'Compact',
    densityComfortable: 'Comfortable',
    densitySpacious: 'Spacious',
    copy: 'Copy',
    loadingEditor: 'Loading editor...',
    invalidJson: 'Invalid JSON:',
    emptyState: 'Enter a valid JSON spec to see the animation.',
  },
  apiRef: {
    property: 'Property',
    examples: 'Examples',
    linkTo: (name: string) => `Link to ${name}`,
    rootIntro: 'The root object of the specification.',
    nodeIntro:
      'A node (server, database, client…). Placed automatically based on `direction`/`lane`.',
    connectionIntro: 'Permanent arrow (scenery) between two nodes.',
    packetIntro: 'A movable packet, referenced by a `move` action.',
    actionsIntro:
      'Discriminated union on `type`. All types share the timing fields (`id`, `duration`, `wait_for`, `keep_until`, `keep_until_next`).',
  },
};
