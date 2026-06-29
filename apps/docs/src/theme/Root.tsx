import { useEffect, type ReactNode } from 'react';
import { useAlternatePageUtils } from '@docusaurus/theme-common/internal';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { getStoredLocale, detectBrowserLocale } from '@site/src/i18n';

/**
 * Redirection de langue à la 1ʳᵉ visite : tant qu'aucun choix explicite n'est
 * mémorisé, un navigateur francophone arrivant sur la racine anglaise est
 * envoyé vers /fr/. Un clic sur le sélecteur mémorise le choix et désactive
 * cette redirection. Effet client uniquement → SSR-safe.
 *
 * On ne redirige QUE depuis la locale par défaut (jamais hors d'une locale
 * explicite comme /fr/) : sinon le crawler DocSearch — dont le navigateur est
 * en anglais — serait renvoyé hors de /fr/ et n'indexerait jamais le français.
 */
export default function Root({ children }: { children: ReactNode }) {
  const { i18n } = useDocusaurusContext();
  const { createUrl } = useAlternatePageUtils();

  useEffect(() => {
    // En dev, `docusaurus start` ne sert qu'une locale : /fr/ n'existe pas, donc
    // rediriger casserait la navigation. La détection n'a de sens qu'en prod, où
    // les deux locales sont bâties et servies.
    if (process.env.NODE_ENV !== 'production') return;
    if (i18n.currentLocale !== i18n.defaultLocale) return;
    if (getStoredLocale()) return;
    const desired = detectBrowserLocale();
    if (desired === i18n.currentLocale) return;
    window.location.replace(
      createUrl({ locale: desired, fullyQualified: false })
    );
  }, [i18n.currentLocale, i18n.defaultLocale, createUrl]);

  return <>{children}</>;
}
