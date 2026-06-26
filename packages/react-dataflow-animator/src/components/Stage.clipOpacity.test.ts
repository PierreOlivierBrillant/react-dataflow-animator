import { describe, expect, it } from 'vitest';
import { clipOpacity, contentCrossfade, FADE_MS } from './clipOpacity';
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

describe('clipOpacity — fadeInMs personnalisé', () => {
  it("fade_in_ms: 100 remplace FADE_MS pour le fondu d'entrée", () => {
    const clip = {
      startMs: 0,
      animStartMs: 0,
      visibleUntilMs: 99_999,
      fadeInMs: 100,
    };
    expect(clipOpacity(clip, 0)).toBe(0);
    expect(clipOpacity(clip, 50)).toBeCloseTo(0.5);
    expect(clipOpacity(clip, 100)).toBe(1);
    expect(clipOpacity(clip, 200)).toBe(1);
  });

  it('fade_in_ms: 0 = apparition instantanée', () => {
    const clip = {
      startMs: 0,
      animStartMs: 0,
      visibleUntilMs: 99_999,
      fadeInMs: 0,
    };
    expect(clipOpacity(clip, 0)).toBe(1);
    expect(clipOpacity(clip, 500)).toBe(1);
  });

  it('fade_in_ms remplace aussi le hold de départ (move)', () => {
    // Pour un move, inDur = APPEAR_HOLD = 300 ; fadeInMs = 100 prend le dessus.
    const clip = {
      startMs: 0,
      animStartMs: APPEAR_HOLD,
      visibleUntilMs: 99_999,
      fadeInMs: 100,
    };
    expect(clipOpacity(clip, 0)).toBe(0);
    expect(clipOpacity(clip, 50)).toBeCloseTo(0.5);
    expect(clipOpacity(clip, 100)).toBe(1);
  });
});

describe('contentCrossfade — fondu set_content adouci (easeInOutCubic)', () => {
  // inDur = 0 → fondu d'entrée sur FADE_MS.
  const clip = { startMs: 0, animStartMs: 0, visibleUntilMs: farEnd };

  it('partage les points fixes de clipOpacity (0, 0.5, 1)', () => {
    expect(contentCrossfade(clip, 0)).toBe(0);
    expect(contentCrossfade(clip, FADE_MS / 2)).toBeCloseTo(0.5);
    expect(contentCrossfade(clip, FADE_MS)).toBe(1);
  });

  it('démarre plus lentement que le linéaire (départ ralenti)', () => {
    // Au quart du fondu, le linéaire vaut 0.25 ; l'eased reste sous 0.25.
    const linear = clipOpacity(clip, FADE_MS / 4);
    const eased = contentCrossfade(clip, FADE_MS / 4);
    expect(linear).toBeCloseTo(0.25);
    expect(eased).toBeLessThan(linear);
  });

  it('finit plus lentement que le linéaire (arrivée ralentie)', () => {
    // Aux trois quarts, l'eased dépasse le linéaire (il accélère au milieu).
    const linear = clipOpacity(clip, (FADE_MS * 3) / 4);
    const eased = contentCrossfade(clip, (FADE_MS * 3) / 4);
    expect(eased).toBeGreaterThan(linear);
  });
});

describe('clipOpacity — fadeOutMs personnalisé', () => {
  it('fade_out_ms: 100 remplace FADE_MS pour le fondu de sortie', () => {
    const clip = {
      startMs: 0,
      animStartMs: 0,
      visibleUntilMs: 1000,
      fadeOutMs: 100,
    };
    expect(clipOpacity(clip, 899)).toBe(1);
    expect(clipOpacity(clip, 950)).toBeCloseTo(0.5);
    expect(clipOpacity(clip, 1000)).toBe(0);
  });

  it("fade_out_ms: 0 = disparition instantanée (opacité 1 jusqu'à la fin)", () => {
    const clip = {
      startMs: 0,
      animStartMs: 0,
      visibleUntilMs: 1000,
      fadeOutMs: 0,
    };
    expect(clipOpacity(clip, 999)).toBe(1);
    expect(clipOpacity(clip, 1000)).toBe(1);
  });
});
