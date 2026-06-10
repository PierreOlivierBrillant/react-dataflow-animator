import { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { FaGithub } from 'react-icons/fa';
import { LogoText } from './LogoText';

export function CustomNavbar() {
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
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between w-full">
          <Link
            to="/"
            className="flex items-center gap-2.5 no-underline hover:no-underline"
          >
            <LogoText logoSize={32} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/docs/intro" label="Documentation" />
            <NavLink to="/playground" label="Playground" exact={true} />
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://github.com/PierreOlivierBrillant/react-dataflow-animator"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-lg transition-all no-underline hover:no-underline bg-white/[.03]"
            >
              <FaGithub size={16} />
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-white/50 hover:text-white cursor-pointer bg-transparent border-none"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
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
                href="https://github.com/PierreOlivierBrillant/react-dataflow-animator"
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
  exact?: boolean;
}

export function NavLink({ to, label, exact = false }: NavLinkProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = exact
    ? currentPath === to || currentPath === `${to}/`
    : currentPath.startsWith(to);

  return (
    <Link
      key={label}
      to={to}
      className={`px-3.5 py-2 text-sm rounded-lg transition-colors no-underline hover:no-underline font-sans ${
        isActive
          ? 'text-violet-300 bg-violet-600/10'
          : 'text-white/50 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}
