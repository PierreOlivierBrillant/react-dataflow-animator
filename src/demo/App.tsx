import './site.css';
import { FaGithub, FaNpm } from 'react-icons/fa';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useRoute } from './router';
import { SiteThemeProvider, useSiteTheme } from './theme';
import { HomePage } from './pages/HomePage';
import { DemosPage } from './pages/DemosPage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { DocsPage } from './pages/DocsPage';

const GITHUB = 'https://github.com/PierreOlivierBrillant/react-dataflow-animator';
const NPM = 'https://www.npmjs.com/package/react-dataflow-animator';

function ThemeToggle() {
  const { theme, toggle } = useSiteTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className="nav-toggle"
      onClick={toggle}
      aria-label={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={dark ? 'Thème clair' : 'Thème sombre'}
    >
      {dark ? <FiSun size={18} /> : <FiMoon size={18} />}
    </button>
  );
}

function Navbar({ page }: { page: string }) {
  const links = [
    { href: '#/', label: 'Accueil', page: 'home' },
    { href: '#/demos', label: 'Démos', page: 'demos' },
    { href: '#/playground', label: 'Playground', page: 'playground' },
    { href: '#/docs', label: 'Documentation', page: 'docs' },
  ];
  return (
    <nav className="nav">
      <a className="nav-brand" href="#/">
        <img
          className="nav-logo"
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt="React DataFlow Animator"
          width={28}
          height={28}
        />
        <span>DataFlow Animator</span>
      </a>
      <div className="nav-links">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className={`nav-link${page === l.page ? ' active' : ''}`}
          >
            {l.label}
          </a>
        ))}
      </div>
      <div className="nav-spacer" />
      <ThemeToggle />
      <a className="nav-ghost" href={GITHUB} target="_blank" rel="noreferrer">
        GitHub ↗
      </a>
    </nav>
  );
}

export default function App() {
  const route = useRoute();
  return (
    <SiteThemeProvider>
      <Navbar page={route.page} />
      {route.page === 'home' && <HomePage />}
      {route.page === 'demos' && <DemosPage />}
      {route.page === 'playground' && (
        <PlaygroundPage key={route.param ?? 'custom'} demoId={route.param} />
      )}
      {route.page === 'docs' && <DocsPage sectionId={route.param} />}
      <footer className="footer">
        <span>Développé par Pierre-Olivier Brillant</span>
        |
        <a href={GITHUB} target="_blank" rel="noreferrer">
          <FaGithub aria-hidden="true" /> GitHub
        </a>
        |
        <a href={NPM} target="_blank" rel="noreferrer">
          <FaNpm aria-hidden="true" />
        </a>
      </footer>
    </SiteThemeProvider>
  );
}
