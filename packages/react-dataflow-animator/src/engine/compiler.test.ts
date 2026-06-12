import { describe, expect, it } from 'vitest';
import type { Action, DataFlowSpec } from '../types';
import { APPEAR_HOLD, ARRIVE_HOLD, compile, STEP_GAP } from './compiler';

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

  it(`décale via wait_for vers la fin de l'action référencée`, () => {
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
    // Sans wait_for, C démarrerait à 1200 ; avec, à la fin de A (1000).
    expect(c.startMs).toBe(1000);
    expect(c.endMs).toBe(1100);
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
