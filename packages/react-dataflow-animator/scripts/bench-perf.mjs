/**
 * Perf baseline: average cost of a React player frame, real rAF-driven
 * playback (autoPlay + loop, via the SAME `useClock` hook `DataFlowPlayer`
 * uses — see scripts/validation-harness/main.tsx's `BenchApp`), over ~300
 * frames, on `circuit` (heavy: dense orthogonal routing) and `clientServer`
 * (average). This is the baseline the step-2.6 gate compares the future
 * vanilla-DOM renderer against — see docs/AI-VALIDATION.md.
 *
 * Frame timing comes from wall-clock gaps between successive
 * `requestAnimationFrame` callbacks (the real cadence a user experiences);
 * the CDP `Performance` domain additionally breaks that cost down by phase
 * (script / style / layout) over the same window, sourced from Chrome
 * DevTools Protocol rather than reimplemented.
 *
 *   node scripts/bench-perf.mjs
 *   node scripts/bench-perf.mjs --demo circuit --frames 300
 */
import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { values } = parseArgs({
  options: {
    demo: { type: 'string' },
    frames: { type: 'string', default: '300' },
    port: { type: 'string', default: '5197' },
    out: { type: 'string' },
    renderer: { type: 'string', default: 'both' },
  },
});

const DEMOS = values.demo ? [values.demo] : ['circuit', 'clientServer'];
// `both` measures the two renderers in ONE run, which is the only comparison
// worth making: these numbers are machine-dependent, so diffing a fresh vanilla
// figure against a React baseline captured elsewhere would mostly measure the
// hardware. See docs/AI-VALIDATION.md.
const RENDERERS =
  values.renderer === 'both' ? ['react', 'vanilla'] : [values.renderer];
const FRAMES = Number(values.frames);

// The harness's own vite.config.ts reads PORT from the environment (see
// scripts/validation-harness/vite.config.ts) — reusing that logic here
// avoids a second, potentially-diverging port-selection implementation.
// `strictPort` in the config file only applies to server.port when set, so
// we force it via override to fail loudly on a collision rather than
// silently reusing a stranger's server (the documented port-5199 trap,
// applied here to whatever port THIS run picks).
process.env.PORT = values.port;

console.log(`Starting harness on port ${values.port}...`);
const server = await createServer({
  configFile: join(__dirname, 'validation-harness/vite.config.ts'),
  server: { strictPort: true },
});
await server.listen();
const baseUrl = `http://localhost:${values.port}`;

const browser = await chromium.launch({ channel: 'chrome' });
/** @type {Record<string, unknown>} */
const results = {};

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function metricDelta(before, after, name) {
  const b = before.metrics.find((m) => m.name === name)?.value ?? 0;
  const a = after.metrics.find((m) => m.name === name)?.value ?? 0;
  return (a - b) * 1000; // CDP reports seconds
}

try {
  for (const renderer of RENDERERS) {
  for (const demo of DEMOS) {
    console.log(`Benchmarking ${demo} — ${renderer} (${FRAMES} frames)...`);
    const page = await browser.newPage();
    await page.goto(
      `${baseUrl}/?bench=1&demo=${demo}&frames=${FRAMES}&renderer=${renderer}`
    );
    await page.evaluate(() => document.fonts.ready);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const before = await cdp.send('Performance.getMetrics');

    await page.waitForFunction(
      () => (window /** @type {any} */).__BENCH__?.done === true,
      undefined,
      { timeout: 30_000 }
    );

    const after = await cdp.send('Performance.getMetrics');
    const bench = await page.evaluate(
      () => (window /** @type {any} */).__BENCH__
    );

    const sorted = [...bench.samples].sort((a, b) => a - b);
    const mean =
      bench.samples.reduce((s, v) => s + v, 0) / bench.samples.length;

    results[`${renderer}/${demo}`] = {
      frames: bench.samples.length,
      frameMs: {
        mean: Number(mean.toFixed(3)),
        median: Number(percentile(sorted, 0.5).toFixed(3)),
        p95: Number(percentile(sorted, 0.95).toFixed(3)),
        min: Number(sorted[0].toFixed(3)),
        max: Number(sorted[sorted.length - 1].toFixed(3)),
      },
      cdp: {
        scriptDurationMs: Number(
          metricDelta(before, after, 'ScriptDuration').toFixed(2)
        ),
        layoutDurationMs: Number(
          metricDelta(before, after, 'LayoutDuration').toFixed(2)
        ),
        recalcStyleDurationMs: Number(
          metricDelta(before, after, 'RecalcStyleDuration').toFixed(2)
        ),
        taskDurationMs: Number(
          metricDelta(before, after, 'TaskDuration').toFixed(2)
        ),
      },
    };

    await page.close();
  }
  }
} finally {
  await browser.close();
  await server.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  renderer: RENDERERS.join('+'),
  framesRequested: FRAMES,
  demos: results,
};

// NOT bench-baseline.json by default any more: that file is the step 2.1 React
// reference and stays frozen. A run writes beside it.
const outPath =
  values.out ?? join(__dirname, 'validation-harness/bench-vanilla.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `\nPer-frame cost — ${RENDERERS.join(' vs ')} (${FRAMES} frames/demo)\n`
);
for (const [demo, r] of Object.entries(results)) {
  console.log(
    `${demo.padEnd(14)} mean ${r.frameMs.mean}ms  median ${r.frameMs.median}ms  ` +
      `p95 ${r.frameMs.p95}ms  script ${r.cdp.scriptDurationMs}ms  ` +
      `layout ${r.cdp.layoutDurationMs}ms  style ${r.cdp.recalcStyleDurationMs}ms`
  );
}
console.log(`\nSaved to ${outPath}`);
