/**
 * Post-traitements appliqués au schéma généré par ts-json-schema-generator.
 * Importé par generate-schema.mjs ET check-schema-is-fresh.mjs pour garantir
 * que la génération et la vérification utilisent exactement la même logique.
 */

/**
 * `HighlightLanguage | (string & {})` génère `anyOf: [$ref, {type:string}]`
 * dans le schéma, ce qui accepte n'importe quelle chaîne et neutralise la
 * validation. On remplace par un `$ref` direct pour obtenir une validation
 * stricte tout en préservant le type TypeScript non-cassant côté consommateur.
 *
 * @param {object} schema - Le schéma JSON brut (muté en place).
 * @returns {object} Le schéma muté.
 */
export function applySchemaPatches(schema) {
  schema.title = 'DataFlowSpec';

  for (const defName of ['ObjectContent', 'PacketBody']) {
    const def = schema.definitions?.[defName];
    if (def?.properties?.language?.anyOf) {
      const ref = def.properties.language.anyOf.find((b) => b['$ref']);
      if (ref) {
        const { anyOf: _anyOf, ...rest } = def.properties.language;
        def.properties.language = { ...rest, $ref: ref['$ref'] };
      }
    }
  }
  return schema;
}
