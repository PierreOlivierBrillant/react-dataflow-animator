import { themes as prismThemes } from 'prism-react-renderer';

const config = {
  title: 'React DataFlow Animator',
  tagline:
    'Animations de flux de données pilotées par JSON pour React et Docusaurus.',
  favicon: 'img/logo.svg',
  url: 'https://pierreolivierbrillant.github.io',
  baseUrl: '/react-dataflow-animator/',
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
  themeConfig: {
    image: 'img/logo.svg',
    navbar: {
      title: 'DataFlow Animator',
      logo: {
        alt: 'React DataFlow Animator',
        src: 'img/logo.svg',
      },
      items: [
        { to: '/docs/intro', label: 'Documentation', position: 'left' },
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
          title: 'Site',
          items: [
            { label: 'Documentation', to: '/docs/intro' },
            { label: 'Démos', to: '/demos' },
            { label: 'Playground', to: '/playground' },
          ],
        },
        {
          title: 'Projet',
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
      copyright: `Copyright ${new Date().getFullYear()} Pierre-Olivier Brillant`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;
