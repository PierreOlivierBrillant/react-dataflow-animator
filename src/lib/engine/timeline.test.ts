import { describe, expect, it } from 'vitest';
import {
  evaluate,
  nextStop,
  prevStop,
  stepIndexAt,
  type Timeline,
} from './timeline';

const timeline: Timeline = {
  clips: [
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
      shift: 0,
    },
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
      style: 'full',
      shift: 0,
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
