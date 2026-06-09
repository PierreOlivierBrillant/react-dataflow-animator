import { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import { DataFlowPlayer, type DataFlowPlayerProps, type DataFlowSpec } from '../../../../packages/react-dataflow-animator/src';
import { CodeEditor, demos, demosById } from '../site-content';

function validate(value: string): DataFlowSpec {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('La racine doit être un objet JSON.');
  }
  for (const key of ['static_objects', 'dynamic_objects', 'actions'] as const) {
    if (!Array.isArray(parsed[key])) {
      throw new Error(`"${key}" doit être un tableau.`);
    }
  }
  return parsed as DataFlowSpec;
}

function initialDemoId(): string {
  if (typeof window === 'undefined') return demos[0].id;
  const id = new URLSearchParams(window.location.search).get('demo');
  return id && demosById[id] ? id : demos[0].id;
}

export default function PlaygroundPage() {
  const [demoId, setDemoId] = useState(initialDemoId);
  const [text, setText] = useState(() => JSON.stringify(demosById[initialDemoId()].spec, null, 2));
  const [spec, setSpec] = useState<DataFlowSpec>(() => demosById[initialDemoId()].spec);
  const [error, setError] = useState<string | null>(null);
  const [density, setDensity] = useState<NonNullable<DataFlowPlayerProps['density']>>('comfortable');

  useEffect(() => {
    const demo = demosById[demoId] ?? demos[0];
    setText(JSON.stringify(demo.spec, null, 2));
    setSpec(demo.spec);
    setError(null);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('demo', demo.id);
      window.history.replaceState({}, '', url);
    }
  }, [demoId]);

  const onChange = (value: string) => {
    setText(value);
    try {
      setSpec(validate(value));
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  };

  const format = () => {
    try {
      setText(JSON.stringify(validate(text), null, 2));
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  };

  return (
    <Layout title="Terrain de jeu" description="Éditeur interactif pour tester vos spécifications JSON.">
      <main className="playground-page">
        <header className="section-head" style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 22px 24px' }}>
          <h1 className="section-title">Playground</h1>
          <p className="section-sub">
            Édite la spécification à gauche : l'animation se met à jour à droite en temps réel.
          </p>
        </header>

        <section className="pg">
          <div className="pg-editor">
            <div className="pg-toolbar">
              <select className="pg-select" value={demoId} onChange={(event) => setDemoId(event.target.value)}>
                {demos.map((demo) => (
                  <option key={demo.id} value={demo.id}>
                    {demo.title}
                  </option>
                ))}
              </select>
              <button type="button" className="pg-btn" onClick={format}>
                Formater le JSON
              </button>
              <select className="pg-select" value={density} onChange={(event) => setDensity(event.target.value as NonNullable<DataFlowPlayerProps['density']>)}>
                <option value="compact">Compact</option>
                <option value="comfortable">Confortable</option>
                <option value="spacious">Spacieux</option>
              </select>
            </div>
            <CodeEditor value={text} onChange={onChange} language="json" />
            {error ? <p className="pg-error">Erreur: {error}</p> : null}
          </div>
          <DataFlowPlayer theme="auto" key={demoId} spec={spec} density={density} height={460} />
        </section>
      </main>
    </Layout>
  );
}