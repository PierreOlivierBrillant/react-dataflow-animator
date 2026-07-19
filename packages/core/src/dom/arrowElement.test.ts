/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { buildArrowElement, type ArrowDescriptor } from './arrowElement';
import type { NodeGeom } from '../engine/geometry';

const from: NodeGeom = { id: 'a', x: 100, y: 100, width: 40, height: 40 };
const to: NodeGeom = { id: 'b', x: 400, y: 100, width: 40, height: 40 };

/** Unwraps to the `<g>`: these assertions are about the emitted markup, not
 *  about the retained handle `applyArrowElement` mutates. */
const arrow = (over: Partial<ArrowDescriptor> = {}): SVGGElement =>
  buildArrowElement({ from, to, progress: 1, ...over }).g;

describe('buildArrowElement — line', () => {
  it('emits a g wrapping a classed path', () => {
    const g = arrow();
    const path = g.querySelector('path');

    expect(g.tagName).toBe('g');
    expect(path?.getAttribute('class')).toBe('rdfa-arrow-line');
    expect(path?.getAttribute('d')).toBeTruthy();
  });

  it('always emits data-style, defaulting to solid', () => {
    expect(arrow().querySelector('path')?.getAttribute('data-style')).toBe(
      'solid'
    );
    expect(
      arrow({ style: 'dashed' })
        .querySelector('path')
        ?.getAttribute('data-style')
    ).toBe('dashed');
  });

  it('marks a highlighted line and head', () => {
    const g = arrow({ highlighted: true });

    expect(g.querySelector('path')?.getAttribute('class')).toBe(
      'rdfa-arrow-line rdfa-arrow-line--highlight'
    );
    expect(g.querySelector('polygon')?.getAttribute('class')).toBe(
      'rdfa-arrow-head rdfa-arrow-head--highlight'
    );
  });

  it('overrides the theme stroke through a custom property', () => {
    expect(
      arrow({ color: '#f0f' }).style.getPropertyValue('--rdfa-arrow')
    ).toBe('#f0f');
    expect(arrow().style.getPropertyValue('--rdfa-arrow')).toBe('');
  });
});

describe('buildArrowElement — heads', () => {
  it('draws a forward head by default', () => {
    expect(arrow().querySelectorAll('polygon')).toHaveLength(1);
  });

  it('honours the head style', () => {
    expect(
      arrow({ arrow_head: 'none' }).querySelectorAll('polygon')
    ).toHaveLength(0);
    expect(
      arrow({ arrow_head: 'backward' }).querySelectorAll('polygon')
    ).toHaveLength(1);
    expect(
      arrow({ arrow_head: 'both' }).querySelectorAll('polygon')
    ).toHaveLength(2);
  });

  it('suppresses the heads below the progress threshold', () => {
    // Under 2% drawn there is no room for a triangle.
    expect(arrow({ progress: 0.01 }).querySelectorAll('polygon')).toHaveLength(
      0
    );
    expect(arrow({ progress: 0.5 }).querySelectorAll('polygon')).toHaveLength(
      1
    );
  });

  it('gives each head three points', () => {
    const points = arrow().querySelector('polygon')?.getAttribute('points');

    expect(points?.split(' ')).toHaveLength(3);
  });
});

describe('buildArrowElement — label', () => {
  it('omits the text element when there is no label', () => {
    expect(arrow().querySelector('text')).toBeNull();
  });

  it('centres the label and fades it with progress', () => {
    const text = arrow({ text: 'GET', progress: 0.5 }).querySelector('text');

    expect(text?.getAttribute('class')).toBe('rdfa-arrow-label');
    expect(text?.getAttribute('text-anchor')).toBe('middle');
    expect(text?.getAttribute('opacity')).toBe('0.5');
    expect(text?.textContent).toBe('GET');
  });

  it('renders rich text in the label as tspans', () => {
    const text = arrow({ text: '$x_1$' }).querySelector('text');

    expect(text?.querySelectorAll('tspan').length).toBeGreaterThan(1);
  });
});

describe('buildArrowElement — routed wire', () => {
  it('follows a precomputed polyline instead of routing', () => {
    const route = [
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ];
    const d = arrow({ route, arrow_head: 'none' })
      .querySelector('path')
      ?.getAttribute('d');

    expect(d).toContain('0,0');
    expect(d).toContain('100,50');
  });

  it('ignores a degenerate route and falls back to routing', () => {
    const single = arrow({ route: [{ x: 0, y: 0 }] });

    expect(single.querySelector('path')?.getAttribute('d')).toBeTruthy();
  });

  it('accepts hop bridges over crossing wires', () => {
    const route = [
      { x: 0, y: 50 },
      { x: 200, y: 50 },
    ];
    const withHops = arrow({
      route,
      hops: [{ x: 100, y: 50 }],
      hopRadius: 5,
      arrow_head: 'none',
    });
    const plain = arrow({ route, arrow_head: 'none' });

    expect(withHops.querySelector('path')?.getAttribute('d')).not.toBe(
      plain.querySelector('path')?.getAttribute('d')
    );
  });
});
