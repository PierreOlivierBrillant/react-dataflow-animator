import { useState, useEffect, type ReactNode } from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import SearchBar from '@theme/SearchBar';
import { Menu, X, BookOpen, LayoutGrid, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { FaGithub } from 'react-icons/fa';
import { LogoText } from './LogoText';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from '../i18n';

const GITHUB_URL =
  'https://github.com/PierreOlivierBrillant/react-dataflow-animator';

export function CustomNavbar() {
  const t = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation().pathname;
  const isHome =
    location === '/' ||
    location.endsWith('/react-dataflow-animator') ||
    location.endsWith('/react-dataflow-animator/');
  const isSolid = !isHome || scrolled;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    handler(); // initialize
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      {!isHome && (
        <style>{`
          .main-wrapper {
            padding-top: var(--ifm-navbar-height);
          }
        `}</style>
      )}
      <header
        className={`navbar navbar--fixed-top fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isSolid || mobileOpen
            ? 'bg-bg/85 backdrop-blur-[20px] border-b border-white/[.06]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="w-full px-5 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 no-underline hover:no-underline"
          >
            <LogoText logoSize={32} />
          </Link>

          {/* Algolia search */}
          <div className="hidden md:flex items-center">
            <SearchBar />
          </div>

          {/* Links + actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Desktop links */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                to="/docs/intro"
                label={t.nav.documentation}
                icon={<BookOpen size={13} />}
              />
              <NavLink
                to="/examples"
                label={t.nav.examples}
                icon={<LayoutGrid size={13} />}
              />
              <NavLink
                to="/playground"
                label={t.nav.playground}
                exact={true}
                icon={<Zap size={13} />}
              />
            </nav>

            {/* Mobile search (Algolia) */}
            <div className="md:hidden flex items-center">
              <SearchBar />
            </div>

            {/* Separator + language + GitHub (desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-px h-4 bg-white/10 mx-1" />
              <LanguageSwitcher />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white/70 hover:text-white rounded-lg transition-all no-underline hover:no-underline"
              >
                <FaGithub size={25} />
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-white/50 hover:text-white cursor-pointer bg-transparent border-none"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label={t.nav.toggleMenu}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden absolute top-full left-0 right-0 w-full overflow-hidden border-b border-white/[0.06] bg-[#05040e] shadow-2xl"
            >
              <div className="px-5 pb-5">
                <div className="flex flex-col gap-1 pt-3">
                  {[
                    { label: t.nav.documentation, to: '/docs/intro' },
                    { label: t.nav.examples, to: '/examples' },
                    { label: t.nav.playground, to: '/playground' },
                  ].map(({ label, to }) => (
                    <Link
                      key={to}
                      to={to}
                      className="px-3 py-2.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors no-underline hover:no-underline"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </Link>
                  ))}
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors no-underline hover:no-underline"
                    onClick={() => setMobileOpen(false)}
                  >
                    <FaGithub size={15} /> {t.nav.sources}
                  </a>
                  <div className="px-3 pt-2">
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

interface NavLinkProps {
  to: string;
  label: string;
  icon?: ReactNode;
  exact?: boolean;
}

function NavLink({ to, label, icon, exact = false }: NavLinkProps) {
  const currentPath = useLocation().pathname;
  // `to` is relative to the site root; useLocation returns the real pathname,
  // including baseUrl (/react-dataflow-animator/...). So we compare on the same basis.
  const target = useBaseUrl(to);

  const isActive = exact
    ? currentPath === target || currentPath === `${target}/`
    : currentPath.startsWith(target);

  return (
    <Link
      key={label}
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 text-lg rounded-lg transition-colors no-underline hover:no-underline font-sans border ${
        isActive
          ? 'text-violet-300 bg-violet-600/10 border-violet-500/25'
          : 'text-white/50 hover:text-white border-transparent'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
