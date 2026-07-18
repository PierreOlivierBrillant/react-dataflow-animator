/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { mountVanillaStage } from './mount';
import type { DataFlowSpec } from '../types';

const spec: DataFlowSpec = {
  nodes: [
    { id: 'a', type: 'server', text: 'A', lane: 1 },
    { id: 'b', type: 'server', text: 'B', lane: 2 },
  ],
  packets: [],
  timeline: [],
};

describe('mountVanillaStage', () => {
  it('appends a labelled placeholder rooted in .rdfa-stage', () => {
    const container = document.createElement('div');
    mountVanillaStage(container, spec, 250);

    const root = container.querySelector('.rdfa-stage');
    expect(root).not.toBeNull();
    expect(root?.classList.contains('rdfa-vanilla-placeholder')).toBe(true);
    expect(root?.textContent).toContain('2 node(s)');
    expect(root?.textContent).toContain('t=250ms');
  });

  it('destroy() removes the placeholder from the container', () => {
    const container = document.createElement('div');
    const handle = mountVanillaStage(container, spec, 0);

    expect(container.children).toHaveLength(1);
    handle.destroy();
    expect(container.children).toHaveLength(0);
  });
});
