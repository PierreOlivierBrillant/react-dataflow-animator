import { describe, expect, it } from 'vitest';
import { isPanelNode, isShapeType, SHAPE_TYPES } from './nodeKinds';

describe('isPanelNode', () => {
  it('accepts the panel node/packet kinds', () => {
    expect(isPanelNode('simple_node')).toBe(true);
    expect(isPanelNode('complex_node')).toBe(true);
  });

  it('rejects other kinds', () => {
    expect(isPanelNode('square')).toBe(false);
    expect(isPanelNode('http_packet')).toBe(false);
  });
});

describe('isShapeType', () => {
  it('accepts every declared shape type', () => {
    for (const type of SHAPE_TYPES) {
      expect(isShapeType(type)).toBe(true);
    }
  });

  it('rejects a non-shape node type', () => {
    expect(isShapeType('simple_node')).toBe(false);
  });
});
