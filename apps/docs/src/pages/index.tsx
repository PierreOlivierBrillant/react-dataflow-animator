import { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { demosById } from '../site-content';
import { DataFlowPlayer } from 'react-dataflow-animator';

const INSTALL_COMMAND = 'npm install react-dataflow-animator';

const features = [
  {
    title: 'Placement automatique',
    text: 'Grilles linéaires ou disposition circulaire - aucune -coordonnée (x, y) à fournir.',
  },
  {
    title: 'Lecteur intégré',
    text: 'Lecture/Pause, navigation par étapes, ligne du temps cliquable et plein écran.',
  },
  {
    title: 'Démonstrations et playground inclus',
    text: "Les scénarios de démonstration, l'éditeur JSON et la référence API sont disponibles directement dans le site.",
  },
];

export default function Home() {
  const [copied, setCopied] = useState(false);

  const copyInstall = async () => {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Layout title="Accueil" description="Animations de flux de données pour React et Docusaurus.">
      <header className="hero">
        <h1>
          React <span className="grad">DataFlow Animator</span>
        </h1>
        <p className="lead">
          Un composant React qui compile une description JSON en une animation
          déterministe et navigable. Idéal pour illustrer des architectures dans
          des démonstrations et de la documentation.
        </p>
        <div className="hero-cta">
          <Link className="btn btn-primary" to="/docs/intro">
            Explorer les démos
          </Link>
          <Link className="btn btn-secondary" to="/playground">
            Lire la documentation
          </Link>
        </div>
        <div className="install">
          <span className="install-cmd"><span className="install-prompt">$</span>npm i react-dataflow-animator</span>
          <button type="button" className="install-copy" onClick={copyInstall} aria-label="Copier la commande">
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            )}
          </button>
        </div>
        <div className="hero-stage">
          <DataFlowPlayer theme="auto" spec={demosById.spa.spec} autoPlay loop controls={false} height={360} />
        </div>
      </header>

      <main className="page-container">
        <div className="features">
          {features.map((feature) => (
            <div key={feature.title} className="feature">
              <div className="feature-icon">
                {/* Placeholder icon or standard icon since they aren't provided in index.tsx currently */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}