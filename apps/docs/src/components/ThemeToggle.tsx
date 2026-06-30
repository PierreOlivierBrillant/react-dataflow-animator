import { useColorMode } from '@docusaurus/theme-common';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from '../i18n';

// Light/dark switch wired to Docusaurus' color mode. Both icons are always
// rendered and the active one is picked by the `dark:` CSS variant (bound to
// [data-theme='dark'] in custom.css), so the markup is identical on the server
// and on first client render — no hydration mismatch. `colorMode` is only read
// inside the click handler, where it reflects the live client value.
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { colorMode, setColorMode } = useColorMode();
  const t = useTranslation();

  return (
    <button
      type="button"
      onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
      aria-label={t.nav.toggleTheme}
      title={t.nav.toggleTheme}
      className={`flex items-center justify-center p-2 rounded-lg cursor-pointer bg-transparent border-none text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.05] dark:text-white/60 dark:hover:text-white dark:hover:bg-white/[0.05] transition-colors ${className}`}
    >
      <Sun size={18} className="hidden dark:block" aria-hidden="true" />
      <Moon size={18} className="block dark:hidden" aria-hidden="true" />
    </button>
  );
}
