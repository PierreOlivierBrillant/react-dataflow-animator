import type { Locale } from './translations';

// Préférence de langue explicite (clic sur le sélecteur). Tant qu'elle est
// absente, la 1ʳᵉ visite suit la langue du navigateur (cf. Root.tsx).
const LOCALE_STORAGE_KEY = 'rdfa-locale';

export function getStoredLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return value === 'fr' || value === 'en' ? value : null;
  } catch {
    return null;
  }
}

export function setStoredLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Persistance best-effort : on ignore un localStorage inaccessible.
  }
}

export function detectBrowserLocale(): Locale {
  const lang =
    (typeof navigator !== 'undefined'
      ? navigator.language
      : ''
    )?.toLowerCase() ?? '';
  return lang.startsWith('fr') ? 'fr' : 'en';
}
