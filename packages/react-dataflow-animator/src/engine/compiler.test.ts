import { describe, expect, it } from 'vitest';
import type { Action, DataFlowSpec } from '../types';
import { APPEAR_HOLD, ARRIVE_HOLD, compile, STEP_GAP } from './compiler';
import { evaluate } from './timeline';

const nodes: DataFlowSpec['nodes'] = [
  { id: 'a', type: 'client' },
  { id: 'b', type: 'server' },
];
const packets: DataFlowSpec['packets'] = [{ id: 'p', kind: 'http_packet' }];

function specOf(timeline: DataFlowSpec['timeline']): DataFlowSpec {
  return { nodes, packets, timeline };
}

describe('compile — ordonnancement', () => {
  it('enchaîne les actions racines séquentiellement', () => {
    const { timeline } = compile(
      specOf([
        {
          type: 'move',
          id: 'm1',
          object: 'p',
          from: 'a',
          to: 'b',
          duration: 500,
        },
        {
          type: 'move',
          id: 'm2',
          object: 'p',
          from: 'a',
          to: 'b',
          duration: 300,
        },
      ])
    );
    const m1 = timeline.clips.find((c) => c.id === 'm1')!;
    const m2 = timeline.clips.find((c) => c.id === 'm2')!;
    // m1 : apparaît à 0, anime après APPEAR_HOLD, arrive à APPEAR_HOLD+500.
    expect(m1.startMs).toBe(0);
    expect(m1.animStartMs).toBe(APPEAR_HOLD);
    expect(m1.endMs).toBe(APPEAR_HOLD + 500);
    // Fin de l'étape 0 = arrivée + hold d'arrivée.
    const step0End = APPEAR_HOLD + 500 + ARRIVE_HOLD;
    // m2 démarre après l'étape 0 + la pause inter-étapes.
    expect(m2.startMs).toBe(step0End + STEP_GAP);
    expect(m2.endMs).toBe(step0End + STEP_GAP + APPEAR_HOLD + 300);
    expect(timeline.durationMs).toBe(
      step0End + STEP_GAP + APPEAR_HOLD + 300 + ARRIVE_HOLD
    );
    expect(timeline.steps).toHaveLength(2);
  });

  it("place les enfants d'un parallel au même timestamp", () => {
    const { timeline } = compile(
      specOf([
        {
          type: 'parallel',
          actions: [
            {
              type: 'move',
              id: 'x',
              object: 'p',
              from: 'a',
              to: 'b',
              duration: 400,
            },
            {
              type: 'arrow',
              id: 'y',
              from: 'a',
              to: 'b',
              duration: 600,
            },
          ],
        },
      ])
    );
    const x = timeline.clips.find((c) => c.id === 'x')!;
    const y = timeline.clips.find((c) => c.id === 'y')!;
    expect(x.startMs).toBe(0);
    expect(y.startMs).toBe(0);
    // Durée = max(empreinte du move = APPEAR_HOLD+400+ARRIVE_HOLD, flèche = 600).
    expect(timeline.durationMs).toBe(
      Math.max(APPEAR_HOLD + 400 + ARRIVE_HOLD, 600)
    );
    expect(timeline.steps).toHaveLength(1);
  });

  it(`wait_for sur action racine ne recule pas avant l'étape (clamped à stepStart)`, () => {
    const { timeline } = compile(
      specOf([
        { type: 'arrow', id: 'A', from: 'a', to: 'b', duration: 1000 },
        {
          type: 'move',
          id: 'B',
          object: 'p',
          from: 'a',
          to: 'b',
          duration: 200,
        },
        {
          type: 'comment',
          id: 'C',
          object: 'a',
          text: 'x',
          duration: 100,
          wait_for: 'A',
        },
      ])
    );
    const c = timeline.clips.find((cl) => cl.id === 'C')!;
    const step2 = timeline.steps[2];
    // A.endMs=1000 < step2.startMs → wait_for clamped : C démarre à step2.startMs.
    expect(c.startMs).toBe(step2.startMs);
    expect(c.endMs).toBe(step2.startMs + 100);
  });
});

