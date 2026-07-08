import { describe, expect, it } from 'vitest';
import type { DataFlowSpec } from '../types';
import { compile } from './compiler';
import type { FlowClip, ToggleClip } from './timeline';

const base = (timeline: DataFlowSpec['timeline']): DataFlowSpec => ({
  direction: 'circuit',
  nodes: [
    { id: 'batt', type: 'battery', x: 0.2, y: 0.5 },
    { id: 'r1', type: 'resistor', x: 0.5, y: 0.5 },
    { id: 'sw', type: 'switch', x: 0.8, y: 0.5 },
  ],
  packets: [],
  timeline,
});

describe('flow action', () => {
  it('compiles a FlowClip with defaults derived from the route', () => {
    const { timeline } = compile(
      base([
        {
          type: 'flow',
          route: ['batt:+', 'r1:a', 'r1:b', 'batt:-'],
          keep_until_end: true,
        },
      ])
    );
    const flow = timeline.clips.find((c) => c.kind === 'flow') as FlowClip;
    expect(flow).toBeDefined();
    expect(flow.route).toEqual(['batt:+', 'r1:a', 'r1:b', 'batt:-']);
    expect(flow.loop).toBe(true);
    expect(flow.reverse).toBe(false);
    // count defaults to ~one per segment (route.length - 1 = 3), min 2.
    expect(flow.count).toBe(3);
    expect(flow.visibleUntilMs).toBe(timeline.durationMs);
  });

  it('honors explicit count / reverse / loop / color', () => {
    const { timeline } = compile(
      base([
        {
          type: 'flow',
          route: ['batt:+', 'r1:a'],
          count: 8,
          reverse: true,
          loop: false,
          color: '#f59e0b',
        },
      ])
    );
    const flow = timeline.clips.find((c) => c.kind === 'flow') as FlowClip;
    expect(flow.count).toBe(8);
    expect(flow.reverse).toBe(true);
    expect(flow.loop).toBe(false);
    expect(flow.color).toBe('#f59e0b');
  });

  it('warns and emits no clip when the route is too short', () => {
    const { timeline, warnings } = compile(
      base([{ type: 'flow', route: ['batt:+'] }])
    );
    expect(timeline.clips.some((c) => c.kind === 'flow')).toBe(false);
    expect(warnings.some((w) => w.includes('route'))).toBe(true);
  });
});

describe('toggle action', () => {
  it('compiles a ToggleClip that persists until the end', () => {
    const { timeline } = compile(
      base([{ type: 'toggle', object: 'sw', closed: true }])
    );
    const toggle = timeline.clips.find(
      (c) => c.kind === 'toggle'
    ) as ToggleClip;
    expect(toggle).toBeDefined();
    expect(toggle.objectId).toBe('sw');
    expect(toggle.closed).toBe(true);
    expect(toggle.keepEnd).toBe(true);
    expect(toggle.visibleUntilMs).toBe(timeline.durationMs);
  });

  it('warns on a missing object or a non-boolean closed', () => {
    const { warnings } = compile(
      base([
        // @ts-expect-error missing `closed`
        { type: 'toggle', object: 'sw' },
      ])
    );
    expect(warnings.some((w) => w.includes('toggle'))).toBe(true);
  });
});
