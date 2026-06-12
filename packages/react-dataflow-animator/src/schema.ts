import schemaJson from './schema.generated.json';

/**
 * JSON Schema (draft-07) de la spécification DataFlow.
 * Généré automatiquement depuis types.ts par scripts/generate-schema.mjs.
 * NE PAS MODIFIER À LA MAIN — relancer `npm run generate:schema`.
 */
export const dataFlowSchema = schemaJson;
export type DataFlowSchema = typeof dataFlowSchema;
