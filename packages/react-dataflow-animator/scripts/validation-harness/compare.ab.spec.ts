import { test, expect } from '@playwright/test';
import { RISK_DEMOS } from './riskDemos';
import { diffPngBuffers } from './pixelDiff';
import { waitForAbReady } from './waitForAbReady';
import { appendAbResult } from './abResults';
import { COMPARE_THRESHOLD, readRatchet } from './ratchet';

/**
 * A/B pixel-diff gate: React `Stage` (panel A) vs. the framework-agnostic DOM
 * renderer (panel B, `mountVanillaStage`), over a demo x time x theme grid —
 * see docs/AI-VALIDATION.md. Trustworthy only once `selftest.ab.spec.ts`
 * reports exactly 0.00% (the noise floor of the measurement itself). The
 * final table is printed by `globalTeardown.ts`, not from here — see
 * `abResults.ts` for why.
 *
 * As of step 2.4 panel B draws EVERY layer panel A does at a frozen `t`, and the
 * ratchet is empty: the grid measures exactly 0.0000% throughout. The threshold
 * below is therefore a guard against measurement dust, not a tolerance budget —
 * a cell that lands anywhere above zero is drawing something different.
 *
 * Only UNLISTED cells assert here, so a genuine regression fails the test that
 * names it. The complementary rule — a listed cell that has started passing
 * must be removed from the ratchet — cannot be judged from inside a single test
 * (that test passes), so it lives in `globalTeardown.ts`, which sees the whole
 * grid.
 */

const THEMES = ['light', 'dark'] as const;
const PROBE_PCTS = [0, 0.25, 0.5, 0.75, 1] as const;
const THRESHOLD = COMPARE_THRESHOLD;
const RATCHET = readRatchet();

/**
 * The two comparisons this grid runs, both against the same threshold.
 *
 *  - `stage` — the frozen-`t` rendering surface. The step 2.4 grid.
 *  - `walk` — both panels driven through the same SEQUENCE of instants before
 *    capture, rather than mounted at one. This is the only cell type that
 *    exercises the real playback scenario on both sides, and therefore the only
 *    one that compares states depending on the path taken — `iconGeomByNode`
 *    above all, which a frozen mount can never reach. It is what will carry the
 *    2.6 switchover.
 *
 *  - `chrome` widens the comparison from the stage alone to the whole player,
 *    control bar included. Landed in step 2.5, once the `clientServer · 75%`
 *    divergence that held it back was understood and fixed.
 *
 *  - `wrapper` is `chrome` with panel B driven by the PUBLISHED
 *    `DataFlowPlayer` component rather than by a hand-written
 *    `mountVanillaPlayer` call. Same panel A, same probe grid, same expected
 *    markup — so it is a strict superset of `chrome`, and what it adds is proof
 *    that the React wrapper's prop→option mapping neither loses anything nor
 *    shifts anything. Landed in step 2.6a, with the wrapper itself.
 */
const MODES = [
  { name: 'stage', query: '' },
  { name: 'chrome', query: '&chrome=1' },
  { name: 'walk', query: '&walk=1' },
  { name: 'wrapper', query: '&chrome=1&panelB=player' },
] as const;

for (const modeUnderTest of MODES) {
  for (const demo of RISK_DEMOS) {
    for (const pct of PROBE_PCTS) {
      for (const theme of THEMES) {
        const suffix =
          modeUnderTest.name === 'stage' ? '' : ` · ${modeUnderTest.name}`;
        const label = `${demo} · ${Math.round(pct * 100)}% · ${theme}${suffix}`;
        test(`compare — ${label}`, async ({ page }) => {
          await page.goto(
            `/?ab=1&demo=${demo}&mode=${theme}&probePct=${pct}${modeUnderTest.query}`
          );
          await waitForAbReady(page);

          // See selftest.ab.spec.ts: freezes any wall-clock CSS animation
          // (e.g. a `loading` spinner) so the diff reflects markup, not timing.
          const shot = { animations: 'disabled' as const };
          const a = await page
            .locator('[data-ab-panel="a"] .rdfa-player')
            .screenshot(shot);
          const b = await page
            .locator('[data-ab-panel="b"] .rdfa-player')
            .screenshot(shot);
          const { ratio } = diffPngBuffers(a, b);
          appendAbResult('compare', { label, ratio });

          const expectedToDiffer = Object.prototype.hasOwnProperty.call(
            RATCHET,
            label
          );
          if (expectedToDiffer) {
            test.info().annotations.push({
              type: 'ratchet',
              description: `${RATCHET[label]} (diff ${(ratio * 100).toFixed(4)}%)`,
            });
            return;
          }

          expect(
            ratio,
            `${label} exceeds the ${(THRESHOLD * 100).toFixed(2)}% threshold`
          ).toBeLessThanOrEqual(THRESHOLD);
        });
      }
    }
  }
}
