import { describe, expect, it } from 'vitest';
import { clipOpacity, FADE_MS } from './clipOpacity';
import { APPEAR_HOLD } from '../engine/compiler';

// Clip minimal visible très longtemps (pas de contrainte de sortie).
const farEnd = 99_999;

describe("clipOpacity — fondu d'entrée avec hold (inDur > 0)", () => {
  const clip = { startMs: 0, animStartMs: APPEAR_HOLD, visibleUntilMs: farEnd };

  it('opacité 0 au premier instant', () => {
    expect(clipOpacity(clip, 0)).toBe(0);
  });

  it('opacité ~0.5 à mi-hold', () => {
    expect(clipOpacity(clip, APPEAR_HOLD / 2)).toBeCloseTo(0.5);
  });

  it('opacité 1 à la fin du hold', () => {
    expect(clipOpacity(clip, APPEAR_HOLD)).toBe(1);
  });

  it('reste à 1 longtemps après le hold', () => {
    expect(clipOpacity(clip, APPEAR_HOLD + 1000)).toBe(1);
  });
});

describe("clipOpacity — fondu d'entrée sans hold (inDur = 0, sur FADE_MS)", () => {
  const clip = { startMs: 0, animStartMs: 0, visibleUntilMs: farEnd };

  it('opacité 0 à t=0', () => {
    expect(clipOpacity(clip, 0)).toBe(0);
  });

  it('opacité ~0.5 à t=FADE_MS/2', () => {
    expect(clipOpacity(clip, FADE_MS / 2)).toBeCloseTo(0.5);
  });

  it('opacité 1 à t=FADE_MS', () => {
    expect(clipOpacity(clip, FADE_MS)).toBe(1);
  });
});

describe('clipOpacity — fondu de sortie sur FADE_MS', () => {
  const clip = { startMs: 0, animStartMs: 0, visibleUntilMs: 1000 };

  it('opacité 1 avant le début du fondu de sortie', () => {
    // outStart = 1000 - FADE_MS ; on vérifie un instant légèrement avant
    expect(clipOpacity(clip, 1000 - FADE_MS - 1)).toBe(1);
  });

  it('opacité ~0.5 à mi-sortie', () => {
    expect(clipOpacity(clip, 1000 - FADE_MS / 2)).toBeCloseTo(0.5);
  });

  it('opacité 0 à visibleUntilMs', () => {
    expect(clipOpacity(clip, 1000)).toBe(0);
  });
});

describe('clipOpacity — keepEnd supprime le fondu de sortie', () => {
  const clip = {
    startMs: 0,
    animStartMs: 0,
    visibleUntilMs: 1000,
    keepEnd: true,
  };

  it('opacité 1 à mi-sortie théorique', () => {
    expect(clipOpacity(clip, 1000 - FADE_MS / 2)).toBe(1);
  });

  it('opacité 1 à visibleUntilMs exact', () => {
    expect(clipOpacity(clip, 1000)).toBe(1);
  });

  it('opacité 1 au-delà de visibleUntilMs', () => {
    expect(clipOpacity(clip, 1500)).toBe(1);
  });
});
