/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { NodeVisual } from './NodeVisual';
import { isPanelNode } from '@react-dataflow-animator/core/render/nodeKinds';

afterEach(cleanup);

describe('NodeVisual — rendu isolé du cœur visuel', () => {
  it('type pictogramme : rend une icône, pas de panneau', () => {
    const { container } = render(
      <NodeVisual node={{ id: 'srv', type: 'server' }} />
    );
    expect(container.querySelector('.rdfa-node-icon svg')).toBeTruthy();
    expect(container.querySelector('.rdfa-node-panel')).toBeNull();
  });

  it('simple_node : rend un panneau (body), sans pictogramme', () => {
    const { container } = render(
      <NodeVisual node={{ id: 'w', type: 'simple_node', body: 'Worker' }} />
    );
    expect(container.querySelector('.rdfa-node-icon')).toBeNull();
    expect(container.querySelector('.rdfa-node-panel-body')?.textContent).toBe(
      'Worker'
    );
  });

  it('rend sans highlighter fourni (défaut), même pour un complex_node', () => {
    const { container } = render(
      <NodeVisual
        node={{ id: 'r', type: 'complex_node', header: 'GET /', body: 'ok' }}
      />
    );
    expect(container.querySelector('.rdfa-node-panel--complex')).toBeTruthy();
    expect(
      container.querySelector('.rdfa-node-panel-header')?.textContent
    ).toBe('GET /');
  });

  it('type forme : rend une forme (body), pas de pictogramme ni panneau', () => {
    const { container } = render(
      <NodeVisual node={{ id: 'd', type: 'diamond', body: 'OK' }} />
    );
    expect(container.querySelector('.rdfa-node-icon')).toBeNull();
    expect(container.querySelector('.rdfa-node-panel')).toBeNull();
    expect(container.querySelector('.rdfa-shape--diamond')).toBeTruthy();
    expect(container.querySelector('.rdfa-shape-text')?.textContent).toBe('OK');
  });

  it('isPanelNode distingue panneaux et pictogrammes', () => {
    expect(isPanelNode('simple_node')).toBe(true);
    expect(isPanelNode('complex_node')).toBe(true);
    expect(isPanelNode('server')).toBe(false);
  });
});
