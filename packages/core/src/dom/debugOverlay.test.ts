/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { createDebugOverlay } from './debugOverlay';
import { compile } from '../engine/compiler';
import type { DataFlowSpec } from '../types';

const spec: DataFlowSpec = {
  nodes: [
    { id: 'a', type: 'server', text: 'A', lane: 1 },
    { id: 'b', type: 'database', text: 'B', lane: 2 },
  ],
  packets: [
    { id: 'p', kind: 'http_packet', packet_content: { header: 'GET' } },
  ],
  timeline: [
    { type: 'move', id: 'm1', object: 'p', from: 'a', to: 'b', duration: 1000 },
    { type: 'arrow', id: 'a1', from: 'a', to: 'b', duration: 600 },
  ],
  connections: [{ from: 'a', to: 'b' }],
};

const { timeline } = compile(spec);

describe('createDebugOverlay', () => {
  it('roots itself in .rdfa-debug', () => {
    const overlay = createDebugOverlay(timeline);

    expect(overlay.el.getAttribute('class')).toBe('rdfa-debug');
  });

  it('emits one row per clip, plus the two header lines', () => {
    const overlay = createDebugOverlay(timeline);

    expect(overlay.el.querySelectorAll('.rdfa-debug-row')).toHaveLength(
      timeline.clips.length
    );
    expect(overlay.el.children).toHaveLength(timeline.clips.length + 2);
  });

  it('reports t and the step against their totals', () => {
    const overlay = createDebugOverlay(timeline);

    overlay.update(0, 0);

    const text = overlay.el.textContent ?? '';
    expect(text).toContain(`0 / ${Math.round(timeline.durationMs)} ms`);
    expect(text).toContain(`1 / ${timeline.steps.length}`);
  });

  it('reports the active clip count it is handed', () => {
    const overlay = createDebugOverlay(timeline);

    overlay.update(500, 3);

    expect(overlay.el.textContent).toContain('clips actifs 3');
  });

  it('marks a clip active exactly across [startMs, visibleUntilMs]', () => {
    const overlay = createDebugOverlay(timeline);
    const clip = timeline.clips[0];
    const rows = () => [...overlay.el.querySelectorAll('.rdfa-debug-row')];

    overlay.update(clip.startMs, 1);
    expect(rows()[0].className).toContain('is-active');

    overlay.update(clip.visibleUntilMs + 1, 0);
    expect(rows()[0].className).not.toContain('is-active');
  });

  // Retained mode is the whole point: a frame must mutate the rows it already
  // has rather than replace them, or the overlay would allocate per frame.
  it('mutates the existing rows instead of rebuilding them', () => {
    const overlay = createDebugOverlay(timeline);
    const firstRow = overlay.el.querySelector('.rdfa-debug-row');

    overlay.update(0, 0);
    overlay.update(900, 2);

    expect(overlay.el.querySelector('.rdfa-debug-row')).toBe(firstRow);
  });

  it('survives a timeline with no clips at all', () => {
    const empty = compile({ ...spec, packets: [], timeline: [] }).timeline;
    const overlay = createDebugOverlay(empty);

    overlay.update(0, 0);

    expect(overlay.el.querySelectorAll('.rdfa-debug-row')).toHaveLength(0);
  });
});
