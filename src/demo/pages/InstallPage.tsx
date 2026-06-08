const installCmd = 'npm install react-dataflow-animator';

const usage = `import { DataFlowPlayer } from 'react-dataflow-animator';
import 'react-dataflow-animator/styles.css';

const spec = {
  is_navigable: true,
  direction: 'left-to-right',
  static_objects: [
    { id: 'client', object_type: 'laptop', text: 'Navigateur', lane: 1 },
    { id: 'api', object_type: 'server', text: 'API', lane: 2 },
  ],
  dynamic_objects: [
    { id: 'req', object_type: 'http_packet',
      packet_content: { header: 'GET /' } },
  ],
  actions: [
    { action_type: 'move', object: 'req', from: 'client', to: 'api' },
  ],
};

export default function Demo() {
  return <DataFlowPlayer spec={spec} />;
}`;

const docusaurus = `// src/css/custom.css (chargé sur tout le site)
@import 'react-dataflow-animator/styles.css';

// Dans un fichier .mdx
import { DataFlowPlayer } from 'react-dataflow-animator';

<DataFlowPlayer spec={{
  is_navigable: true,
  static_objects: [ /* … */ ],
  dynamic_objects: [ /* … */ ],
  actions: [ /* … */ ],
}} />`;

export function InstallPage() {
  return (
    <div className="demo-card">
      <h2>Installation</h2>
      <p className="demo-desc">
        La librairie est publiée sur npm. React 18 ou 19 est requis (peer
        dependency).
      </p>
      <pre className="demo-code">{installCmd}</pre>

      <h3 className="api-section-title">Utilisation</h3>
      <p className="demo-desc">
        Importez le composant <code className="demo-inline">DataFlowPlayer</code>{' '}
        et la feuille de styles une seule fois.
      </p>
      <pre className="demo-code">{usage}</pre>

      <h3 className="api-section-title">Intégration Docusaurus</h3>
      <p className="demo-desc">
        Le composant est SSR-safe : il s’hydrate sans divergence et fonctionne
        directement dans un fichier <code className="demo-inline">.mdx</code>.
        Importez le CSS une fois (par ex. dans{' '}
        <code className="demo-inline">src/css/custom.css</code>).
      </p>
      <pre className="demo-code">{docusaurus}</pre>
    </div>
  );
}
