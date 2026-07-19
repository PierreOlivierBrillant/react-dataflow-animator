/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { firstDifference, normalizeStageHtml } from './normalizeHtml';

const frag = (html: string): Element => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild!;
};

const norm = (html: string): string => normalizeStageHtml(frag(html));

describe('normalizeStageHtml — what it normalises away', () => {
  it('ignores attribute order', () => {
    expect(norm('<div a="1" b="2"></div>')).toBe(
      norm('<div b="2" a="1"></div>')
    );
  });

  it('ignores inline declaration order', () => {
    expect(norm('<div style="top:1px;left:2px"></div>')).toBe(
      norm('<div style="left:2px;top:1px"></div>')
    );
  });

  it('ignores float noise below the retained precision', () => {
    expect(norm('<div style="left:1.0000001px"></div>')).toBe(
      norm('<div style="left:1px"></div>')
    );
  });

  it('rounds numbers inside path data the same way', () => {
    expect(norm('<path d="M 1.0000001 2"></path>')).toBe(
      norm('<path d="M 1 2"></path>')
    );
  });

  it('treats trailing zeros as the same number', () => {
    expect(norm('<div style="opacity:0.500"></div>')).toBe(
      norm('<div style="opacity:0.5"></div>')
    );
  });
});

describe('normalizeStageHtml — what it must NOT normalise away', () => {
  it('distinguishes a real difference in a declaration', () => {
    expect(norm('<div style="left:1px"></div>')).not.toBe(
      norm('<div style="left:2px"></div>')
    );
  });

  it('distinguishes an absent style attribute from an empty one', () => {
    expect(norm('<div></div>')).not.toBe(norm('<div style=""></div>'));
  });

  it('distinguishes child order', () => {
    expect(norm('<div><a></a><b></b></div>')).not.toBe(
      norm('<div><b></b><a></a></div>')
    );
  });

  it('distinguishes class names and text content', () => {
    expect(norm('<div class="x">hi</div>')).not.toBe(
      norm('<div class="y">hi</div>')
    );
    expect(norm('<div>hi</div>')).not.toBe(norm('<div>ho</div>'));
  });

  it('distinguishes a difference above the retained precision', () => {
    expect(norm('<div style="left:1.001px"></div>')).not.toBe(
      norm('<div style="left:1.002px"></div>')
    );
  });

  it('keeps a declaration that has no value separator intact', () => {
    expect(norm('<div style="left:1px;;"></div>')).toContain('left:1px');
  });

  it('leaves non-numeric attribute values alone', () => {
    expect(norm('<div data-x="v1.2.3-beta"></div>')).toContain('v1.2.3-beta');
  });
});

describe('firstDifference', () => {
  it('returns null for identical strings', () => {
    expect(firstDifference('abc', 'abc')).toBeNull();
  });

  it('reports the offset and a window of context', () => {
    // context=1 → the window spans [index-1, index+1).
    const diff = firstDifference('aXc', 'aYc', 1);
    expect(diff).not.toBeNull();
    expect(diff!.index).toBe(1);
    expect(diff!.a).toBe('aX');
    expect(diff!.b).toBe('aY');
    expect(firstDifference('aXc', 'aYc', 10)!.a).toBe('aXc');
  });

  it('handles one string being a prefix of the other', () => {
    const diff = firstDifference('ab', 'abc');
    expect(diff!.index).toBe(2);
  });
});
