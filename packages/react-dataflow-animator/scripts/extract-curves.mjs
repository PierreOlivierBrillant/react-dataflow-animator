/**
 * Passe STRUCTURELLE de fluidité, headless et sans navigateur.
 *
 * Le moteur étant pur (`evaluate(timeline, t)`), on n'a pas besoin de rendre des
 * pixels pour détecter les défauts de fluidité qui se décident à la compilation :
 * une transition `set_content` instantanée, un fondu trop court, deux contenus
 * qui se chevauchent sur le même nœud. C'est le signal rapide (CI, pré-commit) ;
 * la forme RÉELLE du crossfade (linéaire vs eased) et le re-layout se voient dans
 * le harnais Vite, qui rend le vrai DOM. Voir docs/AI-VALIDATION.md.
 *
 * On n'utilise QUE l'API publique (`compile`, `evaluate` depuis le dist construit)
 * pour ne rien réimplémenter du moteur. `clipOpacity`/easing ne sont pas publics :
 * leur courbe vit dans le harnais, pas ici.
 *
 *   node scripts/extract-curves.mjs --demo spa
 *   node scripts/extract-curves.mjs --demo spa --json > out/spa.json
 */
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    demo: { type: 'string', default: 'spa' },
    json: { type: 'boolean', default: false },
  },
});

const distUrl = new URL('../dist/index.js', import.meta.url);
let compile;
try {
  ({ compile } = await import(distUrl.href));
} catch {
  console.error(
    `Impossible de charger le dist (${distUrl.pathname}).\n` +
      `Construis d'abord la lib :  npm run build:lib`
  );
  process.exit(1);
}

const demoUrl = new URL(
  `../../../apps/docs/src/site-content/demos/${values.demo}.ts`,
  import.meta.url
);
let spec;
try {
  const mod = await import(demoUrl.href);
  spec = mod[values.demo] ?? mod.default ?? Object.values(mod)[0];
} catch (err) {
  console.error(`Démo introuvable : ${values.demo} (${demoUrl.pathname})`);
  console.error(String(err?.message ?? err));
  process.exit(1);
}

const { timeline } = compile(spec);

const setContent = timeline.clips.filter((c) => c.kind === 'set_content');

// On ne signale QUE ce qui est dérivable sans connaître `clipOpacity` :
//  - les chevauchements de deux contenus sur le même nœud (scintillement) ;
//  - les fondus EXPLICITES coupés (0ms) ou très courts, choisis par l'auteur.
// La durée de fondu par DÉFAUT (FADE_MS interne) n'est pas visible ici : si la
// spec ne fixe pas fadeInMs/fadeOutMs, c'est au harnais Vite de montrer la
// courbe réelle. On n'invente donc aucun chiffre de fondu côté headless.
const findings = [];
const seenByNode = new Map();

for (const clip of setContent) {
  const flags = [];
  const prev = seenByNode.get(clip.objectId);
  if (prev && clip.startMs < prev.visibleUntilMs) flags.push('chevauchement-meme-noeud');
  seenByNode.set(clip.objectId, clip);

  if (clip.fadeInMs === 0) flags.push('fondu-entree-coupe');
  if (clip.fadeOutMs === 0) flags.push('fondu-sortie-coupe');
  if ((clip.fadeInMs ?? Infinity) > 0 && (clip.fadeInMs ?? Infinity) < 120)
    flags.push('fondu-entree-court');
  if ((clip.fadeOutMs ?? Infinity) > 0 && (clip.fadeOutMs ?? Infinity) < 120)
    flags.push('fondu-sortie-court');

  findings.push({
    objectId: clip.objectId,
    window: [Math.round(clip.startMs), Math.round(clip.visibleUntilMs)],
    holdMs: Math.round(clip.visibleUntilMs - clip.startMs),
    fadeInMs: clip.fadeInMs ?? 'défaut',
    fadeOutMs: clip.fadeOutMs ?? 'défaut',
    flags,
  });
}

const report = {
  demo: values.demo,
  durationMs: Math.round(timeline.durationMs),
  stops: timeline.stops.length,
  setContentCount: setContent.length,
  findings,
};

if (values.json) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  console.log(
    `\n${report.demo} — ${report.durationMs}ms, ${report.stops} arrêts, ` +
      `${report.setContentCount} set_content\n`
  );
  if (findings.length === 0) console.log('  (aucun set_content)');
  for (const f of findings) {
    const tag = f.flags.length ? `  ⚠ ${f.flags.join(', ')}` : '  ✓';
    console.log(
      `${tag}  ${f.objectId}  fenêtre ${f.window[0]}–${f.window[1]}ms · ` +
        `hold ${f.holdMs}ms · fade-in ${f.fadeInMs} · fade-out ${f.fadeOutMs}`
    );
  }
  const flagged = findings.filter((f) => f.flags.length).length;
  console.log(
    `\n${flagged ? `${flagged} clip(s) avec un fondu explicite à risque.` : 'Rien à signaler côté structure — la fluidité du crossfade se juge dans le harnais.'}\n`
  );
}
