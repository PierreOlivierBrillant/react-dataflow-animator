import { useCallback, useEffect, useState } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from '../i18n';

const STORAGE_KEY = 'theme-preference';
type Preference = 'light' | 'dark' | 'system';

function getStoredPreference(): Preference | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* SSR / blocked storage */
  }
  return null;
}

function storePreference(pref: Preference) {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* blocked storage */
  }
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

// Three-mode theme toggle (light / system / dark) wired to Docusaurus'
// color mode. The "system" option follows the OS preference and reacts
// live to changes (e.g. macOS auto-switch). The preference is persisted
// independently from Docusaurus' own storage so that the "system" concept
// survives reloads.
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { setColorMode } = useColorMode();
  const t = useTranslation();

  // Read the persisted preference once on mount. If nothing is stored,
  // default to "system" so returning visitors get OS-sync by default.
  const [preference, setPreference] = useState<Preference>(
    () => getStoredPreference() ?? 'system'
  );

  // Apply a preference: resolve "system" to an actual mode, then push it
  // into Docusaurus and persist the choice.
  const apply = useCallback(
    (pref: Preference) => {
      setPreference(pref);
      storePreference(pref);
      setColorMode(pref === 'system' ? getSystemTheme() : pref);
    },
    [setColorMode]
  );

  // On mount, apply the stored preference (handles "system" → actual
  // mode) and listen for OS theme changes so that "system" stays synced.
  useEffect(() => {
    apply(preference);
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (preference === 'system') {
        setColorMode(getSystemTheme());
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [apply, preference, setColorMode]);

  const options: { value: Preference; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: t.nav.themeLight },
    { value: 'system', icon: Monitor, label: t.nav.themeSystem },
    { value: 'dark', icon: Moon, label: t.nav.themeDark },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t.nav.toggleTheme}
      className={`flex items-center gap-0.5 rounded-lg border border-slate-900/10 bg-slate-900/[0.03] px-1 py-1 dark:border-white/10 dark:bg-white/[0.03] ${className}`}
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => apply(value)}
            className={`flex items-center justify-center p-1.5 rounded-md cursor-pointer bg-transparent border-none transition-colors ${
              active
                ? 'bg-violet-600/25 text-violet-700 dark:text-violet-200'
                : 'text-slate-400 hover:text-slate-900 dark:text-white/30 dark:hover:text-white'
            }`}
          >
            <Icon size={14} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
