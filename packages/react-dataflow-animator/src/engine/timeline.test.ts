import { describe, expect, it } from 'vitest';
import {
  evaluate,
  nextStop,
  prevStop,
  stepIndexAt,
  type ActiveClip,
  type Timeline,
} from './timeline';
import { compile } from './compiler';
import type { DataFlowSpec } from '../types';

const timeline: Timeline = {
  clips: [
    {
      id: 'arr',
      kind: 'arrow',
      startMs: 0,
      animStartMs: 0,
      endMs: 400,
      visibleUntilMs: 1000,
      stepIndex: 0,
      fromId: 'a',
      toId: 'b',
      style: 'solid',
    },
    {
      id: 'm',
      kind: 'move',
      startMs: 100,
      animStartMs: 100,
      endMs: 600,
      visibleUntilMs: 600,
      stepIndex: 0,
      objectId: 'p',
      fromId: 'a',
      toId: 'b',
    },
  ],
  steps: [
    { index: 0, startMs: 0, endMs: 600 },
    { index: 1, startMs: 600, endMs: 1000 },
  ],
  stops: [400, 600],
  durationMs: 1000,
};

describe('evaluate', () => {
  it('n’expose pas un clip avant son début', () => {
    const active = evaluate(timeline, 50);
    expect(active.map((a) => a.clip.id)).toEqual(['arr']);
  });

  it('calcule la progression sur [animStartMs, endMs]', () => {
    const active = evaluate(timeline, 350);
    const m = active.find((a) => a.clip.id === 'm')!;
    expect(m.progress).toBeCloseTo((350 - 100) / 500);
    expect(m.animating).toBe(true);
  });

  it('maintient un clip terminé mais gardé (progress=1, non animé)', () => {
    const active = evaluate(timeline, 700);
    const arr = active.find((a) => a.clip.id === 'arr')!;
    expect(arr.progress).toBe(1);
    expect(arr.animating).toBe(false);
    // Le move a disparu (visibleUntil=600).
    expect(active.find((a) => a.clip.id === 'm')).toBeUndefined();
  });
});

describe('navigation par points d’arrêt', () => {
  it('stepIndexAt repère l’étape courante', () => {
    expect(stepIndexAt(timeline, 0)).toBe(0);
    expect(stepIndexAt(timeline, 599)).toBe(0);
    expect(stepIndexAt(timeline, 600)).toBe(1);
  });

  it('nextStop avance au prochain arrêt, puis à la fin', () => {
    expect(nextStop(timeline, 0)).toBe(400);
    expect(nextStop(timeline, 400)).toBe(600);
    expect(nextStop(timeline, 600)).toBe(1000); // plus d’arrêt -> durée totale
  });

  it('prevStop recule à l’arrêt précédent, puis au début', () => {
    expect(prevStop(timeline, 700)).toBe(600);
    expect(prevStop(timeline, 500)).toBe(400);
    expect(prevStop(timeline, 400)).toBe(0); // pile sur un arrêt -> précédent (début)
  });
});

describe('evaluate — équivalence chemin optimisé vs fallback', () => {
  const equivNodes: DataFlowSpec['nodes'] = [
    { id: 'a', type: 'client' },
    { id: 'b', type: 'server' },
    { id: 'c', type: 'database' },
  ];
  const equivPackets: DataFlowSpec['packets'] = [
    { id: 'p', kind: 'http_packet' },
  ];

  function specOf(tl: DataFlowSpec['timeline']): DataFlowSpec {
    return { nodes: equivNodes, packets: equivPackets, timeline: tl };
  }

  // Force le chemin fallback (recherche dichotomique) en supprimant activeClips.
  function stripActiveClips(tl: Timeline): Timeline {
    return {
      ...tl,
      steps: tl.steps.map((step) => ({ ...step, activeClips: undefined })),
    };
  }

  // Grille dense : tous les 50 ms + les bornes exactes de chaque clip (±1 ms).
  function makeGrid(tl: Timeline): number[] {
    const pts = new Set<number>();
    for (let t = 0; t <= tl.durationMs; t += 50) pts.add(t);
    for (const clip of tl.clips) {
      for (const ms of [
        clip.startMs,
        clip.animStartMs,
        clip.endMs,
        clip.visibleUntilMs,
      ]) {
        pts.add(ms - 1);
        pts.add(ms);
        pts.add(ms + 1);
      }
    }
    return Array.from(pts)
      .filter((t) => t >= 0 && t <= tl.durationMs)
      .sort((a, b) => a - b);
  }

  function assertEquivalence(compiled: Timeline): void {
    const noCache = stripActiveClips(compiled);
    const byId = (a: ActiveClip, b: ActiveClip) =>
      a.clip.id < b.clip.id ? -1 : a.clip.id > b.clip.id ? 1 : 0;

    for (const t of makeGrid(compiled)) {
      const cached = evaluate(compiled, t).sort(byId);
      const fallback = evaluate(noCache, t).sort(byId);

      expect(
        cached.map((a) => a.clip.id),
        `clip ids à t=${t}`
      ).toEqual(fallback.map((a) => a.clip.id));

      for (let i = 0; i < cached.length; i++) {
        expect(
          cached[i].progress,
          `progress[${cached[i].clip.id}] à t=${t}`
        ).toBe(fallback[i].progress);
        expect(
          cached[i].animating,
          `animating[${cached[i].clip.id}] à t=${t}`
        ).toBe(fallback[i].animating);
      }
    }
  }

  it('séquentiel : deux moves consécutifs', () => {
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
          from: 'b',
          to: 'a',
          duration: 400,
        },
      ])
    );
    assertEquivalence(timeline);
  });

  it('parallel : move + arrow dans un bloc parallel, suivi d’un highlight', () => {
    const { timeline } = compile(
      specOf([
        {
          type: 'parallel',
          actions: [
            {
              type: 'move',
              id: 'pm',
              object: 'p',
              from: 'a',
              to: 'b',
              duration: 400,
            },
            { type: 'arrow', id: 'pa', from: 'a', to: 'b', duration: 600 },
          ],
        },
        { type: 'highlight', id: 'hl', object: 'b', duration: 300 },
      ])
    );
    assertEquivalence(timeline);
  });

  it('wait_for + keep_until_end : arrow persistante, move décalé, loading final', () => {
    const { timeline } = compile(
      specOf([
        { type: 'arrow', id: 'arr', from: 'a', to: 'b', duration: 800 },
        {
          type: 'move',
          id: 'mv',
          object: 'p',
          from: 'a',
          to: 'b',
          wait_for: 'arr',
          duration: 300,
          keep_until_next: false,
        },
        {
          type: 'loading',
          id: 'ld',
          object: 'c',
          duration: 600,
          keep_until_end: true,
        },
      ])
    );
    assertEquivalence(timeline);
  });
});
