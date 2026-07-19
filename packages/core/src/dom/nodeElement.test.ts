/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { applyNodePlacement, buildNodeElement } from './nodeElement';
import { escapeHtml } from '../highlight/highlight';
import type { Node } from '../types';

const build = (node: Node, options = {}) =>
  buildNodeElement(node, {
    placement: { cx: 0.25, cy: 0.5 },
    highlight: escapeHtml,
    ...options,
  });

describe('buildNodeElement — root', () => {
  it('carries the id and the placement as percentages', () => {
    const el = build({ id: 'a', type: 'server' });

    expect(el.getAttribute('data-node-id')).toBe('a');
    expect(el.style.left).toBe('25%');
    expect(el.style.top).toBe('50%');
  });

  it('omits opacity at full visibility and sets it while fading', () => {
    expect(build({ id: 'a', type: 'server' }).style.opacity).toBe('');
    expect(
      build({ id: 'a', type: 'server' }, { opacity: 0.4 }).style.opacity
    ).toBe('0.4');
  });

  it('assembles the modifier classes', () => {
    expect(build({ id: 'a', type: 'server' }).getAttribute('class')).toBe(
      'rdfa-node'
    );
    expect(
      build({ id: 'a', type: 'simple_node', body: 'x' }).getAttribute('class')
    ).toBe('rdfa-node rdfa-node--panel');
    expect(build({ id: 'a', type: 'circle' }).getAttribute('class')).toBe(
      'rdfa-node rdfa-node--shape'
    );
    expect(build({ id: 'a', type: 'signal' }).getAttribute('class')).toBe(
      'rdfa-node rdfa-node--signal'
    );
    expect(
      build({ id: 'a', type: 'server', background_color: '#f00' }).getAttribute(
        'class'
      )
    ).toBe('rdfa-node rdfa-node--tinted');
    expect(
      build({ id: 'a', type: 'server' }, { highlighted: true }).getAttribute(
        'class'
      )
    ).toBe('rdfa-node rdfa-node--highlight');
  });

  it('never tints a signal pad', () => {
    const el = build({ id: 'a', type: 'signal', background_color: '#f00' });

    expect(el.getAttribute('class')).not.toContain('tinted');
  });

  it('applies a colour override on top of the static colour', () => {
    const el = build(
      { id: 'a', type: 'server', background_color: '#f00' },
      { colorOverride: { background_color: '#0f0' } }
    );

    expect(el.style.getPropertyValue('--rdfa-fill')).toBe('#0f0');
  });

  it('publishes the tint custom properties', () => {
    const el = build({ id: 'a', type: 'server', background_color: '#abc' });

    expect(el.style.getPropertyValue('--rdfa-fill')).toBe('#abc');
    expect(el.style.getPropertyValue('--rdfa-stroke')).not.toBe('');
  });
});

describe('buildNodeElement — visual', () => {
  it('wraps the body in .rdfa-node-visual', () => {
    const el = build({ id: 'a', type: 'server' });

    expect(el.querySelector('.rdfa-node-visual')).not.toBeNull();
  });

  it('rotates the VISUAL, never the node itself', () => {
    const el = build({ id: 'a', type: 'resistor' }, { rotation: 90 });

    expect(el.style.transform).toBe('');
    expect(
      el.querySelector<HTMLElement>('.rdfa-node-visual')?.style.transform
    ).toBe('rotate(90deg)');
  });

  it('leaves a zero rotation off entirely', () => {
    const el = build({ id: 'a', type: 'resistor' }, { rotation: 0 });

    expect(
      el.querySelector<HTMLElement>('.rdfa-node-visual')?.style.transform
    ).toBe('');
  });

  it('wraps the visual in a link when the node has a url', () => {
    const el = build({ id: 'a', type: 'server', url: 'https://example.com' });
    const link = el.querySelector('a.rdfa-node-link');

    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    // The visual stays reachable for measurement.
    expect(el.querySelector('.rdfa-node-visual')?.parentElement).toBe(link);
  });
});

