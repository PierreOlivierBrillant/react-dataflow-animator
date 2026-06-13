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
    // Le highlighter renvoie du HTML (tokens Prism) dans des zones .rdfa-code.
    expect(header?.classList.contains('rdfa-code')).toBe(true);
    expect(body?.classList.contains('rdfa-code')).toBe(true);
    expect(header?.querySelector('.token')).toBeTruthy();
    expect(body?.querySelector('.token')).toBeTruthy();
  });

  it('un set_content actif remplace le panneau textuel', () => {
    // `content` est une prop calculée par le Stage (set_content ou content
    // initial), pas `object.content` : il prend la priorité sur le panneau.
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
