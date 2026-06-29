import { themes as prismThemes } from 'prism-react-renderer';

const config = {
  title: 'React DataFlow Animator',
  tagline:
    'Animations de flux de données pilotées par JSON pour React et Docusaurus.',
  favicon: 'img/logo.svg',
  url: 'https://pierreolivierbrillant.github.io',
  baseUrl: '/react-dataflow-animator/',
  trailingSlash: true,
  organizationName: 'PierreOlivierBrillant',
  projectName: 'react-dataflow-animator',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  // i18n natif : l'anglais est la langue source (servie à la racine `/`), le
  // français est une locale traduite (`/fr/`). Chaque locale produit du HTML
  // statique distinct → DocSearch peut indexer les deux. La détection navigateur
  // (1ʳᵉ visite) est gérée par une redirection client dans `src/theme/Root.tsx`.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr'],
    localeConfigs: {
      en: { label: 'English', htmlLang: 'en' },
      fr: { label: 'Français', htmlLang: 'fr' },
    },
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  plugins: [
    function myTailwindPlugin() {
      return {
        name: 'docusaurus-tailwindcss',
        configurePostCss(postcssOptions: { plugins: any[] }) {
          postcssOptions.plugins.push(require('@tailwindcss/postcss'));
          return postcssOptions;
        },
      };
    },
    // Permet à webpack de détecter les changements dans le dist de la lib quand
    // on tourne en dev (docusaurus ne surveille pas les node_modules par défaut).
    function watchLibPlugin() {
      return {
        name: 'watch-lib-dist',
        configureWebpack() {
          return {
            watchOptions: {
              ignored: /node_modules\/(?!react-dataflow-animator)/,
            },
          };
        },
      };
    },
  ],
  themeConfig: {
    metadata: [
      { name: 'algolia-site-verification', content: 'B7EDACFD9951C67F' },
    ],
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    image: 'img/logo.svg',
    navbar: {
      items: [
        { to: '/docs/intro', label: 'Documentation', position: 'left' },
        { to: '/examples', label: 'Exemples', position: 'left' },
        { to: '/playground', label: 'Playground', position: 'left' },
        {
          href: 'https://github.com/PierreOlivierBrillant/react-dataflow-animator',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'SITE',
          items: [
            { label: 'Documentation', to: '/docs/intro' },
            { label: 'Exemples', to: '/examples' },
            { label: 'Playground', to: '/playground' },
          ],
        },
        {
          title: 'PROJET',
          items: [
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/react-dataflow-animator',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/PierreOlivierBrillant/react-dataflow-animator',
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Pierre-Olivier Brillant. MIT License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    algolia: {
      appId: 'O5PT29Z2XG',
      apiKey: '6ab54371d9c7838ec9038b1e45831c11',
      indexName: 'React Dataflow Animator documentation website',
      searchPagePath: 'search',
      // Filtre les résultats par locale courante (facette `language`). Suppose que
      // le crawler DocSearch indexe les deux locales (cf. balise docsearch:language
      // émise par Docusaurus pour /en et /fr).
      contextualSearch: true,
    },
  },
};

export default config;
