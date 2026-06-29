const sidebars = {
  docsSidebar: [
    // Les classes `menu-icon-*` posent un pictogramme via mask CSS (cf. custom.css).
    { type: 'doc', id: 'intro', className: 'menu-icon-intro' },
    { type: 'doc', id: 'installation', className: 'menu-icon-installation' },
    {
      type: 'category',
      label: 'Concepts',
      className: 'menu-icon-concepts',
      items: [
        'concepts/nodes',
        'concepts/packets',
        'concepts/decor',
        'concepts/layout',
        'concepts/timeline',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      className: 'menu-icon-reference',
      items: ['reference/actions', 'reference/components', 'reference/api'],
    },
  ],
};

export default sidebars;
