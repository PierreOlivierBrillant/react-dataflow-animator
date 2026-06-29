import { Globe } from 'lucide-react';
import { useLanguage, type Locale } from '../i18n';

const LOCALES: Locale[] = ['fr', 'en'];

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, messages } = useLanguage();

  return (
    <div
      role="group"
      aria-label={messages.nav.languageLabel}
      className={`flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-1.5 py-1 ${className}`}
    >
      <Globe size={13} className="text-white/30" aria-hidden="true" />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`cursor-pointer rounded-md border-none px-1.5 py-0.5 text-xs font-semibold uppercase transition-colors ${
            locale === l
              ? 'bg-violet-600/25 text-violet-200'
              : 'bg-transparent text-white/45 hover:text-white'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
