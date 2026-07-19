/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountVanillaStage } from './mount';
import type { DataFlowSpec } from '../types';

/**
 * Orchestration-level assertions only: layer order, teardown, and the
 * convergence budget. What each layer LOOKS like is covered by the per-module
 * suites, and whether it matches React is settled by the A/B pixel gate, which
 * is a far stronger check than anything assertable in jsdom (which lays nothing
 * out — every rect here is 0×0).
 */

const spec: DataFlowSpec = {
  nodes: [
    { id: 'a', type: 'server', text: 'A', lane: 1 },
    { id: 'b', type: 'database', text: 'B', lane: 2 },
  ],
  packets: [],
  timeline: [],
  connections: [{ from: 'a', to: 'b' }],
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

function mount(over?: Partial<DataFlowSpec>, t = 0) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = mountVanillaStage(container, { ...spec, ...over }, t);
  return { container, handle };
}

describe('mountVanillaStage — structure', () => {
  it('roots the render in .rdfa-stage', () => {
    const { container } = mount();

    expect(container.querySelector('.rdfa-stage')).not.toBeNull();
  });

  it('emits one .rdfa-node per visible node, keyed by data-node-id', () => {
    const { container } = mount();
    const ids = [...container.querySelectorAll('[data-node-id]')].map((el) =>
      el.getAttribute('data-node-id')
    );

    expect(ids).toEqual(['a', 'b']);
  });

  it('lays the arrow SVG and the overlay out in React`s document order', () => {
    const { container } = mount();
    const stage = container.querySelector('.rdfa-stage');
    const classes = [...(stage?.children ?? [])].map((el) =>
      el.getAttribute('class')
    );

    // Zones (none here) → arrows → nodes → zone labels → overlay. The two
    // overlay layers must exist even while empty: z-index ties between zones
    // and nodes break on source order.
    expect(classes[0]).toBe('rdfa-arrow-svg');
    expect(classes[classes.length - 1]).toBe('rdfa-overlay');
  });

  it('publishes the stage scale variables', () => {
    const { container } = mount();
    const stage = container.querySelector<HTMLElement>('.rdfa-stage');

    expect(stage?.style.getPropertyValue('--rdfa-scale')).not.toBe('');
    expect(stage?.style.getPropertyValue('--rdfa-maxw')).toMatch(/px$/);
  });

  it('hides the stage until it has been measured', () => {
    // jsdom reports a 0×0 rect, which is exactly the pre-measurement case.
    const { container } = mount();

    expect(
      container.querySelector<HTMLElement>('.rdfa-stage')?.style.visibility
    ).toBe('hidden');
  });

  it('drops a node hidden by `visible: false` from the DOM entirely', () => {
    const { container } = mount({
      nodes: [
        { id: 'a', type: 'server', text: 'A', lane: 1 },
        { id: 'b', type: 'database', text: 'B', lane: 2, visible: false },
      ],
    });

    expect(container.querySelector('[data-node-id="b"]')).toBeNull();
    expect(container.querySelector('[data-node-id="a"]')).not.toBeNull();
  });

  it('renders labels and pictograms inside the node', () => {
    const { container } = mount();
    const node = container.querySelector('[data-node-id="a"]');

    expect(node?.querySelector('.rdfa-node-visual')).not.toBeNull();
    expect(node?.querySelector('.rdfa-node-icon svg')).not.toBeNull();
    expect(node?.querySelector('.rdfa-node-label')?.textContent).toBe('A');
  });
});

describe('mountVanillaStage — convergence', () => {
  it('stops on the equality bailout rather than on the budget', () => {
    // Nothing moves between passes in jsdom, so the second measurement equals
    // the first and the loop must bail out at once.
    const { handle } = mount();

    expect(handle.converged).toBe(true);
    expect(handle.passes).toBeLessThanOrEqual(4);
  });

  it('never exceeds React`s measurement budget for a non-circuit diagram', () => {
    const { handle } = mount();

    expect(handle.passes).toBeLessThanOrEqual(4);
  });
});

describe('mountVanillaStage — teardown', () => {
  it('destroy() detaches the render', () => {
    const { container, handle } = mount();

    expect(container.children).toHaveLength(1);
    handle.destroy();
    expect(container.children).toHaveLength(0);
  });

  it('destroy() disconnects the ResizeObserver', () => {
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect = disconnect;
      }
    );

    mount().handle.destroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('mounts where ResizeObserver does not exist', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    expect(() => {
      const { handle } = mount();
      handle.destroy();
    }).not.toThrow();
  });
});
