// Public entry point of the framework-agnostic core.
//
// Phase 1 of the core extraction: this package holds the spec's TypeScript types
// and the JSON Schema generated from them. It has NO runtime beyond re-exporting
// the schema JSON, and NO framework dependency.

export * from './types';

// JSON Schema (for API doc / validation).
export { dataFlowSchema } from './schema';
export type { DataFlowSchema } from './schema';
