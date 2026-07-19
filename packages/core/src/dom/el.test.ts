/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { h, pct, px, s, setAttrIfChanged, setStyle, syncStyle } from './el';

describe('h', () => {
  it('sets attributes and appends string and node children', () => {
    const child = h('em', undefined, ['inner']);
    const el = h('div', { class: 'rdfa-node', 'data-node-id': 'a' }, [
      'text',
      child,
    ]);

    expect(el.tagName).toBe('DIV');
    expect(el.getAttribute('class')).toBe('rdfa-node');
    expect(el.getAttribute('data-node-id')).toBe('a');
    expect(el.childNodes).toHaveLength(2);
    expect(el.textContent).toBe('textinner');
  });

  it('skips undefined attributes the way React omits them', () => {
    const el = h('div', { class: 'x', title: undefined });

    expect(el.hasAttribute('class')).toBe(true);
    expect(el.hasAttribute('title')).toBe(false);
  });

  it('accepts no attributes and no children', () => {
    expect(h('span').childNodes).toHaveLength(0);
  });
});

describe('s', () => {
  it('creates elements in the SVG namespace', () => {
    const el = s('svg', { viewBox: '0 0 24 24' });

    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(el.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('routes class through setAttribute — `className` is read-only on SVG', () => {
    const el = s('path', { class: 'rdfa-arrow-line', 'stroke-width': '1.6' });

    expect(el.getAttribute('class')).toBe('rdfa-arrow-line');
    expect(el.getAttribute('stroke-width')).toBe('1.6');
  });

  it('nests children', () => {
    const el = s('g', undefined, [s('circle', { r: '3' })]);

    expect(el.firstElementChild?.tagName).toBe('circle');
  });
});

describe('setStyle', () => {
  it('sets ordinary properties and custom properties alike', () => {
    const el = h('div');
    setStyle(el, { left: '10px', '--rdfa-scale': '1.2' });

    expect(el.style.left).toBe('10px');
    expect(el.style.getPropertyValue('--rdfa-scale')).toBe('1.2');
  });

  it('skips undefined values', () => {
    const el = h('div');
    setStyle(el, { left: '10px', opacity: undefined });

    expect(el.style.opacity).toBe('');
  });

  it('works on SVG elements too', () => {
    const el = s('g');
    setStyle(el, { '--rdfa-arrow': '#f00' });

    expect(el.style.getPropertyValue('--rdfa-arrow')).toBe('#f00');
  });
});

describe('px / pct', () => {
  it('formats pixel lengths', () => {
    expect(px(12)).toBe('12px');
    expect(px(-0.5)).toBe('-0.5px');
  });

  it('formats placement fractions as percentages', () => {
    expect(pct(0.5)).toBe('50%');
    expect(pct(0)).toBe('0%');
    expect(pct(1)).toBe('100%');
  });
});

describe('syncStyle', () => {
  it('removes a declaration the previous call wrote and this one does not', () => {
    const el = document.createElement('span');
    const first = syncStyle(el, { opacity: '0.5', transform: 'rotate(3deg)' });
    expect(first).toEqual(['opacity', 'transform']);
    const second = syncStyle(el, { opacity: '0.5' }, first);
    expect(second).toEqual(['opacity']);
    expect(el.style.getPropertyValue('transform')).toBe('');
  });

  it('drops the empty style attribute when the last declaration goes', () => {
    const el = document.createElement('span');
    const keys = syncStyle(el, { opacity: '0.5' });
    expect(el.hasAttribute('style')).toBe(true);
    syncStyle(el, {}, keys);
    expect(el.style.length).toBe(0);
    expect(el.hasAttribute('style')).toBe(false);
  });

  it('handles custom properties, which el.style cannot reach by assignment', () => {
    const el = document.createElement('span');
    const keys = syncStyle(el, { '--rdfa-arrow': 'red' });
    expect(el.style.getPropertyValue('--rdfa-arrow')).toBe('red');
    syncStyle(el, {}, keys);
    expect(el.hasAttribute('style')).toBe(false);
  });
});

describe('setAttrIfChanged', () => {
  it('writes only when the value differs', () => {
    const el = document.createElement('div');
    setAttrIfChanged(el, 'd', 'M0 0');
    expect(el.getAttribute('d')).toBe('M0 0');
    setAttrIfChanged(el, 'd', 'M1 1');
    expect(el.getAttribute('d')).toBe('M1 1');
  });
});
