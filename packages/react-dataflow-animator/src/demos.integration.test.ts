import { describe, expect, it } from 'vitest';
import type { Action, DataFlowSpec } from './types';
import { compile } from './engine/compiler';
import { clientServer } from '../../../apps/docs/src/site-content/demos/clientServer';
import { microservices } from '../../../apps/docs/src/site-content/demos/microservices';
import { signalr } from '../../../apps/docs/src/site-content/demos/signalr';
import { spa } from '../../../apps/docs/src/site-content/demos/spa';
import { crypto } from '../../../apps/docs/src/site-content/demos/crypto';
import { tls } from '../../../apps/docs/src/site-content/demos/tls';
import { oauth } from '../../../apps/docs/src/site-content/demos/oauth';
import { dos } from '../../../apps/docs/src/site-content/demos/dos';
import { ddos } from '../../../apps/docs/src/site-content/demos/ddos';
import { dns } from '../../../apps/docs/src/site-content/demos/dns';
import { cicd } from '../../../apps/docs/src/site-content/demos/cicd';
import { raft } from '../../../apps/docs/src/site-content/demos/raft';
import { messageQueue } from '../../../apps/docs/src/site-content/demos/messageQueue';
import { cdn } from '../../../apps/docs/src/site-content/demos/cdn';
import { loadBalancer } from '../../../apps/docs/src/site-content/demos/loadBalancer';
import { kubernetes } from '../../../apps/docs/src/site-content/demos/kubernetes';
import { payment } from '../../../apps/docs/src/site-content/demos/payment';
import { blockchain } from '../../../apps/docs/src/site-content/demos/blockchain';
import { smtp } from '../../../apps/docs/src/site-content/demos/smtp';
import { graphql } from '../../../apps/docs/src/site-content/demos/graphql';
import { webhook } from '../../../apps/docs/src/site-content/demos/webhook';
import { circular } from '../../../apps/docs/src/site-content/demos/circular';
import { collision } from '../../../apps/docs/src/site-content/demos/collision';

function collectIds(actions: Action[]): Set<string> {
  const ids = new Set<string>();
  for (const a of actions) {
    if (a.id) ids.add(a.id);
    if (a.type === 'parallel') {
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
    if (a.type === 'parallel') {
      const childRefs = collectRefs(a.actions);
      for (const ref of childRefs) refs.push(ref);
    }
  }
  return refs;
}

const KNOWN_BROKEN = new Set<string>();

// Demo specs are now localized builders
// `(locale) => DataFlowSpec` (some may remain objects). We compile
// EACH locale: the structure (steps, references) must be valid regardless
// of the language — only the text changes.
type SpecOrBuilder = DataFlowSpec | ((locale: 'en' | 'fr') => DataFlowSpec);
const resolveSpec = (s: SpecOrBuilder, locale: 'en' | 'fr'): DataFlowSpec =>
  typeof s === 'function' ? s(locale) : s;

const demoBuilders: Array<[string, SpecOrBuilder]> = [
  ['clientServer', clientServer],
  ['microservices', microservices],
  ['signalr', signalr],
  ['spa', spa],
  ['crypto', crypto],
  ['tls', tls],
  ['oauth', oauth],
  ['dos', dos],
  ['ddos', ddos],
  ['dns', dns],
  ['cicd', cicd],
  ['raft', raft],
  ['messageQueue', messageQueue],
  ['cdn', cdn],
  ['loadBalancer', loadBalancer],
  ['kubernetes', kubernetes],
  ['payment', payment],
  ['blockchain', blockchain],
  ['smtp', smtp],
  ['graphql', graphql],
  ['webhook', webhook],
  ['circular', circular],
  ['collision', collision],
];

const LOCALES = ['en', 'fr'] as const;
const demos: Array<[string, DataFlowSpec]> = demoBuilders.flatMap(([name, s]) =>
  LOCALES.map(
    (locale) =>
      [`${name} (${locale})`, resolveSpec(s, locale)] as [string, DataFlowSpec]
  )
);

describe.each(demos)('demo %s', (name, spec) => {
  const result = compile(spec);
  const broken = KNOWN_BROKEN.has(name);

  // it.fails: the test is expected to fail (known bug); passes when the assertion fails.
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
      const allIds = collectIds(spec.timeline);
      const allRefs = collectRefs(spec.timeline);
      for (const ref of allRefs) {
        expect(
          allIds.has(ref),
          `actionId "${ref}" référencé mais non défini dans ${name}`
        ).toBe(true);
      }
    }
  );
});
