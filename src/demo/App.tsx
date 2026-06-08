import './site.css';
import { useRoute } from './router';
import { HomePage } from './pages/HomePage';
import { DemosPage } from './pages/DemosPage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { DocsPage } from './pages/DocsPage';

const GITHUB = 'https://github.com/pobrillant/react-dataflow-animator';

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
        <span className="nav-logo" />
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
      <a className="nav-ghost" href={GITHUB} target="_blank" rel="noreferrer">
        GitHub ↗
      </a>
    </nav>
  );
}

export default function App() {
  const route = useRoute();
  return (
    <>
      <Navbar page={route.page} />
      {route.page === 'home' && <HomePage />}
      {route.page === 'demos' && <DemosPage />}
      {route.page === 'playground' && (
        <PlaygroundPage key={route.param ?? 'custom'} demoId={route.param} />
      )}
      {route.page === 'docs' && <DocsPage sectionId={route.param} />}
      <footer className="footer">
        <div>
          React DataFlow Animator — MIT ·{' '}
          <a href={GITHUB} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://www.npmjs.com/package/react-dataflow-animator" target="_blank" rel="noreferrer">
            npm
          </a>
        </div>
      </footer>
    </>
  );
}
