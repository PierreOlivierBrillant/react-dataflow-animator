/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { appendRichText, appendRichTextSvg } from './richtext';
import { h, s } from './el';

const html = (text: string): string => {
  const el = h('span');
  appendRichText(el, text);
  return el.innerHTML;
};

const svg = (text: string): string => {
  const el = s('text');
  appendRichTextSvg(el, text);
  return el.innerHTML;
};

describe('appendRichText', () => {
  it('emits plain prose as a single text node, unwrapped', () => {
    const el = h('span');
    appendRichText(el, 'Hello world');

    expect(el.childNodes).toHaveLength(1);
    expect(el.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(el.textContent).toBe('Hello world');
  });

  it('wraps a math span in .rdfa-tex and italicises variables', () => {
    expect(html('$x$')).toBe(
      '<span class="rdfa-tex"><i class="rdfa-tex-var">x</i></span>'
    );
  });

  it('keeps the literal text around a math span', () => {
    expect(html('speed $v$ now')).toBe(
      'speed <span class="rdfa-tex"><i class="rdfa-tex-var">v</i></span> now'
    );
  });

  it('renders subscripts and superscripts', () => {
    expect(html('$x_1$')).toContain('<sub>1</sub>');
    expect(html('$x^2$')).toContain('<sup>2</sup>');
  });

  it('renders an overline', () => {
    expect(html('$\\overline{Q}$')).toContain('rdfa-tex-over');
  });

  it('renders a thin space as a margin, not as text', () => {
    const out = html('$a\\,b$');

    expect(out).toContain('class="rdfa-tex-space"');
    expect(out).toContain('margin-left');
  });

  it('escapes nothing itself — the DOM does it', () => {
    const el = h('span');
    appendRichText(el, '<script>alert(1)</script>');

    // A text node, so the markup is inert.
    expect(el.querySelector('script')).toBeNull();
    expect(el.textContent).toBe('<script>alert(1)</script>');
  });
});

describe('appendRichTextSvg', () => {
  it('emits plain prose as a single text node, with no tspan', () => {
    const el = s('text');
    appendRichTextSvg(el, 'GET /users');

    expect(el.querySelectorAll('tspan')).toHaveLength(0);
    expect(el.textContent).toBe('GET /users');
  });

  it('flattens a subscript into sibling tspans with a cumulative dy', () => {
    const el = s('text');
    appendRichTextSvg(el, '$x_1$');
    const spans = [...el.querySelectorAll('tspan')];

    expect(spans).toHaveLength(2);
    // Base run: no shift, no scale attribute.
    expect(spans[0].hasAttribute('dy')).toBe(false);
    expect(spans[0].hasAttribute('font-size')).toBe(false);
    expect(spans[0].getAttribute('font-style')).toBe('italic');
    // Script run: shifted down, and shrunk to 0.75em.
    expect(spans[1].getAttribute('font-size')).toBe('0.75em');
    expect(spans[1].getAttribute('dy')).toBeTruthy();
  });

  it('returns the baseline on the run FOLLOWING a script', () => {
    const el = s('text');
    appendRichTextSvg(el, '$x_1y$');
    const spans = [...el.querySelectorAll('tspan')];

    // dy is cumulative: the third run has to undo the second's shift, so the
    // two must carry opposite signs.
    const down = parseFloat(spans[1].getAttribute('dy') ?? '0');
    const up = parseFloat(spans[2].getAttribute('dy') ?? '0');
    expect(down).toBeGreaterThan(0);
    expect(up).toBeLessThan(0);
  });

  it('rides a thin space on the next run as dx, not as its own tspan', () => {
    const el = s('text');
    appendRichTextSvg(el, '$a\\,b$');
    const spans = [...el.querySelectorAll('tspan')];

    // An empty tspan advances nothing, so the gap cannot be its own element.
    expect(spans).toHaveLength(2);
    expect(spans[0].hasAttribute('dx')).toBe(false);
    expect(spans[1].getAttribute('dx')).toMatch(/em$/);
  });

  it('marks an overline with text-decoration', () => {
    expect(svg('$\\overline{Q}$')).toContain('text-decoration="overline"');
  });

  it('stops shrinking at depth 2', () => {
    const el = s('text');
    appendRichTextSvg(el, '$x_{a_{b_{c}}}$');
    const sizes = [...el.querySelectorAll('tspan')]
      .map((sp) => sp.getAttribute('font-size'))
      .filter(Boolean);

    // 0.75^2 is the floor — never 0.75^3.
    const smallest = Math.min(...sizes.map((v) => parseFloat(v as string)));
    expect(smallest).toBeCloseTo(0.5625, 4);
  });

  it('uses DOM attribute names, not React prop names', () => {
    const out = svg('$x_1$');

    expect(out).toContain('font-size=');
    expect(out).not.toContain('fontSize=');
    expect(out).not.toContain('textDecoration=');
  });
});
