import { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import { type DataFlowPlayerProps, type DataFlowSpec } from 'react-dataflow-animator';
import { CodeEditor, DemoPlayer, demos, demosById } from '../site-content';

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
    <Layout title="Playground" description="Éditeur interactif pour tester vos spécifications JSON.">
      <main className="page-shell">
        <header className="section-head">
          <p className="eyebrow">Édition en direct</p>
          <h1>Playground</h1>
          <p>
            Édite la spécification JSON à gauche et l'animation se met à jour en temps réel à droite.
          </p>
        </header>

        <section className="playground-shell">
          <div className="card-surface playground-editor">
            <div className="playground-toolbar">
              <select value={demoId} onChange={(event) => setDemoId(event.target.value)}>
                {demos.map((demo) => (
                  <option key={demo.id} value={demo.id}>
                    {demo.title}
                  </option>
                ))}
              </select>
              <button type="button" className="button button--sm button--primary" onClick={format}>
                Formater le JSON
              </button>
              <select value={density} onChange={(event) => setDensity(event.target.value as NonNullable<DataFlowPlayerProps['density']>)}>
                <option value="compact">Compact</option>
                <option value="comfortable">Confortable</option>
                <option value="spacious">Spacieux</option>
              </select>
            </div>
            <CodeEditor value={text} onChange={onChange} language="json" />
            {error ? <p className="playground-error">Erreur: {error}</p> : null}
          </div>
          <div className="card-surface playground-preview">
            <DemoPlayer key={demoId} spec={spec} density={density} height={460} />
          </div>
        </section>
      </main>
    </Layout>
  );
}