import { useState, useEffect, type ReactNode } from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { Menu, X, Search, BookOpen, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { FaGithub } from 'react-icons/fa';
import { LogoText } from './LogoText';

const GITHUB_URL =
  'https://github.com/PierreOlivierBrillant/react-dataflow-animator';

export function CustomNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
            {/* Version figée sur le major.minor de la lib (cf. package.json) */}
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-xs text-violet-300 bg-violet-500/15 border border-violet-500/30">
              v1.0
            </span>
          </Link>

          {/* Recherche — décorative tant qu'aucun provider (Algolia / local) n'est branché */}
          <div className="flex-1 max-w-md mx-auto hidden md:block">
            {searchOpen ? (
              <div className="relative flex items-center">
                <Search
                  size={14}
                  className="absolute left-3 text-slate-400 pointer-events-none"
                />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dans la documentation…"
                  className="w-full pl-8 pr-8 py-1.5 rounded-md text-sm outline-none font-sans bg-white/[.06] border border-violet-500/50 text-slate-200 placeholder:text-slate-500"
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer"
                  aria-label="Fermer la recherche"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-sans cursor-pointer text-slate-500 bg-white/[.04] border border-white/10 hover:border-slate-600 transition-colors"
              >
                <Search size={13} />
                <span>Rechercher…</span>
                <kbd className="ml-auto text-xs px-1.5 py-0.5 rounded font-mono text-slate-600 bg-white/[.06] border border-white/10">
                  ⌘K
                </kbd>
              </button>
            )}
          </div>

          {/* Liens + actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Liens desktop */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                to="/docs/intro"
                label="Documentation"
                icon={<BookOpen size={13} />}
              />
              <NavLink
                to="/playground"
                label="Playground"
                exact={true}
                icon={<Zap size={13} />}
              />
            </nav>

            {/* Recherche mobile */}
            <button
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-1.5 rounded text-white/50 hover:text-white hover:bg-white/5 transition-colors bg-transparent border-none cursor-pointer"
              aria-label="Rechercher"
            >
              <Search size={15} />
            </button>

            {/* Séparateur + GitHub (desktop) */}
            <div className="hidden md:flex items-center gap-1">
              <div className="w-px h-4 bg-white/10 mx-1" />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white/70 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-lg transition-all no-underline hover:no-underline bg-white/[.03]"
              >
                <FaGithub size={14} />
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </div>

            {/* Bouton menu mobile */}
            <button
              className="md:hidden p-2 text-white/50 hover:text-white cursor-pointer bg-transparent border-none"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
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
                    { label: 'Documentation', to: '/docs/intro' },
                    { label: 'Playground', to: '/playground' },
                  ].map(({ label, to }) => (
                    <Link
                      key={label}
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
                    <FaGithub size={15} /> Sources
                  </a>
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
  // `to` est relatif à la racine du site ; useLocation renvoie le pathname réel,
  // baseUrl compris (/react-dataflow-animator/…). On compare donc sur la même base.
  const target = useBaseUrl(to);

  const isActive = exact
    ? currentPath === target || currentPath === `${target}/`
    : currentPath.startsWith(target);

  return (
    <Link
      key={label}
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors no-underline hover:no-underline font-sans border ${
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