describe('compile — cycle de vie', () => {
  it(`move disparaît à la fin, arrow persiste jusqu'à l'étape suivante`, () => {
    const { timeline } = compile(
      specOf([
        { type: 'arrow', id: 'A', from: 'a', to: 'b', duration: 300 },
        {
          type: 'move',
          id: 'B',
          object: 'p',
          from: 'a',
          to: 'b',
          duration: 300,
        },
      ])
    );
    const a = timeline.clips.find((c) => c.id === 'A')!;
    const b = timeline.clips.find((c) => c.id === 'B')!;
    // move : défaut keep_until_next=false -> visible jusqu'à la fin du hold d'arrivée.
    expect(b.visibleUntilMs).toBe(b.endMs + ARRIVE_HOLD);
    // arrow : persiste jusqu'au DÉBUT de l'étape suivante (à travers la pause).
    expect(a.visibleUntilMs).toBe(timeline.steps[1].startMs);
  });

  it(`keep_until maintient jusqu'au début de l'action ciblée`, () => {
    const { timeline } = compile(
      specOf([
        {
          type: 'arrow',
          id: 'A',
          from: 'a',
          to: 'b',
          duration: 300,
          keep_until: 'C',
        },
        {
          type: 'move',
          id: 'B',
          object: 'p',
          from: 'a',
          to: 'b',
          duration: 300,
        },
        {
          type: 'comment',
          id: 'C',
          object: 'a',
          text: 'x',
          duration: 100,
        },
      ])
    );
    const a = timeline.clips.find((c) => c.id === 'A')!;
    const c = timeline.clips.find((cl) => cl.id === 'C')!;
    expect(a.visibleUntilMs).toBe(c.startMs);
  });

  it(`keep_until_end maintient jusqu'à la fin de la chronologie`, () => {
    const { timeline } = compile(
      specOf([
        {
          type: 'arrow',
          id: 'A',
          from: 'a',
          to: 'b',
          duration: 300,
          keep_until_end: true,
        },
        {
          type: 'move',
          id: 'B',
          object: 'p',
          from: 'a',
          to: 'b',
          duration: 300,
        },
      ])
    );
    const a = timeline.clips.find((c) => c.id === 'A')!;
    expect(a.visibleUntilMs).toBe(timeline.durationMs);
  });

  it('keep_until_end positionne keepEnd sur le clip', () => {
    const { timeline } = compile(
      specOf([
        {
          type: 'set_content',
          id: 'SC',
          object: 'a',
          content: { type: 'text', value: 'v2' },
          keep_until_end: true,
        },
        {
          type: 'move',
          id: 'M',
          object: 'p',
          from: 'a',
          to: 'b',
          duration: 300,
        },
      ])
    );
    const sc = timeline.clips.find((c) => c.id === 'SC')!;
    expect(sc.keepEnd).toBe(true);
    // Un clip sans keep_until_end ne doit pas avoir keepEnd à true.
    const m = timeline.clips.find((c) => c.id === 'M')!;
    expect(m.keepEnd).toBeFalsy();
  });
});

describe("compile — points d'arrêt", () => {
  it('un move produit deux arrêts (apparition + arrivée), une flèche un seul', () => {
    const { timeline } = compile(
      specOf([
        { type: 'arrow', id: 'A', from: 'a', to: 'b', duration: 300 },
        {
          type: 'move',
          id: 'B',
          object: 'p',
          from: 'a',
          to: 'b',
          duration: 300,
        },
      ])
    );
    const b = timeline.clips.find((c) => c.id === 'B')!;
    // Arrêts attendus : fin de la flèche (arrow.endMs), apparition du move
    // (animStartMs) et arrivée du move (endMs).
    expect(timeline.stops).toContain(b.animStartMs);
    expect(timeline.stops).toContain(b.endMs);
    expect(timeline.stops.length).toBe(3);
    // Triés.
    expect([...timeline.stops].sort((x, y) => x - y)).toEqual(timeline.stops);
  });
});

