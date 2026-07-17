import { describe, expect, it } from 'vitest';
import { COMPONENT_PINS, parseRef, refNode, resolvePin } from './pins';

describe('parseRef', () => {
  it('splits a "node:pin" reference on the first colon', () => {
    expect(parseRef('R1:a')).toEqual({ node: 'R1', pin: 'a' });
    expect(parseRef('Q1:base')).toEqual({ node: 'Q1', pin: 'base' });
  });

  it('returns no pin for a bare node id', () => {
    expect(parseRef('battery')).toEqual({ node: 'battery' });
  });

  it('treats a trailing empty pin as no pin', () => {
    expect(parseRef('node:')).toEqual({ node: 'node' });
  });

  it('splits on the FIRST colon only (pin may contain more)', () => {
    expect(parseRef('n:a:b')).toEqual({ node: 'n', pin: 'a:b' });
  });
});

describe('refNode', () => {
  it('drops the pin part', () => {
    expect(refNode('R1:a')).toBe('R1');
    expect(refNode('R1')).toBe('R1');
    expect(refNode('n:')).toBe('n');
  });
});

describe('resolvePin', () => {
  it('resolves a known terminal of a component type', () => {
    expect(resolvePin('resistor', 'a')).toEqual({
      x: 0,
      y: 0.5,
      nx: -1,
      ny: 0,
    });
    expect(resolvePin('resistor', 'b')).toEqual({ x: 1, y: 0.5, nx: 1, ny: 0 });
  });

  it('resolves the polarity aliases of a source', () => {
    expect(resolvePin('battery', '+')).toEqual(resolvePin('battery', 'b'));
    expect(resolvePin('battery', '-')).toEqual(resolvePin('battery', 'a'));
  });

  it('resolves the three transistor terminals distinctly', () => {
    const base = resolvePin('transistor_npn', 'base');
    const collector = resolvePin('transistor_npn', 'collector');
    const emitter = resolvePin('transistor_npn', 'emitter');
    expect(base).toBeDefined();
    expect(collector).toBeDefined();
    expect(emitter).toBeDefined();
    expect(collector).not.toEqual(emitter);
  });

  it('resolves logic-gate terminals: a/b inputs on the left, y output on the right', () => {
    const a = resolvePin('and_gate', 'a')!;
    const b = resolvePin('and_gate', 'b')!;
    const y = resolvePin('and_gate', 'y')!;
    expect(a.nx).toBeLessThan(0); // input, faces left
    expect(b.nx).toBeLessThan(0);
    expect(y.nx).toBeGreaterThan(0); // output, faces right
    expect(a.y).toBeLessThan(b.y); // a above b
    expect(resolvePin('and_gate', 'out')).toEqual(y); // alias
    // NOT gate has a single input.
    expect(resolvePin('not_gate', 'a')!.nx).toBeLessThan(0);
    expect(resolvePin('not_gate', 'y')!.nx).toBeGreaterThan(0);
  });

  it('returns undefined for no pin, unknown pin, or a type without terminals', () => {
    expect(resolvePin('resistor', undefined)).toBeUndefined();
    expect(resolvePin('resistor', 'zzz')).toBeUndefined();
    expect(resolvePin('server', 'a')).toBeUndefined();
  });
});

describe('COMPONENT_PINS catalog', () => {
  it('every terminal carries a position and an outward normal', () => {
    for (const [, pins] of Object.entries(COMPONENT_PINS)) {
      for (const [, def] of Object.entries(pins!)) {
        expect(def.x).toBeGreaterThanOrEqual(0);
        expect(def.x).toBeLessThanOrEqual(1);
        expect(def.y).toBeGreaterThanOrEqual(0);
        expect(def.y).toBeLessThanOrEqual(1);
        expect(Math.hypot(def.nx, def.ny)).toBeGreaterThan(0);
      }
    }
  });
});
