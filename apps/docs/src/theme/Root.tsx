import { type ReactNode } from 'react';
import { LanguageProvider } from '@site/src/i18n';

// `Root` enveloppe toute l'app Docusaurus (navbar, pages, docs, footer) : c'est
// le point d'ancrage recommandé pour un contexte global côté client.
export default function Root({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
