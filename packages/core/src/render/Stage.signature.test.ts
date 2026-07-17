import { describe, expect, it } from 'vitest';
import { buildStageSignature } from './stageSignature';
import type { DataFlowSpec } from '../types';

const base: DataFlowSpec = {
  direction: 'left-to-right',
  nodes: [
    { id: 'a', type: 'server', lane: 1 },
    { id: 'b', type: 'server', lane: 2 },
  ],
  packets: [],
  timeline: [],
};

describe('buildStageSignature', () => {
  it('change quand seul lane change', () => {
    const before = buildStageSignature(base);
    const after = buildStageSignature({
      ...base,
      nodes: [
        { id: 'a', type: 'server', lane: 3 },
        { id: 'b', type: 'server', lane: 2 },
      ],
    });
    expect(after).not.toBe(before);
  });

  it('change quand main change', () => {
    const before = buildStageSignature(base);
    const after = buildStageSignature({
      ...base,
      nodes: [
        { id: 'a', type: 'server', lane: 1, main: true },
        { id: 'b', type: 'server', lane: 2 },
      ],
    });
    expect(after).not.toBe(before);
  });

  it('change quand align_with change', () => {
    const before = buildStageSignature(base);
    const after = buildStageSignature({
      ...base,
      nodes: [
        { id: 'a', type: 'server', lane: 1 },
        { id: 'b', type: 'server', lane: 2, align_with: 'a' },
      ],
    });
    expect(after).not.toBe(before);
  });

  it('change quand background_color change (influe sur borderOutset)', () => {
    const before = buildStageSignature(base);
    const after = buildStageSignature({
      ...base,
      nodes: [
        { id: 'a', type: 'server', lane: 1, background_color: '#bfdbfe' },
        { id: 'b', type: 'server', lane: 2 },
      ],
    });
    expect(after).not.toBe(before);
  });

  it('change quand type change', () => {
    const before = buildStageSignature(base);
    const after = buildStageSignature({
      ...base,
      nodes: [
        { id: 'a', type: 'circle', lane: 1 },
        { id: 'b', type: 'server', lane: 2 },
      ],
    });
    expect(after).not.toBe(before);
  });

  it('change quand les connexions changent en mode graph (auto-layout)', () => {
    const graphBase: DataFlowSpec = {
      direction: 'graph',
      nodes: [
        { id: 'a', type: 'circle' },
        { id: 'b', type: 'circle' },
        { id: 'c', type: 'circle' },
      ],
      connections: [{ from: 'a', to: 'b', arrow_head: 'none' }],
      packets: [],
      timeline: [],
    };
    const before = buildStageSignature(graphBase);
    const after = buildStageSignature({
      ...graphBase,
      connections: [{ from: 'a', to: 'c', arrow_head: 'none' }],
    });
    expect(after).not.toBe(before);
  });

  it('ignore les connexions hors mode graph (pas de re-mesure inutile)', () => {
    const before = buildStageSignature(base);
    const after = buildStageSignature({
      ...base,
      connections: [{ from: 'a', to: 'b', arrow_head: 'none' }],
    });
    expect(after).toBe(before);
  });

  it('est stable à spec identique', () => {
    expect(buildStageSignature(base)).toBe(buildStageSignature(base));
  });
});
