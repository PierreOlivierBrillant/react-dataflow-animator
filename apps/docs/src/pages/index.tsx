import { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { DemoPlayer, demosById } from '../site-content';

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
    title: 'Démos et playground inclus',
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
          <p className="eyebrow">Monorepo React + Docusaurus</p>
          <h1>Documenter un flux, puis le jouer dans la même page.</h1>
          <p className="hero-lead">
            React DataFlow Animator compile une spécification JSON en animation
            déterministe, SSR-safe et navigable, pensée pour les docs techniques,
            les cours et les démonstrations produit.
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
          <DemoPlayer spec={demosById.spa.spec} autoPlay loop controls={false} height={360} />
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

        <section className="split-section">
          <div>
            <p className="eyebrow">Architecture du dépôt</p>
            <h2>Un package npm, un site — un seul dépôt.</h2>
            <p>
              Le monorepo sépare clairement la librairie publiée sur npm et le site de documentation.
              La librairie peut être versionnée et publiée indépendamment du contenu du site.
            </p>
            <p>
              Les démos sont exécutables dans le playground, la référence API est générée
              automatiquement depuis le JSON Schema, et la documentation vit en MDX natif Docusaurus.
            </p>
          </div>
          <div className="card-surface showcase-code">
            <pre>
              <code>{`apps/
  docs/                 # Docusaurus
packages/
  react-dataflow-animator/`}</code>
            </pre>
          </div>
        </section>
      </main>
    </Layout>
  );
}