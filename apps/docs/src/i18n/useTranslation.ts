import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { translations, type Locale, type Messages } from './translations';

// The active locale is the Docusaurus build/URL locale (native i18n), not a client
// state: each locale has its own static render. We fall back to English
// if an unexpected locale appears.
export function useTranslation(): Messages {
  const { i18n } = useDocusaurusContext();
  return translations[i18n.currentLocale as Locale] ?? translations.en;
}
