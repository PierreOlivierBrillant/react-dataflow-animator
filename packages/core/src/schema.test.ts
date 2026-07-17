import { describe, it, expect } from 'vitest';
import { dataFlowSchema } from './schema';

describe('dataFlowSchema', () => {
  it('exposes the generated DataFlowSpec schema', () => {
    expect(dataFlowSchema.title).toBe('DataFlowSpec');
    expect(dataFlowSchema.$ref).toBe('#/definitions/DataFlowSpec');
  });

  it('carries the full set of spec definitions', () => {
    const names = Object.keys(dataFlowSchema.definitions);
    expect(names).toContain('DataFlowSpec');
    expect(names).toContain('Node');
    expect(names).toContain('Action');
    expect(names.length).toBeGreaterThan(30);
  });
});
