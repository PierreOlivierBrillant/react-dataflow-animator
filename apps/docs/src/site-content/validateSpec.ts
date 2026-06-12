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
  return [...formatErrors(runSchema(input)), ...checkRefs(input)];
}

// ─── Ajv schema validation ────────────────────────────────────────────────────

function runSchema(input: unknown): ErrorObject[] {
  validate(input);
  return validate.errors ?? [];
}

function formatErrors(errors: ErrorObject[]): SpecError[] {
  // anyOf/oneOf parentes : bruit pur — les sous-erreurs de chaque branche
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

  // Parent d'un discriminateur : les erreurs "required" sur ce parent sont
  // des faux positifs issus des branches non-sélectionnées de l'anyOf.
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
      if (discriminatedParents.has(path)) continue;
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
      const shown = allowedValues.slice(0, 8);
      const rest = allowedValues.length - shown.length;
      const list = shown.map((v) => `"${v}"`).join(', ');
      return {
        path,
        message:
          rest > 0
            ? `valeur invalide — valeurs acceptées : ${list}, … (+${rest} autres)`
            : `valeur invalide — valeurs acceptées : ${list}`,
      };
    }
    case 'type': {
      const { type } = e.params as { type: string };
      return { path, message: `type incorrect — attendu : ${type}` };
    }
    case 'minimum': {
      const { limit } = e.params as { comparison: string; limit: number };
      return { path, message: `valeur trop petite — minimum : ${limit}` };
    }
    case 'multipleOf': {
      const { multipleOf } = e.params as { multipleOf: number };
      return {
        path,
        message:
          multipleOf === 1
            ? 'doit être un entier'
            : `doit être un multiple de ${multipleOf}`,
      };
    }
    default:
      return { path, message: e.message ?? 'erreur inconnue' };
  }
}

// ─── Cross-reference validation ───────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function checkRefs(input: unknown): SpecError[] {
  if (!input || typeof input !== 'object') return [];
  const spec = input as AnyRecord;

  const staticIds = collectIds(spec.static_objects);
  const dynamicIds = collectIds(spec.dynamic_objects);
  const connectionIds = collectIds(spec.connections);
  const actionIds = collectActionIds(spec.actions);

  const errors: SpecError[] = [];

  // align_with référence un autre static_object
  if (Array.isArray(spec.static_objects)) {
    for (let i = 0; i < spec.static_objects.length; i++) {
      const obj = spec.static_objects[i] as AnyRecord;
      checkRef(
        `/static_objects/${i}/align_with`,
        obj.align_with,
        staticIds,
        errors
      );
    }
  }

  // connections.from / .to référencent des static_objects
  if (Array.isArray(spec.connections)) {
    for (let i = 0; i < spec.connections.length; i++) {
      const conn = spec.connections[i] as AnyRecord;
      checkRef(`/connections/${i}/from`, conn.from, staticIds, errors);
      checkRef(`/connections/${i}/to`, conn.to, staticIds, errors);
    }
  }

  if (Array.isArray(spec.actions)) {
    walkActions(
      spec.actions,
      '/actions',
      staticIds,
      dynamicIds,
      connectionIds,
      actionIds,
      errors
    );
  }

  return errors;
}

function walkActions(
  actions: unknown[],
  basePath: string,
  staticIds: Set<string>,
  dynamicIds: Set<string>,
  connectionIds: Set<string>,
  actionIds: Set<string>,
  errors: SpecError[]
): void {
  for (let i = 0; i < actions.length; i++) {
    if (!actions[i] || typeof actions[i] !== 'object') continue;
    const a = actions[i] as AnyRecord;
    const p = `${basePath}/${i}`;

    // Ordonnancement inter-actions
    checkRef(`${p}/wait_for`, a.wait_for, actionIds, errors);
    checkRef(`${p}/keep_until`, a.keep_until, actionIds, errors);

    switch (a.action_type) {
      case 'move':
        checkRef(`${p}/object`, a.object, dynamicIds, errors);
        checkRef(`${p}/from`, a.from, staticIds, errors);
        checkRef(`${p}/to`, a.to, staticIds, errors);
        break;
      case 'arrow':
        checkRef(`${p}/from`, a.from, staticIds, errors);
        checkRef(`${p}/to`, a.to, staticIds, errors);
        break;
      case 'loading':
      case 'set_content':
      case 'comment':
        checkRef(`${p}/object`, a.object, staticIds, errors);
        break;
      case 'highlight': {
        // object peut être un static_object OU une connection (par ID)
        // Merge explicite pour éviter tout problème de transpilation Set spread
        const highlightIds = new Set<string>(Array.from(staticIds));
        for (const id of Array.from(connectionIds)) highlightIds.add(id);
        checkRef(`${p}/object`, a.object, highlightIds, errors);
        break;
      }
      case 'parallel':
        if (Array.isArray(a.actions)) {
          walkActions(
            a.actions,
            `${p}/actions`,
            staticIds,
            dynamicIds,
            connectionIds,
            actionIds,
            errors
          );
        }
        break;
    }
  }
}

function checkRef(
  path: string,
  value: unknown,
  available: Set<string>,
  errors: SpecError[]
): void {
  if (typeof value !== 'string' || available.has(value)) return;
  // Array.from évite les problèmes de transpilation babel avec [...]Set
  const list = Array.from(available)
    .map((id) => `"${id}"`)
    .join(', ');
  errors.push({
    path,
    message: list
      ? `ID inconnu : "${value}" — IDs disponibles : ${list}`
      : `ID inconnu : "${value}"`,
  });
}

function collectIds(arr: unknown): Set<string> {
  if (!Array.isArray(arr)) return new Set();
  const ids = new Set<string>();
  for (const item of arr) {
    if (item && typeof item === 'object') {
      const id = (item as AnyRecord).id;
      if (typeof id === 'string') ids.add(id);
    }
  }
  return ids;
}

function collectActionIds(actions: unknown): Set<string> {
  const ids = new Set<string>();
  function walk(arr: unknown): void {
    if (!Array.isArray(arr)) return;
    for (const a of arr) {
      if (!a || typeof a !== 'object') continue;
      const action = a as AnyRecord;
      if (typeof action.id === 'string') ids.add(action.id);
      if (action.action_type === 'parallel') walk(action.actions);
    }
  }
  walk(actions);
  return ids;
}
