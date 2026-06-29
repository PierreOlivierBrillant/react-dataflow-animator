import { Globe } from 'lucide-react';
import { useAlternatePageUtils } from '@docusaurus/theme-common/internal';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { setStoredLocale, useTranslation, type Locale } from '../i18n';

// Bascule de locale en i18n natif : chaque langue est une URL distincte, donc
// des liens (navigation complète) plutôt qu'un toggle d'état. Le clic mémorise
// le choix pour neutraliser la redirection navigateur (cf. Root.tsx).
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const t = useTranslation();
  const { i18n } = useDocusaurusContext();
  const { createUrl } = useAlternatePageUtils();

  return (
    <div
      role="group"
      aria-label={t.nav.languageLabel}
      className={`flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-1.5 py-1 ${className}`}
    >
      <Globe size={13} className="text-white/30" aria-hidden="true" />
      {i18n.locales.map((locale) => {
        const active = locale === i18n.currentLocale;
        return (
          <a
            key={locale}
            href={createUrl({ locale, fullyQualified: false })}
            onClick={() => setStoredLocale(locale as Locale)}
            aria-current={active ? 'true' : undefined}
            className={`rounded-md px-1.5 py-0.5 text-xs font-semibold uppercase no-underline transition-colors hover:no-underline ${
              active
                ? 'bg-violet-600/25 text-violet-200'
                : 'text-white/45 hover:text-white'
            }`}
          >
            {locale}
          </a>
        );
      })}
    </div>
  );
}