describe("compile — wait_for sur action racine : borne au début de l'étape", () => {
  it('clamp le startMs au stepStart quand wait_for référence une action antérieure', () => {
    // 3 étapes ; étape 2 a wait_for vers l'action A de l'étape 0.
    // step0: highlight A dur=100 → endMs=100, occupiedEnd=100, cursor→350
    // step1: arrow B dur=100 → endMs=450, cursor→700
    // step2: comment C wait_for='A' → ref.endMs=100 < stepStart=700 → clamped à 700
    const { timeline } = compile(
      specOf([
        { type: 'highlight', id: 'A', object: 'a', duration: 100 },
        { type: 'arrow', id: 'B', from: 'a', to: 'b', duration: 100 },
        {
          type: 'comment',
          id: 'C',
          object: 'a',
          text: 'x',
          duration: 100,
          wait_for: 'A',
        },
      ])
    );
    const c = timeline.clips.find((cl) => cl.id === 'C')!;
    const step2 = timeline.steps[2];
    expect(c.startMs).toBe(step2.startMs);
    expect(c.endMs).toBe(step2.startMs + 100);
    // L'étape a une durée positive (endMs > startMs).
    expect(step2.endMs).toBeGreaterThan(step2.startMs);
  });

  it('invariant : clip.startMs ≥ step.startMs pour toutes les actions racines', () => {
    const { timeline } = compile(
      specOf([
        { type: 'highlight', id: 'A', object: 'a', duration: 100 },
        { type: 'arrow', id: 'B', from: 'a', to: 'b', duration: 100 },
        {
          type: 'comment',
          id: 'C',
          object: 'a',
          text: 'x',
          duration: 100,
          wait_for: 'A',
        },
        {
          type: 'loading',
          id: 'D',
          object: 'a',
          duration: 200,
          wait_for: 'B',
        },
      ])
    );
    for (const clip of timeline.clips) {
      const step = timeline.steps[clip.stepIndex];
      expect(clip.startMs).toBeGreaterThanOrEqual(step.startMs);
    }
  });

  it("ne clamp pas les enfants d'un parallel (comportement conservé)", () => {
    // A (étape 0, endMs=100) ; étape 1 = parallel dont un enfant a wait_for='A'.
    // L'enfant reste à A.endMs=100 < parallel.startMs=350 (pas de clamp pour les enfants).
    const { timeline } = compile(
      specOf([
        { type: 'highlight', id: 'A', object: 'a', duration: 100 },
        {
          type: 'parallel',
          actions: [
            {
              type: 'comment',
              id: 'C',
              object: 'a',
              text: 'x',
              duration: 100,
              wait_for: 'A',
            },
            { type: 'arrow', id: 'B', from: 'a', to: 'b', duration: 200 },
          ],
        },
      ])
    );
    const c = timeline.clips.find((cl) => cl.id === 'C')!;
    const step1 = timeline.steps[1];
    // Enfant parallel : startMs = A.endMs = 100, antérieur au début du parallel.
    expect(c.startMs).toBe(100);
    expect(c.startMs).toBeLessThan(step1.startMs);
  });
});

