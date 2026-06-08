import { DataFlowPlayer } from '../../lib';
import { demos, type Demo } from '../demos';

const categories: Demo['category'][] = ['Cas réels', 'Bases'];

export function DemosPage() {
  return (
    <div className="container">
      <h1 className="section-title">Démos</h1>
      <p className="section-sub">
        Des exemples prêts à l’emploi. Ouvre-en un dans le{' '}
        <a href="#/playground">playground</a> pour l’éditer en direct.
      </p>

      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="section-title" style={{ fontSize: 18, marginTop: 28 }}>
            {cat}
          </h2>
          {demos
            .filter((d) => d.category === cat)
            .map((demo) => (
              <div className="card" key={demo.id}>
                <div className="card-head">
                  <div>
                    <h2>{demo.title}</h2>
                    <p className="desc">{demo.description}</p>
                  </div>
                  <span className="cat-tag">{demo.category}</span>
                </div>
                <DataFlowPlayer spec={demo.spec} />
                <div className="card-actions">
                  <a href={`#/playground/${demo.id}`}>Ouvrir dans le playground →</a>
                </div>
                <details style={{ marginTop: 12 }}>
                  <summary>Voir la spécification JSON</summary>
                  <pre className="code">{JSON.stringify(demo.spec, null, 2)}</pre>
                </details>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
