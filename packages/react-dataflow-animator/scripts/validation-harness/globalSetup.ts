import { clearAbResults } from './abResults';

/** Truncates every result accumulator exactly once, before any worker starts. */
export default function globalSetup(): void {
  clearAbResults('compare');
  clearAbResults('selftest');
  clearAbResults('mountupdate');
}
