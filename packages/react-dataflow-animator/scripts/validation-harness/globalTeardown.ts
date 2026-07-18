import { readAbResults, type AbResultRow } from './abResults';

function printTable(
  title: string,
  rows: AbResultRow[],
  summary: (rows: AbResultRow[]) => string
): void {
  if (rows.length === 0) return;
  const lines = ['', title, '', 'label'.padEnd(40) + 'diff'];
  for (const r of rows) {
    lines.push(r.label.padEnd(40) + `${(r.ratio * 100).toFixed(4)}%`);
  }
  lines.push('', summary(rows));
  console.log(lines.join('\n'));
}

/**
 * Runs exactly once, in the main process, after every worker has finished —
 * unlike a `test.afterAll` inside the spec, immune to the per-worker module
 * resets that per-test failures trigger (see abResults.ts).
 */
export default function globalTeardown(): void {
  printTable(
    'A/B compare — React vs. vanilla DOM',
    readAbResults('compare'),
    (rows) => {
      const threshold = Number(process.env.COMPARE_THRESHOLD ?? '0.001');
      const failing = rows.filter((r) => r.ratio > threshold);
      return failing.length > 0
        ? `${failing.length}/${rows.length} cell(s) exceed the ${(threshold * 100).toFixed(2)}% threshold.\n` +
            'Panel B is currently the documented placeholder (core/dom/mount.ts): a large\n' +
            'diff on every cell is EXPECTED and NORMAL, not a regression.'
        : `All ${rows.length} cell(s) within the ${(threshold * 100).toFixed(2)}% threshold.`;
    }
  );

  printTable(
    'Self-test calibration — A vs itself (0.00% required everywhere)',
    readAbResults('selftest'),
    (rows) => {
      const failing = rows.filter((r) => r.ratio !== 0);
      return failing.length > 0
        ? `${failing.length}/${rows.length} check(s) NOT calibrated (non-zero drift) — do not trust compare.ab.spec.ts yet.`
        : `All ${rows.length} check(s) at exactly 0.00% — the gate is calibrated.`;
    }
  );
}
