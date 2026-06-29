import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { translations, type Locale, type Messages } from './translations';

// La locale active est celle du build/URL Docusaurus (i18n natif), pas un state
// client : chaque locale a son propre rendu statique. On retombe sur l'anglais
// si une locale inattendue apparaît.
export function useTranslation(): Messages {
  const { i18n } = useDocusaurusContext();
  return translations[i18n.currentLocale as Locale] ?? translations.en;
}
