import { test, expect } from '@playwright/test';

// Démos couvrant les zones à risque : set_content (spa, messageQueue), move
// dense (clientServer), composition parallèle (microservices), cas de layout
// serré (collision). Étendre la liste = un golden de plus, rien d'autre.
const DEMOS = [
  'spa',
  'clientServer',
  'messageQueue',
  'microservices',
  'collision',
];

for (const demo of DEMOS) {
  test(`planche-contact — ${demo}`, async ({ page }) => {
    await page.goto(`/?demo=${demo}&theme=light`);

    // La planche-contact est montée…
    await page.waitForSelector('.filmstrip .frame');
    // …et le moteur a publié ses séries (preuve que compile() a tourné).
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            !!(window as unknown as { __VALIDATION__?: unknown }).__VALIDATION__
        )
      )
      .toBe(true);

    // Mesure DOM stable : le ResizeObserver + le refit de police d'un set_content
    // se font en deux passes après le commit ; on attend les polices puis une
    // courte stabilisation avant de figer l'image.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);

    // La sonde live joue en boucle (rAF) → image non déterministe : on l'exclut
    // du golden (c'est un diagnostic, pas une cible de régression).
    await page.evaluate(() =>
      document.querySelector('.probe-section')?.remove()
    );

    await expect(page).toHaveScreenshot(`${demo}.png`, { fullPage: true });
  });
}
