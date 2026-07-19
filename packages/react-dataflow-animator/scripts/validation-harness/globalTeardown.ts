import { readAbResults, type AbResultRow } from './abResults';
import {
  COMPARE_THRESHOLD,
  judge,
  readRatchet,
  statusLabel,
  type CellVerdict,
} from './ratchet';

function printSelfTest(rows: AbResultRow[]): void {
  if (rows.length === 0) return;
  const lines = [
    '',
    'Self-test calibration — A vs itself (0.00% required everywhere)',
    '',
    'label'.padEnd(40) + 'diff',
  ];
  for (const r of rows) {
    lines.push(r.label.padEnd(40) + `${(r.ratio * 100).toFixed(4)}%`);
  }
  const failing = rows.filter((r) => r.ratio !== 0);
  lines.push(
    '',
    failing.length > 0
      ? `${failing.length}/${rows.length} check(s) NOT calibrated (non-zero drift) — do not trust compare.ab.spec.ts yet.`
      : `All ${rows.length} check(s) at exactly 0.00% — the gate is calibrated.`
  );
  console.log(lines.join('\n'));
}

function printCompare(verdicts: CellVerdict[], threshold: number): void {
  const lines = [
    '',
    'A/B compare — React vs. vanilla DOM',
    '',
    'label'.padEnd(30) + 'diff'.padEnd(12) + 'status',
  ];
  for (const v of verdicts) {
    lines.push(
      v.label.padEnd(30) +
        `${(v.ratio * 100).toFixed(4)}%`.padEnd(12) +
        statusLabel(v)
    );
  }

  const ok = verdicts.filter((v) => v.status === 'ok').length;
  const expected = verdicts.filter((v) => v.status === 'expected').length;
  const regressions = verdicts.filter((v) => v.status === 'regression');
  const stale = verdicts.filter((v) => v.status === 'to-remove');

  lines.push(
    '',
    `${ok}/${verdicts.length} cell(s) within the ${(threshold * 100).toFixed(2)}% threshold, ` +
      `${expected} expected to differ (ratchet).`
  );
  if (regressions.length)
    lines.push(
      '',
      `${regressions.length} REGRESSION(S) — a cell exceeded the threshold without being`,
      'listed in compare-ratchet.json:',
      ...regressions.map((v) => `  ${v.label}`)
    );
  if (stale.length)
    lines.push(
      '',
      `${stale.length} ratchet entr(ies) NOW PASS. The ratchet may only shrink:`,
      'delete these from compare-ratchet.json.',
      ...stale.map((v) => `  ${v.label}`)
    );
  console.log(lines.join('\n'));
}

/**
 * Mount-vs-update: the retained renderer against itself.
 *
 * `html` is the verdict that counts. The pixel column is printed beside it as a
 * corroborating signal, but a structural divergence is real whether or not it
 * has grown large enough to move a pixel yet, so it is the one that decides.
 */
function printMountUpdate(rows: AbResultRow[]): void {
  if (rows.length === 0) return;
  const lines = [
    '',
    'mount(t) vs mount(0)+update(...) — the retained renderer against itself',
    '',
    'label'.padEnd(30) + 'html'.padEnd(10) + 'pixels'.padEnd(12) + 'note',
  ];
  for (const r of rows) {
    lines.push(
      r.label.padEnd(30) +
        (r.htmlEqual ? 'equal' : 'DIFF').padEnd(10) +
        `${(r.ratio * 100).toFixed(4)}%`.padEnd(12) +
        (r.note ?? '')
    );
  }
  const asserted = rows.filter((r) => !r.note);
  const drifting = asserted.filter((r) => !r.htmlEqual);
  lines.push(
    '',
    drifting.length > 0
      ? `${drifting.length}/${asserted.length} asserted cell(s) DRIFTED — retained mode does not converge to a fresh mount.`
      : `All ${asserted.length} asserted cell(s) identical; ${rows.length - asserted.length} excluded (documented path dependence).`
  );
  console.log(lines.join('\n'));
}

/**
 * Runs exactly once, in the main process, after every worker has finished —
 * unlike a `test.afterAll` inside the spec, immune to the per-worker module
 * resets that per-test failures trigger (see abResults.ts).
 *
 * The compare VERDICT lives here rather than in the spec because rule 3 of the
 * ratchet (a listed cell that now passes) cannot be judged from inside a single
 * test: that test passed. Only a view of the whole grid can tell a shrinking
 * ratchet from a stale one. Throwing is what makes Playwright exit non-zero.
 */
export default function globalTeardown(): void {
  printSelfTest(readAbResults('selftest'));
  printMountUpdate(readAbResults('mountupdate'));

  const compareRows = readAbResults('compare');
  if (compareRows.length === 0) return;

  const verdicts = judge(compareRows, readRatchet(), COMPARE_THRESHOLD);
  printCompare(verdicts, COMPARE_THRESHOLD);

  const stale = verdicts.filter((v) => v.status === 'to-remove');
  if (stale.length > 0) {
    throw new Error(
      `${stale.length} ratchet entr(ies) now pass and must be removed from ` +
        'compare-ratchet.json — see the table above.'
    );
  }
}
