import { clearAbResults } from './abResults';

/** Truncates both result accumulators exactly once, before any worker starts. */
export default function globalSetup(): void {
  clearAbResults('compare');
  clearAbResults('selftest');
}
