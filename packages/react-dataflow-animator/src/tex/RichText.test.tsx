/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { richText, richTextSvg } from './RichText';

afterEach(cleanup);

const html = (text: string) => render(<div>{richText(text)}</div>).container;
const svg = (text: string) =>
  render(
    <svg>
      <text>{richTextSvg(text)}</text>
    </svg>
  ).container;

describe('richText — rendu HTML', () => {
  it('sans math, renvoie la chaîne telle quelle (aucun wrapper)', () => {
    expect(richText('R1 · 10 kΩ')).toBe('R1 · 10 kΩ');
  });

  it('$B_{in}$ rend un indice', () => {
    const c = html('$B_{in}$');
    expect(c.querySelector('sub')?.textContent).toBe('in');
    expect(c.textContent).toBe('Bin');
  });

  it('exposant', () => {
    expect(html('$x^2$').querySelector('sup')?.textContent).toBe('2');
  });

  it('les variables sont en italique, pas les unités', () => {
    const c = html('$R_1 = 10\\,\\Omega$');
    const italics = [...c.querySelectorAll('i')].map((e) => e.textContent);
    expect(italics).toContain('R');
    expect(italics).not.toContain('Ω');
  });

  it('\\overline pose une barre au-dessus', () => {
    expect(
      html('$\\overline{A}$').querySelector('.rdfa-tex-over')?.textContent
    ).toBe('A');
  });

  it('la prose autour du segment math est préservée', () => {
    expect(html('Retenue $B_{in}$ à 1').textContent).toBe('Retenue Bin à 1');
  });
});

describe('richTextSvg — rendu dans un <text> SVG', () => {
  it('sans math, renvoie la chaîne telle quelle', () => {
    expect(richTextSvg('Diff')).toBe('Diff');
  });

  it('utilise des tspan (pas de <sub>, qui n’existe pas en SVG)', () => {
    const c = svg('$B_{in}$');
    expect(c.querySelector('sub')).toBeNull();
    expect(c.querySelectorAll('tspan')).toHaveLength(2);
    expect(c.querySelector('text')?.textContent).toBe('Bin');
  });

  it('décale l’indice vers le bas et le rapetisse', () => {
    const [base, sub] = [...svg('$B_{in}$').querySelectorAll('tspan')];
    expect(base.getAttribute('dy')).toBeNull();
    expect(Number(sub.getAttribute('dy')?.replace('em', ''))).toBeGreaterThan(
      0
    );
    expect(sub.getAttribute('font-size')).toBe('0.75em');
  });

  it('l’exposant monte (dy négatif en SVG)', () => {
    const [, sup] = [...svg('$x^2$').querySelectorAll('tspan')];
    expect(Number(sup.getAttribute('dy')?.replace('em', ''))).toBeLessThan(0);
  });

  it('dy est cumulatif : le retour à la ligne de base est compensé', () => {
    // 'B' then sub 'in' then '=1' — the last run must undo the subscript shift
    // exactly, or the rest of the label rides low forever.
    const runs = [...svg('$B_{in}=1$').querySelectorAll('tspan')];
    const dys = runs.map((r) =>
      Number(r.getAttribute('dy')?.replace('em', '') ?? 0)
    );
    const scales = runs.map((r) =>
      Number(r.getAttribute('font-size')?.replace('em', '') ?? 1)
    );
    // Sum the shifts back in base-em units: each dy is in its own tspan's em.
    // Tolerance is the emitted precision (toFixed(3)), not slack in the maths:
    // the residue is rounding only — sub-thousandth of an em.
    const total = dys.reduce((acc, dy, i) => acc + dy * scales[i], 0);
    expect(total).toBeCloseTo(0, 3);
  });

  it('les espaces \\, deviennent un dx sur le run suivant (un tspan vide n’avance pas)', () => {
    const runs = [...svg('$10\\,\\Omega$').querySelectorAll('tspan')];
    expect(runs).toHaveLength(2);
    expect(runs[1].getAttribute('dx')).toBeTruthy();
    expect(runs[1].textContent).toBe('Ω');
  });
});
