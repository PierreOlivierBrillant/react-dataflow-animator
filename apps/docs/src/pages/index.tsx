import { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { demosById } from '../site-content';
import { DataFlowPlayer } from 'react-dataflow-animator';

const INSTALL_COMMAND = 'npm install react-dataflow-animator';

const features = [
  {
    title: 'Package npm autonome',
    text: 'La librairie est publiée séparément, avec son propre build, ses tests et son versioning indépendant du site.',
  },
  {
    title: 'Docusaurus intégré',
    text: 'Les pages, les démos interactives et la documentation MDX cohabitent nativement dans un seul et même site.',
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
          <button type="button" className="install-copy" onClick={copyInstall}>
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
        <div className="hero-stage">
          <DataFlowPlayer theme="auto" spec={demosById.spa.spec} autoPlay loop controls={false} height={360} />
        </div>
      </header>

      <main className="container">
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