describe('compile — delay_ms', () => {
  it('décale le startMs dans un parallel (stagger)', () => {
    // anim1 : 0 → 4000, anim2 : 2000 → 4000
    const { timeline } = compile(
      specOf([
        {
          type: 'parallel',
          actions: [
            { type: 'arrow', id: 'A1', from: 'a', to: 'b', duration: 4000 },
            {
              type: 'arrow',
              id: 'A2',
              from: 'a',
              to: 'b',
              duration: 2000,
              delay_ms: 2000,
            },
          ],
        },
      ])
    );
    const a1 = timeline.clips.find((c) => c.id === 'A1')!;
    const a2 = timeline.clips.find((c) => c.id === 'A2')!;
    expect(a1.startMs).toBe(0);
    expect(a1.endMs).toBe(4000);
    expect(a2.startMs).toBe(2000);
    expect(a2.endMs).toBe(4000);
  });

  it('décale une action racine dans son étape', () => {
    const { timeline } = compile(
      specOf([
        {
          type: 'arrow',
          id: 'A',
          from: 'a',
          to: 'b',
          duration: 500,
          delay_ms: 300,
        },
      ])
    );
    const a = timeline.clips.find((c) => c.id === 'A')!;
    expect(a.startMs).toBe(300);
    expect(a.endMs).toBe(800);
  });

  it('compose avec wait_for : delay_ms est ajouté après la résolution', () => {
    // À l'intérieur d'un parallel, les enfants n'ont pas de minStartMs,
    // donc wait_for + delay_ms s'applique proprement sans clamp d'étape.
    const { timeline } = compile(
      specOf([
        {
          type: 'parallel',
          actions: [
            { type: 'arrow', id: 'X', from: 'a', to: 'b', duration: 500 },
            {
              type: 'arrow',
              id: 'Y',
              from: 'a',
              to: 'b',
              duration: 200,
              wait_for: 'X',
              delay_ms: 100,
            },
          ],
        },
      ])
    );
    const x = timeline.clips.find((c) => c.id === 'X')!;
    const y = timeline.clips.find((c) => c.id === 'Y')!;
    // Y démarre à X.endMs (500) + delay_ms (100) = 600.
    expect(y.startMs).toBe(x.endMs + 100);
    expect(y.endMs).toBe(x.endMs + 300);
  });

  it('delay_ms sur un parallel entier retarde tout le groupe', () => {
    const { timeline } = compile(
      specOf([
        {
          type: 'parallel',
          delay_ms: 400,
          actions: [
            { type: 'arrow', id: 'P1', from: 'a', to: 'b', duration: 300 },
            { type: 'arrow', id: 'P2', from: 'a', to: 'b', duration: 500 },
          ],
        },
      ])
    );
    const p1 = timeline.clips.find((c) => c.id === 'P1')!;
    const p2 = timeline.clips.find((c) => c.id === 'P2')!;
    expect(p1.startMs).toBe(400);
    expect(p2.startMs).toBe(400);
  });
});

