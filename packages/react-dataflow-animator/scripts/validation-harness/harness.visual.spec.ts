import { test, expect } from '@playwright/test';

// Demos covering risk areas: set_content (spa, messageQueue), dense
// move (clientServer), parallel composition (microservices), tight layout
// case (collision). Extending the list = one more golden, nothing else.
const DEMOS = [
  'spa',
  'clientServer',
  'messageQueue',
  'microservices',
  'collision',
];

for (const demo of DEMOS) {
  test(`contact sheet — ${demo}`, async ({ page }) => {
    // Goldens are shot on the default palette in light mode: this suite guards
    // layout regressions, not the palettes.
    await page.goto(`/?demo=${demo}&mode=light&theme=default`);

    // The contact sheet is mounted...
    await page.waitForSelector('.filmstrip .frame');
    // ...and the engine has published its series (proof that compile() ran).
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            !!(window as unknown as { __VALIDATION__?: unknown }).__VALIDATION__
        )
      )
      .toBe(true);

    // Stable DOM measurement: the ResizeObserver + the font refit of a set_content
    // are done in two passes after commit; we wait for the fonts then a
    // short stabilization before freezing the image.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);

    // The live probe loops (rAF) → non-deterministic image: we exclude it
    // from the golden (it's a diagnostic, not a regression target).
    await page.evaluate(() =>
      document.querySelector('.probe-section')?.remove()
    );

    await expect(page).toHaveScreenshot(`${demo}.png`, { fullPage: true });
  });
}
