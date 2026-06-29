/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { StaticNode } from './StaticNode';
import { highlightCode } from '../../highlight/highlight';
import type { Node } from '../../types';

afterEach(cleanup);

const placement = { cx: 0.5, cy: 0.5 };

function renderNode(object: Node) {
  return render(
    <StaticNode
      object={object}
      placement={placement}
      highlight={highlightCode}
    />
  );
}

describe('StaticNode — nœuds textuels', () => {
  it('simple_node : rend une boîte de texte (body), sans pictogramme', () => {
    const { container } = renderNode({
      id: 'snippet',
      type: 'simple_node',
      body: 'const total = a + b;',
    });
    const panel = container.querySelector('.rdfa-node-panel');
    expect(panel).toBeTruthy();
    expect(container.querySelector('.rdfa-node-icon')).toBeNull();
    expect(container.querySelector('.rdfa-node-panel-header')).toBeNull();
    expect(container.querySelector('.rdfa-node-panel-body')?.textContent).toBe(
      'const total = a + b;'
    );
    expect(container.querySelector('.rdfa-node--panel')).toBeTruthy();
  });

  it('simple_node : conserve le subicon', () => {
    const { container } = renderNode({
      id: 'snippet',
      type: 'simple_node',
      body: 'x',
      icon: 'node',
    });
    expect(container.querySelector('.rdfa-node-subicon')).toBeTruthy();
  });

  it('complex_node : rend un en-tête au-dessus du corps', () => {
    const { container } = renderNode({
      id: 'req',
      type: 'complex_node',
      header: 'GET /api/users',
      body: 'Accept: application/json',
    });
    expect(container.querySelector('.rdfa-node-panel--complex')).toBeTruthy();
    expect(
      container.querySelector('.rdfa-node-panel-header')?.textContent
    ).toBe('GET /api/users');
    expect(container.querySelector('.rdfa-node-panel-body')?.textContent).toBe(
      'Accept: application/json'
    );
  });

  it('language : colore toutes les zones (en-tête + corps)', () => {
    const { container } = renderNode({
      id: 'req',
      type: 'complex_node',
      header: 'GET /api/users HTTP/1.1',
      body: 'Accept: application/json',
      language: 'http',
    });
    const header = container.querySelector('.rdfa-node-panel-header');
    const body = container.querySelector('.rdfa-node-panel-body');
    // The highlighter returns HTML (Prism tokens) in .rdfa-code zones.
    expect(header?.classList.contains('rdfa-code')).toBe(true);
    expect(body?.classList.contains('rdfa-code')).toBe(true);
    expect(header?.querySelector('.token')).toBeTruthy();
    expect(body?.querySelector('.token')).toBeTruthy();
  });

  it('un set_content actif remplace le panneau textuel', () => {
    // `content` is a prop calculated by the Stage (set_content or initial
    // content), not `object.content`: it takes priority over the panel.
    const { container } = render(
      <StaticNode
        object={{ id: 'snippet', type: 'simple_node', body: 'x' }}
        placement={placement}
        content={{ type: 'text', value: 'remplacé' }}
        highlight={highlightCode}
      />
    );
    expect(container.querySelector('.rdfa-node-panel')).toBeNull();
    expect(container.querySelector('.rdfa-content')).toBeTruthy();
  });
});

describe('StaticNode — formes géométriques', () => {
  it('rend une forme avec son texte (body) et la classe rdfa-node--shape', () => {
    const { container } = renderNode({
      id: 'cache',
      type: 'circle',
      body: 'Cache',
    });
    expect(container.querySelector('.rdfa-node--shape')).toBeTruthy();
    expect(container.querySelector('.rdfa-shape--circle')).toBeTruthy();
    expect(container.querySelector('.rdfa-node-icon')).toBeNull();
    expect(container.querySelector('.rdfa-shape-text')?.textContent).toBe(
      'Cache'
    );
  });

  it('conserve le subicon et le label sous la forme', () => {
    const { container } = renderNode({
      id: 'q',
      type: 'square',
      body: 'Q',
      icon: 'redis',
      text: 'File',
    });
    expect(container.querySelector('.rdfa-node-subicon')).toBeTruthy();
    expect(container.querySelector('.rdfa-node-label')?.textContent).toBe(
      'File'
    );
  });

  it('un set_content actif remplace la forme', () => {
    const { container } = render(
      <StaticNode
        object={{ id: 'cache', type: 'circle', body: 'Cache' }}
        placement={placement}
        content={{ type: 'text', value: 'remplacé' }}
        highlight={highlightCode}
      />
    );
    expect(container.querySelector('.rdfa-shape')).toBeNull();
    expect(container.querySelector('.rdfa-node--shape')).toBeNull();
    expect(container.querySelector('.rdfa-content')).toBeTruthy();
  });
});

describe('StaticNode — couleurs (background_color / border_color)', () => {
  it('pose --rdfa-fill et --rdfa-stroke sur la racine du nœud', () => {
    const { container } = renderNode({
      id: 'box',
      type: 'square',
      background_color: '#fde68a',
      border_color: '#92400e',
    });
    const node = container.querySelector('.rdfa-node') as HTMLElement;
    expect(node.style.getPropertyValue('--rdfa-fill')).toBe('#fde68a');
    expect(node.style.getPropertyValue('--rdfa-stroke')).toBe('#92400e');
  });

  it('background_color seul : bordure complémentaire dérivée', () => {
    const { container } = renderNode({
      id: 'box',
      type: 'square',
      background_color: '#3b82f6',
    });
    const node = container.querySelector('.rdfa-node') as HTMLElement;
    expect(node.style.getPropertyValue('--rdfa-stroke')).toContain('color-mix');
  });

  it('pictogramme + background_color : classe rdfa-node--tinted (pastille)', () => {
    const { container } = renderNode({
      id: 'srv',
      type: 'server',
      background_color: 'teal',
    });
    expect(container.querySelector('.rdfa-node--tinted')).toBeTruthy();
  });

  it('sans background_color : pas de classe tinted', () => {
    const { container } = renderNode({ id: 'srv', type: 'server' });
    expect(container.querySelector('.rdfa-node--tinted')).toBeNull();
  });

  it('text_color : pose --rdfa-ink sur la racine du nœud', () => {
    const { container } = renderNode({
      id: 'box',
      type: 'square',
      body: 'OK',
      text_color: '#0f172a',
    });
    const node = container.querySelector('.rdfa-node') as HTMLElement;
    expect(node.style.getPropertyValue('--rdfa-ink')).toBe('#0f172a');
  });

  it('background_color sans text_color : --rdfa-ink auto-contrasté', () => {
    const { container } = renderNode({
      id: 'box',
      type: 'square',
      body: 'OK',
      background_color: '#1e3a8a',
    });
    const node = container.querySelector('.rdfa-node') as HTMLElement;
    expect(node.style.getPropertyValue('--rdfa-ink')).toContain('oklch');
  });
});
