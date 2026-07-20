import { test, expect } from '@playwright/test';
import { RISK_DEMOS } from './riskDemos';
import { diffPngBuffers } from './pixelDiff';
import { waitForAbReady } from './waitForAbReady';
import { appendAbResult } from './abResults';

/**
 * Calibration for the A/B compare gate (`compare.ab.spec.ts`): before that
 * gate's percentages can be trusted to mean anything about the REAL renderer,
 * we must prove the measurement itself has zero noise floor. Two independent
 * questions, both required to be exactly 0.00%:
 *
 *  - successive capture: screenshot the SAME React panel twice in a row — a
 *    non-zero diff would mean residual animation, unsettled fonts, or a
 *    ResizeObserver pass still in flight, not a rendering difference.
 *  - cross-mount: screenshot two INDEPENDENT React mounts of the identical
 *    spec at the identical `t` (`panelB=react`) — a non-zero diff would mean
 *    DOM measurement is nondeterministic across mounts, which would show up
 *    in the real gate as false positives no fix to the vanilla renderer could
 *    ever close.
 *
 * Until both are 0.00% on every demo x theme, `compare.ab.spec.ts`'s numbers
 * are not meaningful — see docs/AI-VALIDATION.md. The final table is printed
 * by `globalTeardown.ts`, not from here — see `abResults.ts` for why.
 */

const THEMES = ['light', 'dark'] as const;

/**
 * The configurations the gate is calibrated for. A configuration that compare
 * exercises but the self-test does not is a configuration whose numbers mean
 * nothing — which is exactly how the `chrome` cells slipped in uncalibrated.
 *
 * Read that rule precisely, because it is narrower than it looks. What is
 * calibrated here is the MEASUREMENT, and the measurement is determined by
 * **panel A's configuration plus the capture protocol** — `panelB=react` mounts
 * a second panel A, so an entry naming a panel-B variant would measure nothing
 * new. The rule therefore binds on compare modes whose PANEL A is uncalibrated.
 *
 * That is why compare's `wrapper` mode has no entry of its own: it reuses
 * `chrome`'s panel A, `chrome`'s probe grid and `chrome`'s
 * `animations: 'disabled'` capture, and only swaps what panel B is built by. It
 * is calibrated by the `chrome` entry below.
 *
 * `chrome` sweeps the probe grid where `stage` samples only the midpoint,
 * because composing the stage with a sibling control bar changes the stage's
 * height and therefore its measurement schedule — and the suspected race is
 * instant-dependent, so a single instant would not find it.
 */
const CONFIGS = [
  { name: 'stage', query: '', pcts: [0.5] },
  { name: 'chrome', query: '&chrome=1', pcts: [0, 0.25, 0.5, 0.75, 1] },
] as const;

for (const config of CONFIGS) {
  for (const demo of RISK_DEMOS) {
    for (const pct of config.pcts) {
      for (const theme of THEMES) {
        const suffix =
          config.name === 'stage'
            ? `${demo} · ${theme}`
            : `${demo} · ${Math.round(pct * 100)}% · ${theme} · chrome`;
        test(`self-test — ${suffix}`, async ({ page }) => {
          await page.goto(
            `/?ab=1&demo=${demo}&mode=${theme}&panelB=react&probePct=${pct}${config.query}`
          );
          await waitForAbReady(page);

          const panelA = page.locator('[data-ab-panel="a"] .rdfa-player');
          const panelB = page.locator('[data-ab-panel="b"] .rdfa-player');
          // `t` is frozen and the spec is static, but a CSS `loading` spinner
          // (native @keyframes, driven by the browser's wall clock rather than
          // React's `t`) would still drift between two successive captures.
          // `animations: 'disabled'` snaps it to a fixed state first — the same
          // mechanism `expect(page).toHaveScreenshot()` applies by default in
          // harness.visual.spec.ts, applied here to the raw `.screenshot()` call.
          const shot = { animations: 'disabled' as const };

          const a1 = await panelA.screenshot(shot);
          const a2 = await panelA.screenshot(shot);
          const successive = diffPngBuffers(a1, a2);
          appendAbResult('selftest', {
            label: `${suffix} · successive`,
            ratio: successive.ratio,
          });
          expect(
            successive.ratio,
            `successive-capture drift on ${suffix}`
          ).toBe(0);

          const b1 = await panelB.screenshot(shot);
          const crossMount = diffPngBuffers(a1, b1);
          appendAbResult('selftest', {
            label: `${suffix} · cross-mount`,
            ratio: crossMount.ratio,
          });
          expect(crossMount.ratio, `cross-mount drift on ${suffix}`).toBe(0);
        });
      }
    }
  }
}
