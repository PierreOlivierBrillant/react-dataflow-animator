import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { translations, type Locale, type Messages } from './translations';

const STORAGE_KEY = 'rdfa-locale';

// Défaut SSR/anglais : le rendu serveur et le premier rendu client DOIVENT
// coïncider, donc on part toujours de l'anglais. La vraie préférence
// (localStorage, sinon langue du navigateur) est appliquée après hydratation.
const DEFAULT_LOCALE: Locale = 'en';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function resolvePreferredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') {
      return stored;
    }
  } catch {
    // localStorage indisponible (mode privé, SSR…) → on retombe sur le navigateur.
  }
  const lang = window.navigator.language?.toLowerCase() ?? '';
  return lang.startsWith('fr') ? 'fr' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Première arrivée : on aligne sur la préférence stockée ou la langue du
  // navigateur. Effet post-hydratation → pas de mismatch SSR/CSR.
  useEffect(() => {
    setLocaleState(resolvePreferredLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistance best-effort : on ignore un localStorage inaccessible.
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, messages: translations[locale] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error(
      'useLanguage doit être utilisé dans un <LanguageProvider>.'
    );
  }
  return ctx;
}

export function useTranslation(): Messages {
  return useLanguage().messages;
}
