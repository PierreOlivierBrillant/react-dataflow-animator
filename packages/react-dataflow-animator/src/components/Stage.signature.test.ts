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

  it('est stable à spec identique', () => {
    expect(buildStageSignature(base)).toBe(buildStageSignature(base));
  });
});
