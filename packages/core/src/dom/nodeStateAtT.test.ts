import { describe, expect, it } from 'vitest';
import { autoRotationMap, computeNodeStateAtT } from './nodeStateAtT';
import { compile } from '../engine/compiler';
import { evaluate } from '../engine/timeline';
import type { Action, DataFlowSpec } from '../types';

/**
 * Drives the real compiler rather than hand-built clips: the accumulation rules
 * depend on `keepEnd`, which only the compiler assigns.
 *
 * A trailing `wait` extends the timeline past every clip, because a `keepEnd`
 * clip persists only WITHIN the compiled duration — probing beyond the end
 * returns no clips at all and would make these assertions vacuous.
 */
const SETTLED = 1000;

function stateAt(
  timeline: Action[],
  t: number,
  over: Partial<DataFlowSpec> = {}
) {
  const spec: DataFlowSpec = {
    nodes: [
      { id: 'a', type: 'server', text: 'A' },
      { id: 'b', type: 'switch', text: 'B' },
    ],
    packets: [],
    timeline: [...timeline, { type: 'wait', duration: 3000 }],
    ...over,
  };
  const compiled = compile(spec);
  return computeNodeStateAtT(
    spec,
    evaluate(compiled.timeline, t),
    new Map<string, number>()
  );
}

describe('visibility', () => {
  it('seeds hidden nodes from `visible: false`', () => {
    const s = stateAt([], 0, {
      nodes: [{ id: 'a', type: 'server', visible: false }],
    });

    expect(s.visibility.a).toBe(0);
  });

  it('leaves an untouched node absent, meaning fully visible', () => {
    expect(stateAt([], 0).visibility.a).toBeUndefined();
  });

  it('persists a finished set_visible', () => {
    const s = stateAt(
      [{ type: 'set_visible', object: 'a', visible: true, duration: 100 }],
      SETTLED
    );

    expect(s.visibility.a).toBe(1);
  });

  it('inverts progress when hiding', () => {
    const s = stateAt(
      [{ type: 'set_visible', object: 'a', visible: false, duration: 100 }],
      SETTLED
    );

    expect(s.visibility.a).toBe(0);
  });
});

describe('rotation', () => {
  it('seeds from the static rotation', () => {
    const s = stateAt([], 0, {
      nodes: [{ id: 'a', type: 'resistor', rotation: 90 }],
    });

    expect(s.rotation.a).toBe(90);
  });

  it('prefers an explicit rotation over the auto-layout one', () => {
    const spec: DataFlowSpec = {
      nodes: [{ id: 'a', type: 'resistor', rotation: 45 }],
      packets: [],
      timeline: [],
    };
    const s = computeNodeStateAtT(spec, [], new Map([['a', 90]]));

    expect(s.rotation.a).toBe(45);
  });

  it('adopts the auto-layout rotation when none is declared', () => {
    const spec: DataFlowSpec = {
      nodes: [{ id: 'a', type: 'resistor' }],
      packets: [],
      timeline: [],
    };

    expect(
      computeNodeStateAtT(spec, [], new Map([['a', 270]])).rotation.a
    ).toBe(270);
  });

  it('lands exactly on the target once the rotate has finished', () => {
    const s = stateAt(
      [{ type: 'rotate', object: 'a', to: 180, duration: 200 }],
      SETTLED
    );

    expect(s.rotation.a).toBe(180);
  });
});

describe('contact state', () => {
  it('seeds a statically closed contact', () => {
    const s = stateAt([], 0, {
      nodes: [{ id: 'b', type: 'switch', closed: true }],
    });

    expect(s.closed.b).toBe(1);
  });

  it('settles on the toggled state', () => {
    const s = stateAt(
      [{ type: 'toggle', object: 'b', closed: true, duration: 200 }],
      SETTLED
    );

    expect(s.closed.b).toBe(1);
  });

  it('opens back down to 0', () => {
    const s = stateAt(
      [{ type: 'toggle', object: 'b', closed: false, duration: 200 }],
      SETTLED
    );

    expect(s.closed.b).toBe(0);
  });
});

