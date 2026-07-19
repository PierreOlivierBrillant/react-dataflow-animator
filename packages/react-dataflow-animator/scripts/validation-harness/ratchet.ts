import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AbResultRow } from './abResults';

/**
 * The compare gate's ratchet.
 *
 * The vanilla renderer is being built layer by layer, so some cells of the A/B
 * grid legitimately differ: the layers that have not landed yet. Rather than
 * loosening the threshold — which would blind the gate everywhere — those cells
 * are listed explicitly, one line per cell, with the reason.
 *
 * Three rules, and the third is the one that makes it a ratchet rather than a
 * suppression list:
 *
 *  1. an UNLISTED cell over the threshold  → failure (a regression);
 *  2. a LISTED cell over the threshold     → tolerated, printed with its reason;
 *  3. a LISTED cell that now PASSES        → failure, demanding its removal.
 *
 * Without (3) the list would only ever grow stale: a step could land its layer,
 * leave the entry behind, and quietly keep that cell exempt forever.
 */

interface RatchetFile {
  cells: Record<string, string>;
}

const RATCHET_PATH = fileURLToPath(
  new URL('./compare-ratchet.json', import.meta.url)
);

export function readRatchet(): Record<string, string> {
  return (JSON.parse(readFileSync(RATCHET_PATH, 'utf8')) as RatchetFile).cells;
}

type CellStatus = 'ok' | 'expected' | 'to-remove' | 'regression';

export interface CellVerdict {
  label: string;
  ratio: number;
  status: CellStatus;
  /** The ratchet reason, for a listed cell. */
  reason?: string;
}

export function judge(
  rows: AbResultRow[],
  ratchet: Record<string, string>,
  threshold: number
): CellVerdict[] {
  return rows.map((row) => {
    const listed = Object.prototype.hasOwnProperty.call(ratchet, row.label);
    const over = row.ratio > threshold;
    const status: CellStatus = listed
      ? over
        ? 'expected'
        : 'to-remove'
      : over
        ? 'regression'
        : 'ok';
    return {
      label: row.label,
      ratio: row.ratio,
      status,
      reason: listed ? ratchet[row.label] : undefined,
    };
  });
}

/** Human-readable status column. */
export function statusLabel(v: CellVerdict): string {
  switch (v.status) {
    case 'ok':
      return 'ok';
    case 'expected':
      return `expected: ${v.reason}`;
    case 'to-remove':
      return `NOW PASSES — remove from the ratchet (was: ${v.reason})`;
    case 'regression':
      return 'REGRESSION — not in the ratchet';
  }
}
