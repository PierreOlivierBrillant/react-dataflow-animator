import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * TEMPORARY BRIDGE — delete me at step 2.6.
 *
 * Until the React components are removed, the icon registries exist twice: the
 * JSX ones in `packages/react-dataflow-animator/src/components/nodes/` and the
 * framework-free ones here in core. The duplication is deliberate (the React
 * package's `src` is frozen for this phase), but a registry that gains an entry
 * on one side only would show up as an unexplained pixel diff in the A/B gate,
 * with no obvious culprit. This check keeps the two KEY SETS identical.
 *
 * It compares names, not geometry: the glyph paths are verified by the pixel
 * gate itself, which is a far stronger check than any string comparison.
 *
 * A build-time script rather than a unit test on purpose — it is the same kind
 * of consistency guard as `check:schema` and `check:subicons`, and a core unit
 * test has no business reading a sibling package's sources.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreSrc = join(__dirname, '../src/dom/icons');
const reactNodes = join(
  __dirname,
  '../../react-dataflow-animator/src/components/nodes'
);

if (!existsSync(reactNodes)) {
  console.error(
    'ERROR: the React icon registries are gone — step 2.6 has landed.\n' +
      'Core is now the single source of truth, so this bridge has no counterpart\n' +
      'left to compare against. Delete scripts/check-icon-parity.mjs and its\n' +
      '`check:icons` script instead of keeping a check that can never pass.'
  );
  process.exit(1);
}

const read = (path) => readFileSync(path, 'utf8');
const keysOf = (source, regex) => [...source.matchAll(regex)].map((m) => m[1]);

/** Compares two key sets and reports both directions of drift. */
function compare(label, coreKeys, reactKeys) {
  const core = new Set(coreKeys);
  const react = new Set(reactKeys);
  const missing = [...react].filter((k) => !core.has(k)).sort();
  const extra = [...core].filter((k) => !react.has(k)).sort();

  if (missing.length === 0 && extra.length === 0) {
    console.log(`${label}: ${core.size} entries, in sync`);
    return true;
  }
  console.error(`ERROR: ${label} registries have drifted.`);
  if (missing.length)
    console.error(`  present in React but missing from core: ${missing.join(', ')}`);
  if (extra.length)
    console.error(`  present in core but missing from React: ${extra.join(', ')}`);
  return false;
}

// ─── Node pictograms ────────────────────────────────────────────────────────
// `switch` and `push_button` are not table entries on either side: their
// geometry is a function of the `closed` fraction, so both implementations
// build them in code.
const STATEFUL = ['switch', 'push_button'];

const coreNodeIcons = [
  ...keysOf(read(join(coreSrc, 'nodeIconShapes.ts')), /^ {2}(\w+): \[/gm),
  ...STATEFUL,
];
const reactNodeIconsSource = read(join(reactNodes, 'nodeIcons.tsx'));
const reactNodeIcons = [
  ...keysOf(reactNodeIconsSource, /^ {2}(\w+): svg\(/gm),
  ...STATEFUL,
];

// Guard the guards: a regex that silently matched nothing would make the
// comparison trivially pass.
if (reactNodeIcons.length <= STATEFUL.length)
  throw new Error('nodeIcons.tsx: parsed no entries — the source shape changed.');

// ─── Tech sub-icons ─────────────────────────────────────────────────────────
const KEY = /^ {2}(?:'([^']+)'|"([^"]+)"|(\w+)):\s*\{\s*(?:Icon|icon):/gm;
const subKeys = (source) =>
  [...source.matchAll(KEY)].map((m) => m[1] ?? m[2] ?? m[3]);

const coreSubIcons = subKeys(read(join(coreSrc, 'subIconCatalog.ts')));
const reactSubIconsSource = read(join(reactNodes, 'subIcons.tsx'));
const reactSubIcons = subKeys(
  reactSubIconsSource.slice(
    reactSubIconsSource.indexOf('const KNOWN'),
    reactSubIconsSource.indexOf('const custom')
  )
);

if (reactSubIcons.length === 0)
  throw new Error('subIcons.tsx: parsed no KNOWN entries — the source shape changed.');

const ok =
  compare('node pictograms', coreNodeIcons, reactNodeIcons) &&
  compare('tech sub-icons', coreSubIcons, reactSubIcons);

if (!ok) {
  console.error(
    '\nThe two registries must stay in step until step 2.6 deletes the React one.'
  );
  process.exit(1);
}
