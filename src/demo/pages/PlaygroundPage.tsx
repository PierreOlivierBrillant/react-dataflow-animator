import { useState } from 'react';
import { DataFlowPlayer, type DataFlowPlayerProps, type DataFlowSpec } from '../../lib';
import { demos, demosById } from '../demos';
import { navigate } from '../router';

function validate(value: string): DataFlowSpec {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') throw new Error('La racine doit être un objet.');
  for (const key of ['static_objects', 'dynamic_objects', 'actions'] as const) {
    if (!Array.isArray(parsed[key])) throw new Error(`"${key}" doit être un tableau.`);
  }
  return parsed as DataFlowSpec;
}

export function PlaygroundPage({ demoId }: { demoId?: string }) {
  const initial = demosById[demoId ?? ''] ?? demos[0];
  const [text, setText] = useState(() => JSON.stringify(initial.spec, null, 2));
  const [spec, setSpec] = useState<DataFlowSpec>(initial.spec);
  const [error, setError] = useState<string | null>(null);
  const [density, setDensity] = useState<NonNullable<DataFlowPlayerProps['density']>>(
    'comfortable',
  );

  const onChange = (value: string) => {
    setText(value);
    try {
      setSpec(validate(value));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const format = () => {
    try {
      setText(JSON.stringify(validate(text), null, 2));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="container">
      <h1 className="section-title">Playground</h1>
      <p className="section-sub">
        Édite la spécification à gauche : l’animation se met à jour à droite en
        temps réel.
      </p>
      <div className="pg">
        <div className="pg-editor">
          <div className="pg-toolbar">
            <select
              className="pg-select"
              value={demoId && demosById[demoId] ? demoId : ''}
              onChange={(e) => e.target.value && navigate(`#/playground/${e.target.value}`)}
            >
              <option value="">Charger une démo…</option>
              {demos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <button type="button" className="pg-btn" onClick={format}>
              Formater le JSON
            </button>
            <select
              className="pg-select"
              value={density}
              onChange={(e) =>
                setDensity(e.target.value as NonNullable<DataFlowPlayerProps['density']>)
              }
              title="Densité visuelle"
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Confortable</option>
              <option value="spacious">Spacieux</option>
            </select>
          </div>
          <textarea
            className="pg-textarea"
            value={text}
            spellCheck={false}
            onChange={(e) => onChange(e.target.value)}
          />
          {error ? <div className="pg-error">Erreur : {error}</div> : null}
        </div>
        <div className="pg-preview">
          <DataFlowPlayer
            key={demoId ?? 'custom'}
            spec={spec}
            density={density}
            height={460}
          />
        </div>
      </div>
    </div>
  );
}
