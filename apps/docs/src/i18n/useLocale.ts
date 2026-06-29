import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type { Locale } from './translations';

// Locale active du build/URL Docusaurus, pour le contenu indexé par langue
// (specs de démos, champs localisés). Repli anglais si locale inattendue.
export function useLocale(): Locale {
  return useDocusaurusContext().i18n.currentLocale === 'fr' ? 'fr' : 'en';
}
