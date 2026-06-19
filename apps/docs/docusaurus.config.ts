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
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr'],
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
    },
  },
};

export default config;
