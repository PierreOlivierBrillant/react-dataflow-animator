import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { dataFlowSchema } from 'react-dataflow-animator';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(dataFlowSchema);

export interface SpecError {
  path: string;
  message: string;
}

export function validateSpec(input: unknown): SpecError[] {
  if (validate(input)) return [];
  return formatErrors(validate.errors ?? []);
}

function formatErrors(errors: ErrorObject[]): SpecError[] {
  // anyOf/oneOf parentes : bruit pur, les sous-erreurs de chaque branche
  // (const, required, type…) portent l'information utile.
  const useful = errors.filter(
    (e) => e.keyword !== 'anyOf' && e.keyword !== 'oneOf'
  );

  // Regrouper les erreurs "const" par chemin pour détecter les unions
  // discriminées (ex. : 7 branches anyOf avec action_type: { const: … }).
  const constByPath = new Map<string, string[]>();
  for (const e of useful) {
    if (e.keyword === 'const') {
      const path = e.instancePath || '/';
      const vals = constByPath.get(path) ?? [];
      vals.push(String((e.params as { allowedValue: unknown }).allowedValue));
      constByPath.set(path, vals);
    }
  }

  // Parent d'un discriminateur : si plusieurs const coexistent sur le même
  // chemin (ex. /actions/0/action_type), les erreurs "required" sur le parent
  // (/actions/0) sont de faux positifs issus des branches non-sélectionnées.
  const discriminatedParents = new Set<string>();
  for (const [path, vals] of constByPath) {
    if (vals.length > 1) {
      const lastSlash = path.lastIndexOf('/');
      discriminatedParents.add(lastSlash > 0 ? path.slice(0, lastSlash) : path);
    }
  }

  const seen = new Set<string>();
  const result: SpecError[] = [];

  for (const e of useful) {
    const path = e.instancePath || '/';

    if (e.keyword === 'const') {
      const key = `const:${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const vals = constByPath.get(path) ?? [];
      result.push({
        path,
        message:
          vals.length > 1
            ? `valeur invalide — valeurs acceptées : ${vals.map((v) => `"${v}"`).join(', ')}`
            : `valeur invalide — attendu : "${vals[0]}"`,
      });
      continue;
    }

    if (e.keyword === 'required') {
      if (discriminatedParents.has(path)) continue; // faux positif
      const { missingProperty } = e.params as { missingProperty: string };
      const key = `required:${path}:${missingProperty}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        path,
        message: `champ obligatoire manquant : "${missingProperty}"`,
      });
      continue;
    }

    const formatted = formatSingle(e);
    const key = `${e.keyword}:${path}:${formatted.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(formatted);
  }

  return result;
}

function formatSingle(e: ErrorObject): SpecError {
  const path = e.instancePath || '/';
  switch (e.keyword) {
    case 'enum': {
      const { allowedValues } = e.params as { allowedValues: unknown[] };
      return {
        path,
        message: `valeur invalide — valeurs acceptées : ${allowedValues.map((v) => `"${v}"`).join(', ')}`,
      };
    }
    case 'type': {
      const { type } = e.params as { type: string };
      return { path, message: `type incorrect — attendu : ${type}` };
    }
    default:
      return { path, message: e.message ?? 'erreur inconnue' };
  }
}