describe('colour', () => {
  it('seeds from the static colours without marking the node recoloured', () => {
    const s = stateAt([], 0, {
      nodes: [{ id: 'a', type: 'server', background_color: '#f00' }],
    });

    expect(s.color.a.background_color).toBe('#f00');
    expect(s.recolored.has('a')).toBe(false);
  });

  it('cross-fades FROM the static colour', () => {
    const s = stateAt(
      [
        {
          type: 'set_color',
          object: 'a',
          background_color: '#00f',
          duration: 200,
        },
      ],
      SETTLED,
      { nodes: [{ id: 'a', type: 'server', background_color: '#f00' }] }
    );

    expect(s.recolored.has('a')).toBe(true);
    expect(s.color.a.background_color).toBe(
      'color-mix(in srgb, #f00, #00f 100.00%)'
    );
  });

  it('adopts the target directly when the channel had no colour', () => {
    // Inventing an origin would flash a wrong colour.
    const s = stateAt(
      [
        {
          type: 'set_color',
          object: 'a',
          background_color: '#00f',
          duration: 200,
        },
      ],
      SETTLED
    );

    expect(s.color.a.background_color).toBe('#00f');
  });

  it('recolours each channel independently', () => {
    const s = stateAt(
      [
        {
          type: 'set_color',
          object: 'a',
          border_color: '#0f0',
          text_color: '#fff',
          duration: 100,
        },
      ],
      SETTLED
    );

    expect(s.color.a.border_color).toBe('#0f0');
    expect(s.color.a.text_color).toBe('#fff');
    expect(s.color.a.background_color).toBeUndefined();
  });

  it('routes a connection target to the line colour, not the node map', () => {
    const s = stateAt(
      [{ type: 'set_color', object: 'link', color: '#0ff', duration: 100 }],
      SETTLED,
      {
        nodes: [
          { id: 'a', type: 'server' },
          { id: 'b', type: 'server' },
        ],
        connections: [{ id: 'link', from: 'a', to: 'b', color: '#111' }],
      }
    );

    expect(s.connectionColor.link).toBe(
      'color-mix(in srgb, #111, #0ff 100.00%)'
    );
    expect(s.recolored.has('link')).toBe(false);
  });

  it('seeds a connection colour from the spec even with no clip', () => {
    const s = stateAt([], 0, {
      connections: [{ id: 'link', from: 'a', to: 'b', color: '#123' }],
    });

    expect(s.connectionColor.link).toBe('#123');
  });
});

describe('badge, loading and highlight', () => {
  it('applies the latest set_icon and keeps `` distinct from absent', () => {
    const swapped = stateAt(
      [{ type: 'set_icon', object: 'a', icon: 'docker', duration: 10 }],
      SETTLED
    );
    const cleared = stateAt(
      [{ type: 'set_icon', object: 'a', icon: '', duration: 10 }],
      SETTLED
    );

    expect(swapped.icon.a).toBe('docker');
    expect(cleared.icon.a).toBe('');
    expect(stateAt([], 0).icon.a).toBeUndefined();
  });

  it('collects the nodes with a running spinner', () => {
    const spinner: Action[] = [
      { type: 'loading', object: 'a', duration: 1000 },
    ];
    const during = stateAt(spinner, 500);
    // Well past the spinner but still inside the timeline — unlike the
    // `keepEnd` clips above, a finished `loading` must NOT persist.
    const after = stateAt(spinner, 2500);

    expect(during.loading.has('a')).toBe(true);
    expect(after.loading.has('a')).toBe(false);
  });

  it('collects highlighted targets', () => {
    const s = stateAt(
      [{ type: 'highlight', object: 'a', duration: 1000 }],
      500
    );

    expect(s.highlighted.has('a')).toBe(true);
  });
});

describe('autoRotationMap', () => {
  it('keeps only the entries the layout rotated', () => {
    const m = autoRotationMap({
      a: { rotation: 90 },
      b: {},
      c: { rotation: 0 },
    });

    expect([...m.entries()]).toEqual([
      ['a', 90],
      ['c', 0],
    ]);
  });
});