describe('compile — robustesse', () => {
  it('ignore une action incomplète et émet un warning', () => {
    const { timeline, warnings } = compile(
      // Données volontairement incomplètes (to manquant) -> ignoré + warning.
      specOf([{ type: 'move', object: 'p', from: 'a' } as unknown as Action])
    );
    expect(timeline.clips).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('compile — set_visible', () => {
  it('produit un clip set_visible avec keepEnd=true et visibleUntilMs=durationMs', () => {
    const { timeline } = compile(
      specOf([
        { type: 'set_visible', id: 'SV', object: 'a', visible: true },
        { type: 'arrow', id: 'AR', from: 'a', to: 'b', duration: 300 },
      ])
    );
    const sv = timeline.clips.find((c) => c.id === 'SV')!;
    expect(sv.kind).toBe('set_visible');
    expect(sv.keepEnd).toBe(true);
    expect(sv.visibleUntilMs).toBe(timeline.durationMs);
  });

  it('un set_visible visible=false a bien le champ visible=false', () => {
    const { timeline } = compile(
      specOf([{ type: 'set_visible', id: 'SV', object: 'a', visible: false }])
    );
    const sv = timeline.clips.find((c) => c.id === 'SV')!;
    expect((sv as import('./timeline').SetVisibleClip).visible).toBe(false);
  });

  it('émet un warning si object est absent', () => {
    const { timeline, warnings } = compile(
      specOf([{ type: 'set_visible', visible: true } as unknown as Action])
    );
    expect(timeline.clips).toHaveLength(0);
    expect(warnings.some((w) => w.includes('set_visible'))).toBe(true);
  });

  it('deux set_visible successifs pour le même nœud sont tous deux dans les clips', () => {
    const { timeline } = compile(
      specOf([
        { type: 'set_visible', id: 'HIDE', object: 'a', visible: false },
        { type: 'set_visible', id: 'SHOW', object: 'a', visible: true },
      ])
    );
    expect(timeline.clips.filter((c) => c.kind === 'set_visible')).toHaveLength(
      2
    );
    // Les deux persistent jusqu'à la fin.
    for (const c of timeline.clips.filter((c) => c.kind === 'set_visible')) {
      expect(c.visibleUntilMs).toBe(timeline.durationMs);
    }
  });
});

describe('compile — wait', () => {
  it("n'émet aucun clip mais crée une étape qui décale les suivantes", () => {
    const { timeline } = compile(
      specOf([
        { type: 'arrow', id: 'A1', from: 'a', to: 'b', duration: 300 },
        { type: 'wait', id: 'W', duration: 1000 },
        { type: 'arrow', id: 'A2', from: 'a', to: 'b', duration: 300 },
      ])
    );
    // Le wait ne produit aucun clip : seules les deux flèches sont présentes…
    expect(timeline.clips).toHaveLength(2);
    // …mais il occupe bien une étape à part entière.
    expect(timeline.steps).toHaveLength(3);

    const waitStart = 300 + STEP_GAP;
    expect(timeline.steps[1].startMs).toBe(waitStart);
    expect(timeline.steps[1].endMs).toBe(waitStart + 1000);

    // L'étape suivante démarre après le wait (+ pause inter-étapes).
    const a2 = timeline.clips.find((c) => c.id === 'A2')!;
    expect(a2.startMs).toBe(waitStart + 1000 + STEP_GAP);
  });

  it('maintient le contenu posé (keep_until_next) PENDANT le temps mort', () => {
    const { timeline } = compile(
      specOf([
        { type: 'arrow', id: 'A1', from: 'a', to: 'b', duration: 300 },
        { type: 'wait', duration: 1000 },
        { type: 'arrow', id: 'A2', from: 'a', to: 'b', duration: 300 },
      ])
    );
    const a1 = timeline.clips.find((c) => c.id === 'A1')!;
    const a2 = timeline.clips.find((c) => c.id === 'A2')!;
    // A1 reste visible jusqu'au DÉBUT de l'étape de contenu suivante (A2),
    // donc à travers le wait, et non jusqu'au début du wait.
    expect(a1.visibleUntilMs).toBe(a2.startMs);

    // Au beau milieu de l'attente, A1 est toujours rendu (figé, progress 1).
    const midWait = timeline.steps[1].startMs + 500;
    const active = evaluate(timeline, midWait);
    const shown = active.find((c) => c.clip.id === 'A1');
    expect(shown).toBeDefined();
    expect(shown!.animating).toBe(false);
  });

  it('utilise la durée par défaut (1000 ms) quand `duration` est absent', () => {
    const { timeline } = compile(specOf([{ type: 'wait' }]));
    expect(timeline.clips).toHaveLength(0);
    expect(timeline.steps).toHaveLength(1);
    expect(timeline.durationMs).toBe(1000);
  });

  it('résout wait_for vers la fin d’un wait identifié', () => {
    const { timeline } = compile(
      specOf([
        { type: 'wait', id: 'W', duration: 800 },
        { type: 'arrow', id: 'A', from: 'a', to: 'b', wait_for: 'W' },
      ])
    );
    const a = timeline.clips.find((c) => c.id === 'A')!;
    // A est une étape racine : son plancher est le début de son étape, qui suit
    // déjà le wait — wait_for ne fait donc que confirmer ce séquencement.
    expect(a.startMs).toBe(800 + STEP_GAP);
  });
});

describe('compile — commentaire omniscient', () => {
  it('compile un comment sans object en clip sans nextToId', () => {
    const { timeline, warnings } = compile(
      specOf([{ type: 'comment', id: 'C', text: 'Bonjour' }])
    );
    const clip = timeline.clips.find((c) => c.id === 'C')!;
    expect(clip).toBeDefined();
    expect(clip.kind).toBe('comment');
    // @ts-expect-error nextToId est optionnel — on vérifie qu'il est absent
    expect(clip.nextToId).toBeUndefined();
    expect(warnings).toHaveLength(0);
  });

  it('émet un avertissement quand text est absent', () => {
    const action = { type: 'comment', id: 'C', object: 'a' } as Action;
    const { timeline, warnings } = compile(specOf([action]));
    expect(timeline.clips).toHaveLength(0);
    expect(warnings[0]).toMatch(/text requis/);
  });

  it('compile un comment avec object en clip avec nextToId', () => {
    const { timeline } = compile(
      specOf([{ type: 'comment', id: 'C', object: 'a', text: 'ok' }])
    );
    const clip = timeline.clips.find((c) => c.id === 'C')! as {
      nextToId?: string;
    };
    expect(clip.nextToId).toBe('a');
  });
});
