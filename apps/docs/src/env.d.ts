declare module '@theme/Layout' {
  import type { ComponentType, ReactNode } from 'react';

  interface LayoutProps {
    children?: ReactNode;
    title?: string;
    description?: string;
  }

  const Layout: ComponentType<LayoutProps>;
  export default Layout;
}

declare module '@docusaurus/Link' {
  import type { AnchorHTMLAttributes, ComponentType } from 'react';

  interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    to?: string;
  }

  const Link: ComponentType<LinkProps>;
  export default Link;
}
