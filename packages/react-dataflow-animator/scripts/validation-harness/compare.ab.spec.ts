import { test, expect } from '@playwright/test';
import { RISK_DEMOS } from './riskDemos';
import { diffPngBuffers } from './pixelDiff';
import { waitForAbReady } from './waitForAbReady';
import { appendAbResult } from './abResults';

/**
 * A/B pixel-diff gate: React `Stage` (panel A) vs. the framework-agnostic DOM
 * renderer (panel B, `mountVanillaStage`), over a demo x time x theme grid —
 * see docs/AI-VALIDATION.md. Trustworthy only once `selftest.ab.spec.ts`
 * reports exactly 0.00% (the noise floor of the measurement itself). The
 * final table is printed by `globalTeardown.ts`, not from here — see
 * `abResults.ts` for why.
 *
 * `panelB` is currently a documented placeholder (core/dom/mount.ts), not the
 * real renderer: every cell is EXPECTED to fail this threshold today. That is
 * normal, not a regression — this gate starts being meaningful once the real
 * renderer replaces the placeholder in a later phase.
 */

const THEMES = ['light', 'dark'] as const;
const PROBE_PCTS = [0, 0.25, 0.5, 0.75, 1] as const;
const THRESHOLD = Number(process.env.COMPARE_THRESHOLD ?? '0.001'); // 0.1%

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

        expect(
          ratio,
          `${label} exceeds the ${(THRESHOLD * 100).toFixed(2)}% threshold`
        ).toBeLessThanOrEqual(THRESHOLD);
      });
    }
  }
}
