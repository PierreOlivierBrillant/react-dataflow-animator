import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { highlightCode } from 'react-dataflow-animator';
import { DemoPlayer, demos, type Demo } from '../site-content';

const categories: Demo['category'][] = ['Cas réels', 'Bases'];

export default function DemosPage() {
  return (
    <Layout title="Démos" description="Catalogue de démonstrations prêtes à l’emploi.">
      <main className="page-shell demos-shell">
        <header className="section-head">
          <p className="eyebrow">Bibliothèque d’exemples</p>
          <h1>Démos</h1>
          <p>
            Les scénarios ci-dessous sont
            affichés tels quels dans Docusaurus. Chaque démo peut être ouverte dans le playground.
          </p>
        </header>

        {categories.map((category) => (
          <section key={category} className="demo-group">
            <h2>{category}</h2>
            <div className="demo-list">
              {demos
                .filter((demo) => demo.category === category)
                .map((demo) => (
                  <article key={demo.id} className="card-surface demo-card">
                    <div className="demo-card-head">
                      <div>
                        <h3>{demo.title}</h3>
                        <p>{demo.description}</p>
                      </div>
                      <span className="demo-tag">{demo.category}</span>
                    </div>
                    <DemoPlayer spec={demo.spec} />
                    <div className="demo-card-actions">
                      <Link to={`/playground?demo=${demo.id}`}>Ouvrir dans le playground</Link>
                    </div>
                    <details>
                      <summary>Voir la spécification JSON</summary>
                      <pre className="rdfa-code-block">
                        <code
                          dangerouslySetInnerHTML={{
                            __html: highlightCode(JSON.stringify(demo.spec, null, 2), 'json'),
                          }}
                        />
                      </pre>
                    </details>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </main>
    </Layout>
  );
}