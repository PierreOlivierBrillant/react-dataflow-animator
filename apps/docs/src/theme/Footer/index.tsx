import { CustomFooter } from '@site/src/components/CustomFooter';
import { MultiColumnFooter, useThemeConfig } from '@docusaurus/theme-common';

export default function FooterWrapper() {
  const { footer } = useThemeConfig();

  if (!footer) {
    return null;
  }

  return <CustomFooter footerData={footer as MultiColumnFooter} />;
}
