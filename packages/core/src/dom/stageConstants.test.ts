import { describe, expect, it } from 'vitest';
import { lerp, NET_PALETTE } from './stageConstants';

describe('lerp', () => {
  it('returns the endpoints at 0 and 1', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('interpolates linearly', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(0, 1, 0.25)).toBe(0.25);
  });

  it('extrapolates outside [0, 1]', () => {
    expect(lerp(10, 20, 2)).toBe(30);
    expect(lerp(10, 20, -1)).toBe(0);
  });
});

describe('NET_PALETTE', () => {
  it('holds distinct colours — two nets must never collide', () => {
    expect(new Set(NET_PALETTE).size).toBe(NET_PALETTE.length);
  });
});
