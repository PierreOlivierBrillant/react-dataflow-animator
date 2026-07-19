import { test, expect } from '@playwright/test';
import { RISK_DEMOS } from './riskDemos';
import { diffPngBuffers } from './pixelDiff';
import { waitForAbReady } from './waitForAbReady';
import { appendAbResult } from './abResults';
import { readRatchet } from './ratchet';

/**
 * A/B pixel-diff gate: React `Stage` (panel A) vs. the framework-agnostic DOM
 * renderer (panel B, `mountVanillaStage`), over a demo x time x theme grid —
 * see docs/AI-VALIDATION.md. Trustworthy only once `selftest.ab.spec.ts`
 * reports exactly 0.00% (the noise floor of the measurement itself). The
 * final table is printed by `globalTeardown.ts`, not from here — see
 * `abResults.ts` for why.
 *
 * Panel B renders the STATIC SUBSTRATE (zones, nodes, connections). The layers
 * that have not landed yet — packets, arrow clips, `set_content` panels,
 * comment bubbles — make some cells differ legitimately; those are enumerated
 * in `compare-ratchet.json` with their reason.
 *
 * Only UNLISTED cells assert here, so a genuine regression fails the test that
 * names it. The complementary rule — a listed cell that has started passing
 * must be removed from the ratchet — cannot be judged from inside a single test
 * (that test passes), so it lives in `globalTeardown.ts`, which sees the whole
 * grid.
 */

const THEMES = ['light', 'dark'] as const;
const PROBE_PCTS = [0, 0.25, 0.5, 0.75, 1] as const;
const THRESHOLD = Number(process.env.COMPARE_THRESHOLD ?? '0.001'); // 0.1%
const RATCHET = readRatchet();

for (const demo of RISK_DEMOS) {
  for (const pct of PROBE_PCTS) {
    for (const theme of THEMES) {
      const label = `${demo} · ${Math.round(pct * 100)}% · ${theme}`;
      test(`compare — ${label}`, async ({ page }) => {
        await page.goto(`/?ab=1&demo=${demo}&mode=${theme}&probePct=${pct}`);
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
