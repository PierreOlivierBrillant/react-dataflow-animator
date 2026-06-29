import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type { Locale } from './translations';

// Active locale of the Docusaurus build/URL, for language-indexed content
// (demo specs, localized fields). English fallback if unexpected locale.
export function useLocale(): Locale {
  return useDocusaurusContext().i18n.currentLocale === 'fr' ? 'fr' : 'en';
}
