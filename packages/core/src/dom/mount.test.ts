/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountVanillaStage } from './mount';
import { compile } from '../engine/compiler';
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

describe('mountVanillaStage — dynamic clips', () => {
  // Two sequential steps: the move owns [0, ~1000), the arrow the step after.
  // Probing inside each step proves a clip is drawn while live and NOT drawn
  // outside its window — the scrubbability the React overlay gets from
  // `evaluate` alone.
  const dynamic: Partial<DataFlowSpec> = {
    packets: [
      {
        id: 'p',
        kind: 'http_packet',
        packet_content: { header: 'GET /' },
      },
    ],
    timeline: [
      {
        type: 'move',
        id: 'm1',
        object: 'p',
        from: 'a',
        to: 'b',
        duration: 1000,
      },
      { type: 'arrow', id: 'a1', from: 'a', to: 'b', duration: 600 },
    ],
  };

  it('renders a live move clip as a packet in the overlay', () => {
    const { container } = mount(dynamic, 500);
    const packet = container.querySelector(
      '.rdfa-overlay .rdfa-packet.rdfa-packet-http_packet'
    );

    expect(packet).not.toBeNull();
    expect(packet?.querySelector('.rdfa-packet-header')?.textContent).toBe(
      'GET /'
    );
  });

  it('draws a live arrow clip in the SVG, after the baseline connections', () => {
    // Probe the middle of the arrow clip's own window (read off the compiled
    // timeline — steps carry holds, so a guessed instant would be brittle).
    // The move's step is over by then: one <g> for the connection, one for the
    // arrow clip, and no packet left in the overlay.
    const { timeline } = compile({ ...spec, ...dynamic });
    const arrow = timeline.clips.find((c) => c.kind === 'arrow')!;
    const { container } = mount(dynamic, (arrow.animStartMs + arrow.endMs) / 2);

    expect(container.querySelectorAll('.rdfa-arrow-svg > g')).toHaveLength(2);
    expect(container.querySelector('.rdfa-overlay .rdfa-packet')).toBeNull();
  });

  it('ignores a move clip whose packet id is unknown', () => {
    const { container } = mount(
      {
        ...dynamic,
        timeline: [
          {
            type: 'move',
            id: 'm1',
            object: 'ghost',
            from: 'a',
            to: 'b',
            duration: 1000,
          },
        ],
      },
      500
    );

    expect(container.querySelector('.rdfa-overlay .rdfa-packet')).toBeNull();
  });

  it('renders a live flow clip as charge dots riding the route', () => {
    const { container } = mount(
      {
        timeline: [
          {
            type: 'flow',
            id: 'f1',
            route: ['a', 'b'],
            duration: 1000,
            color: '#ff0000',
          },
        ],
      },
      500
    );
    const dots = container.querySelectorAll<SVGCircleElement>(
      '.rdfa-arrow-svg .rdfa-flow-charge'
    );

    // ~one charge per segment, floored at two (the compiler's default count).
    expect(dots).toHaveLength(2);
    expect(dots[0].style.getPropertyValue('--rdfa-flow')).toBe('#ff0000');
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

describe('mountVanillaStage — set_content and comments', () => {
  const contentSpec = {
    timeline: [
      {
        type: 'set_content' as const,
        object: 'a',
        content: { type: 'text' as const, value: 'panel' },
        duration: 2000,
      },
    ],
  };

  const commentSpec = (object?: string) => ({
    timeline: [
      { type: 'comment' as const, text: 'hello', object, duration: 2000 },
    ],
  });

  it('builds the panel INSIDE its node, not in the overlay', () => {
    const { container } = mount(contentSpec, 500);

    const node = container.querySelector('[data-node-id="a"]');
    // This is the whole point of step 2.4: a panel makes its node GROW, so it
    // has to be inside the measured box rather than on an absolute layer.
    expect(node?.querySelector('.rdfa-content')).not.toBeNull();
    expect(container.querySelector('.rdfa-overlay .rdfa-content')).toBeNull();
    expect(node?.classList.contains('rdfa-node--content')).toBe(true);
  });

  it('renders a node`s own content with no clip driving it', () => {
    const { container } = mount({
      nodes: [
        {
          id: 'a',
          type: 'server',
          content: { type: 'code', value: 'x', language: 'sql' },
        },
        { id: 'b', type: 'database' },
      ],
    });

    expect(
      container.querySelector('[data-node-id="a"] .rdfa-terminal')
    ).not.toBeNull();
  });

  it('puts an omniscient comment bubble in the overlay', () => {
    const { container } = mount(commentSpec(), 500);

    const bubble = container.querySelector('.rdfa-overlay .rdfa-comment');
    expect(bubble).not.toBeNull();
    // No anchor → the omniscient variant, which has no tail.
    expect(bubble?.classList.contains('rdfa-comment--omniscient')).toBe(true);
    expect(bubble?.querySelector('.rdfa-comment-tail')).toBeNull();
  });

  it('anchors a bubble to its node and gives it a tail', () => {
    const { container } = mount(commentSpec('a'), 500);

    const bubble = container.querySelector('.rdfa-comment');
    expect(bubble?.classList.contains('rdfa-comment--omniscient')).toBe(false);
    expect(bubble?.querySelector('.rdfa-comment-tail')).not.toBeNull();
  });

  it('drops a bubble whose anchor names an unknown node', () => {
    const { container } = mount(commentSpec('nope'), 500);

    // Silently promoting it to an omniscient bubble would invent a layer the
    // React Stage does not draw.
    expect(container.querySelector('.rdfa-comment')).toBeNull();
  });
});
