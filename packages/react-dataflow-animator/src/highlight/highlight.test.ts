import { describe, expect, it } from 'vitest';
import { escapeHtml, highlightCode } from './highlight';

describe('escapeHtml', () => {
  it('échappe &, < et > dans le bon ordre', () => {
    expect(escapeHtml('& < >')).toBe('&amp; &lt; &gt;');
  });

  it('chaîne vide → chaîne vide', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('chaîne sans caractères spéciaux → identité', () => {
    const s = 'hello world 123';
    expect(escapeHtml(s)).toBe(s);
  });
});

describe('highlightCode', () => {
  it('langage javascript reconnu : sortie contient <span class="token …">', () => {
    const output = highlightCode('const x = 1;', 'javascript');
    expect(output).toMatch(/<span class="token /);
  });

  it('alias js : produit le même résultat que javascript', () => {
    const code = 'const x = 1;';
    expect(highlightCode(code, 'js')).toBe(highlightCode(code, 'javascript'));
  });

  it('alias dotnet (→ csharp) : sortie tokenisée', () => {
    const output = highlightCode('int x = 1;', 'dotnet');
    expect(output).toMatch(/<span class="token /);
  });

  it('alias html (→ markup) : sortie tokenisée', () => {
    const output = highlightCode('<div>hello</div>', 'html');
    expect(output).toMatch(/<span class="token /);
  });

  it('langage inconnu_xyz : retourne escapeHtml(code)', () => {
    const code = 'some code';
    expect(highlightCode(code, 'inconnu_xyz')).toBe(escapeHtml(code));
  });

  it('langage undefined ou chaîne vide : retourne escapeHtml(code)', () => {
    const code = 'some code';
    expect(highlightCode(code, '')).toBe(escapeHtml(code));
    expect(
      (highlightCode as (code: string, language: unknown) => string)(
        code,
        undefined
      )
    ).toBe(escapeHtml(code));
  });

  it('code contenant < et & : ces caractères sont échappés dans la sortie', () => {
    const code = 'a < b && c';
    const output = highlightCode(code, 'inconnu_xyz');
    expect(output).toContain('&lt;');
    expect(output).toContain('&amp;');
  });

  it('code vide : retourne chaîne vide', () => {
    expect(highlightCode('', 'javascript')).toBe('');
  });
});
