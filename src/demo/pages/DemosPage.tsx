import { DataFlowPlayer } from '../../lib';
import { demos } from '../demos';

export function DemosPage() {
  return (
    <div>
      {demos.map((demo) => (
        <div className="demo-card" key={demo.id}>
          <h2>{demo.title}</h2>
          <p className="demo-desc">{demo.description}</p>
          <DataFlowPlayer spec={demo.spec} debug={false} />
          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', color: 'var(--demo-muted)' }}>
              Voir la spécification JSON
            </summary>
            <pre className="demo-code">{JSON.stringify(demo.spec, null, 2)}</pre>
          </details>
        </div>
      ))}
    </div>
  );
}