describe('buildNodeElement — body dispatch', () => {
  it('draws a pictogram for a plain type', () => {
    expect(
      build({ id: 'a', type: 'database' }).querySelector('.rdfa-node-icon svg')
    ).not.toBeNull();
  });

  it('passes the live contact state to a stateful pictogram', () => {
    const open = build({ id: 'a', type: 'switch' }, { closed: 0 });
    const shut = build({ id: 'a', type: 'switch' }, { closed: 1 });

    expect(open.innerHTML).not.toBe(shut.innerHTML);
  });

  it('falls back to the static `closed` when no toggle is running', () => {
    const a = build({ id: 'a', type: 'switch', closed: true });
    const b = build({ id: 'a', type: 'switch' }, { closed: 1 });

    expect(a.querySelector('.rdfa-node-icon')?.innerHTML).toBe(
      b.querySelector('.rdfa-node-icon')?.innerHTML
    );
  });

  it('draws a shape with its background svg and optional text', () => {
    const el = build({ id: 'a', type: 'diamond', body: 'Yes?' });

    expect(el.querySelector('.rdfa-shape--diamond')).not.toBeNull();
    expect(el.querySelector('svg.rdfa-shape-bg polygon')).not.toBeNull();
    expect(el.querySelector('.rdfa-shape-text')?.textContent).toBe('Yes?');
  });

  it('omits the shape text when there is no body', () => {
    expect(
      build({ id: 'a', type: 'square' }).querySelector('.rdfa-shape-text')
    ).toBeNull();
  });

  it('renders a simple_node as body only', () => {
    const el = build({ id: 'a', type: 'simple_node', body: 'hello' });

    expect(el.querySelector('.rdfa-node-panel-header')).toBeNull();
    expect(el.querySelector('.rdfa-node-panel-body')?.textContent).toBe(
      'hello'
    );
  });

  it('renders a complex_node header and marks the panel', () => {
    const el = build({
      id: 'a',
      type: 'complex_node',
      header: 'GET /x',
      body: 'ok',
    });

    expect(el.querySelector('.rdfa-node-panel--complex')).not.toBeNull();
    expect(el.querySelector('.rdfa-node-panel-header')?.textContent).toBe(
      'GET /x'
    );
  });

  it('routes a panel through the highlighter when a language is set', () => {
    const el = buildNodeElement(
      { id: 'a', type: 'simple_node', body: 'a<b', language: 'sql' },
      {
        placement: { cx: 0, cy: 0 },
        highlight: (text) => `<em>${escapeHtml(text)}</em>`,
      }
    );
    const body = el.querySelector('.rdfa-node-panel-body');

    expect(body?.classList.contains('rdfa-code')).toBe(true);
    expect(body?.querySelector('em')?.textContent).toBe('a<b');
  });

  it('shows a signal pad value inside the pad, with no corner badge', () => {
    const el = build({ id: 'a', type: 'signal', icon: '1' });

    expect(el.querySelector('.rdfa-signal-value')).not.toBeNull();
    expect(el.querySelector('.rdfa-node-badge')).toBeNull();
  });

  it('leaves a valueless signal pad empty', () => {
    const el = build({ id: 'a', type: 'signal' });

    expect(el.querySelector('.rdfa-signal')?.children).toHaveLength(0);
  });
});

describe('buildNodeElement — corner badge', () => {
  it('renders the tech badge', () => {
    const el = build({ id: 'a', type: 'server', icon: 'docker' });

    expect(
      el.querySelector('.rdfa-node-badge .rdfa-node-subicon svg')
    ).not.toBeNull();
    expect(el.querySelector('.rdfa-spinner')).toBeNull();
  });

  it('shares one container between the badge and the spinner', () => {
    const el = build(
      { id: 'a', type: 'server', icon: 'node' },
      { loading: true }
    );
    const badge = el.querySelector('.rdfa-node-badge');

    expect(badge?.querySelector('.rdfa-node-subicon')).not.toBeNull();
    expect(badge?.querySelector('.rdfa-spinner')).not.toBeNull();
  });

  it('renders the spinner alone while loading without a badge', () => {
    const el = build({ id: 'a', type: 'server' }, { loading: true });

    expect(el.querySelector('.rdfa-node-badge .rdfa-spinner')).not.toBeNull();
    expect(el.querySelector('.rdfa-node-subicon')).toBeNull();
  });

  it('emits no badge at all when there is nothing to show', () => {
    expect(
      build({ id: 'a', type: 'server' }).querySelector('.rdfa-node-badge')
    ).toBeNull();
  });

  it('lets set_icon override the static badge, and `` clear it', () => {
    const swapped = build(
      { id: 'a', type: 'server', icon: 'node' },
      { iconOverride: 'docker' }
    );
    const cleared = build(
      { id: 'a', type: 'server', icon: 'node' },
      { iconOverride: '' }
    );

    expect(swapped.querySelector('title')?.textContent).toBe('docker');
    expect(cleared.querySelector('.rdfa-node-badge')).toBeNull();
  });
});

describe('buildNodeElement — label', () => {
  it('renders the text', () => {
    expect(
      build({ id: 'a', type: 'server', text: 'API' }).querySelector(
        '.rdfa-node-label'
      )?.textContent
    ).toBe('API');
  });

  it('joins text and value with a middle dot', () => {
    const el = build({
      id: 'a',
      type: 'resistor',
      text: 'R1',
      value: '10',
      unit: 'kΩ',
    });

    expect(el.querySelector('.rdfa-node-label')?.textContent).toBe(
      'R1 · 10 kΩ'
    );
  });

  it('renders a value with no text, and no dot', () => {
    const el = build({ id: 'a', type: 'resistor', value: '10', unit: 'kΩ' });

    expect(el.querySelector('.rdfa-node-label')?.textContent).toBe('10 kΩ');
  });

  it('omits the label entirely when there is nothing to say', () => {
    expect(
      build({ id: 'a', type: 'server' }).querySelector('.rdfa-node-label')
    ).toBeNull();
    expect(
      build({ id: 'a', type: 'server', value: '' }).querySelector(
        '.rdfa-node-label'
      )
    ).toBeNull();
  });

  it('adds the side modifier for a circuit component wired top/bottom', () => {
    const el = build(
      { id: 'a', type: 'resistor', text: 'R1' },
      {
        labelSide: 'left',
      }
    );

    expect(el.querySelector('.rdfa-node-label')?.getAttribute('class')).toBe(
      'rdfa-node-label rdfa-node-label--left'
    );
  });

  it('renders rich text in the label', () => {
    const el = build({ id: 'a', type: 'server', text: 'V $x$' });

    expect(el.querySelector('.rdfa-node-label .rdfa-tex')).not.toBeNull();
  });
});

describe('applyNodePlacement', () => {
  it('rewrites left/top without touching anything else', () => {
    const el = build({ id: 'a', type: 'server' }, { opacity: 0.5 });
    applyNodePlacement(el, { cx: 0.75, cy: 0.1 });

    expect(el.style.left).toBe('75%');
    expect(el.style.top).toBe('10%');
    expect(el.style.opacity).toBe('0.5');
  });
});
