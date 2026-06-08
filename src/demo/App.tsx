import { useState } from 'react';
import './demo.css';
import { DemosPage } from './pages/DemosPage';
import { InstallPage } from './pages/InstallPage';
import { ApiDocsPage } from './pages/ApiDocsPage';

const tabs = [
  { id: 'demos', label: 'Démos', render: () => <DemosPage /> },
  { id: 'install', label: 'Installation', render: () => <InstallPage /> },
  { id: 'api', label: 'Documentation API', render: () => <ApiDocsPage /> },
];

export default function App() {
  const [active, setActive] = useState('demos');
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="demo-app">
      <header className="demo-header">
        <h1>React DataFlow Animator</h1>
        <p>
          Animations déterministes de flux de données, pilotées par une
          spécification JSON.
        </p>
      </header>
      <nav className="demo-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`demo-tab${tab.id === active ? ' is-active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main>{current.render()}</main>
    </div>
  );
}
