import { describe, expect, it } from 'vitest';
import { isPlainText, parseMath, parseRichText } from './parse';

describe('parseRichText — segmentation $…$', () => {
  it('sans $, la chaîne reste un unique littéral', () => {
    expect(parseRichText('R1 · 10 kΩ')).toEqual([
      { kind: 'literal', value: 'R1 · 10 kΩ' },
    ]);
  });

  it('isolate le segment math et garde la prose autour', () => {
    const segs = parseRichText('Retenue $B_{in}$ à 1');
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ kind: 'literal', value: 'Retenue ' });
    expect(segs[1].kind).toBe('math');
    expect(segs[2]).toEqual({ kind: 'literal', value: ' à 1' });
  });

  it('un $ non apparié reste littéral (pas de math à moitié ouverte)', () => {
    expect(parseRichText('coût: 5$')).toEqual([
      { kind: 'literal', value: 'coût: 5$' },
    ]);
  });

  it('\\$ produit un dollar littéral sans ouvrir de math', () => {
    expect(parseRichText('\\$5 et \\$7')).toEqual([
      { kind: 'literal', value: '$5 et $7' },
    ]);
  });

  it('un $ échappé À L’INTÉRIEUR ne ferme pas le segment', () => {
    const segs = parseRichText('$a \\$ b$ fin');
    expect(segs[0].kind).toBe('math');
    expect(segs[1]).toEqual({ kind: 'literal', value: ' fin' });
  });

  it('$$ (display math, non supporté) reste littéral au lieu d’être avalé', () => {
    expect(parseRichText('a $$ b')).toEqual([
      { kind: 'literal', value: 'a $$ b' },
    ]);
  });

  it('un underscore hors math ne devient PAS un indice (rétrocompatibilité)', () => {
    expect(isPlainText('snake_case')).toBe(true);
    expect(parseRichText('snake_case')).toEqual([
      { kind: 'literal', value: 'snake_case' },
    ]);
  });
});

describe('parseMath — sous-ensemble LaTeX', () => {
  it('indice à accolades', () => {
    expect(parseMath('B_{in}')).toEqual([
      { kind: 'var', value: 'B' },
      { kind: 'sub', children: [{ kind: 'var', value: 'in' }] },
    ]);
  });

  it('indice à caractère unique : x_1 == x_{1}', () => {
    expect(parseMath('x_1')).toEqual(parseMath('x_{1}'));
  });

  it('exposant', () => {
    expect(parseMath('x^2')).toEqual([
      { kind: 'var', value: 'x' },
      { kind: 'sup', children: [{ kind: 'text', value: '2' }] },
    ]);
  });

  it('sépare variables (italique) et non-variables (droit) dans un même run', () => {
    expect(parseMath('2x')).toEqual([
      { kind: 'text', value: '2' },
      { kind: 'var', value: 'x' },
    ]);
  });

  it('\\overline — le complément logique', () => {
    expect(parseMath('\\overline{A}')).toEqual([
      { kind: 'over', children: [{ kind: 'var', value: 'A' }] },
    ]);
  });

  it('grec minuscule = variable (italique), majuscule et unité = droit', () => {
    expect(parseMath('\\mu')).toEqual([{ kind: 'var', value: 'μ' }]);
    expect(parseMath('\\Omega')).toEqual([{ kind: 'text', value: 'Ω' }]);
  });

  it('opérateurs et flèches', () => {
    expect(parseMath('\\cdot\\to\\leq')).toEqual([
      { kind: 'text', value: '·' },
      { kind: 'text', value: '→' },
      { kind: 'text', value: '≤' },
    ]);
  });

  it('\\text rend son argument droit, espaces compris', () => {
    expect(parseMath('\\text{in out}')).toEqual([
      { kind: 'text', value: 'in out' },
    ]);
  });

  it('commandes d’espacement', () => {
    expect(parseMath('\\,')).toEqual([{ kind: 'space', em: 0.167 }]);
    expect(parseMath('\\quad')).toEqual([{ kind: 'space', em: 1 }]);
  });

  it('groupe : plusieurs atomes sous un même indice', () => {
    expect(parseMath('A_{n+1}')).toEqual([
      { kind: 'var', value: 'A' },
      {
        kind: 'sub',
        children: [
          { kind: 'var', value: 'n' },
          // '+1' is one upright run: only the variable/non-variable frontier
          // splits a run, so the AST stays as small as the styling requires.
          { kind: 'text', value: '+1' },
        ],
      },
    ]);
  });

  it('une commande inconnue est ignorée plutôt que rendue littéralement', () => {
    expect(parseMath('A\\frobnicate B')).toEqual([
      { kind: 'var', value: 'A' },
      { kind: 'text', value: ' ' },
      { kind: 'var', value: 'B' },
    ]);
  });

  it('ne boucle pas sur des entrées malformées', () => {
    // Each of these once risked leaving the cursor un-advanced.
    for (const src of ['_', '^', '{', '}', '\\', 'a_{', '\\overline', '_{}']) {
      expect(() => parseMath(src)).not.toThrow();
    }
  });
});
