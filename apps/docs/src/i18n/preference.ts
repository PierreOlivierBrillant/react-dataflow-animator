import type { Locale } from './translations';

// Explicit language preference (click on the selector). While it is
// absent, the 1st visit follows the browser language (see Root.tsx).
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
    // Best-effort persistence: we ignore an inaccessible localStorage.
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
