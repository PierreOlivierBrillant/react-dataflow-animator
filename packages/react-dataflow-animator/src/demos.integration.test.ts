import { describe, expect, it } from 'vitest';
import type { Action, DataFlowSpec } from './types';
import { compile } from './engine/compiler';
import { clientServer } from '../../../apps/docs/src/site-content/demos/clientServer';
import { microservices } from '../../../apps/docs/src/site-content/demos/microservices';
import { signalr } from '../../../apps/docs/src/site-content/demos/signalr';
import { spa } from '../../../apps/docs/src/site-content/demos/spa';

function collectIds(actions: Action[]): Set<string> {
  const ids = new Set<string>();
  for (const a of actions) {
    if (a.id) ids.add(a.id);
    if (a.action_type === 'parallel') {
      for (const id of collectIds(a.actions)) ids.add(id);
    }
  }
  return ids;
}

function collectRefs(actions: Action[]): string[] {
  const refs: string[] = [];
  for (const a of actions) {
    if (a.wait_for) refs.push(a.wait_for);
    if (a.keep_until) refs.push(a.keep_until);
    if (a.action_type === 'parallel') {
      const childRefs = collectRefs(a.actions);
      for (const ref of childRefs) refs.push(ref);
    }
  }
  return refs;
}

// clientServer a un wait_for:'dbwork' sans action id:'dbwork' correspondante.
// Bug à corriger dans un PR séparé. Les 2 assertions concernées sont marquées it.fails.
const KNOWN_BROKEN = new Set(['clientServer']);

const demos: Array<[string, DataFlowSpec]> = [
  ['clientServer', clientServer as unknown as DataFlowSpec],
  ['microservices', microservices as unknown as DataFlowSpec],
  ['signalr', signalr as unknown as DataFlowSpec],
  ['spa', spa as unknown as DataFlowSpec],
];

describe.each(demos)('demo %s', (name, spec) => {
  const result = compile(spec);
  const broken = KNOWN_BROKEN.has(name);

  // it.fails : le test est attendu en échec (bug connu) ; passe quand l'assertion échoue.
  (broken ? it.fails : it)('ne produit aucun warning', () => {
    expect(result.warnings).toEqual([]);
  });

  it('timeline.durationMs > 0', () => {
    expect(result.timeline.durationMs).toBeGreaterThan(0);
  });

  it('au moins une étape', () => {
    expect(result.timeline.steps.length).toBeGreaterThan(0);
  });

  (broken ? it.fails : it)(
    'tous les actionIds référencés (wait_for, keep_until) existent',
    () => {
      const allIds = collectIds(spec.actions);
      const allRefs = collectRefs(spec.actions);
      for (const ref of allRefs) {
        expect(
          allIds.has(ref),
          `actionId "${ref}" référencé mais non défini dans ${name}`
        ).toBe(true);
      }
    }
  );
});
