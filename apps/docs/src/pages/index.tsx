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
      <header className="hero-shell">
        <div className="hero-copy">
          <h1>React DataFlow Animator</h1>
          <p className="hero-lead">
            Un composant React qui compile une description JSON en une animation
          déterministe et navigable. Idéal pour illustrer des architectures dans
          des démonstrations et de la documentation.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary button--lg" to="/docs/intro">
              Ouvrir la documentation
            </Link>
            <Link className="button button--secondary button--lg" to="/playground">
              Tester le playground
            </Link>
          </div>
          <div className="install-banner">
            <code>{INSTALL_COMMAND}</code>
            <button type="button" className="button button--sm button--primary" onClick={copyInstall}>
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>
        <div className="hero-stage card-surface">
          <DataFlowPlayer theme="auto" spec={demosById.spa.spec} autoPlay loop controls={false} height={360} />
        </div>
      </header>

      <main className="page-shell">
        <section className="feature-grid">
          {features.map((feature) => (
            <article key={feature.title} className="card-surface feature-card">
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
            </article>
          ))}
        </section>
      </main>
    </Layout>
  );
}