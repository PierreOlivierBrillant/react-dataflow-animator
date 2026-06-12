import { createGenerator } from 'ts-json-schema-generator';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');

const config = {
  path: join(packageRoot, 'src/types.ts'),
  tsconfig: join(packageRoot, 'tsconfig.schema.json'),
  type: 'DataFlowSpec',
  skipTypeCheck: false,
  expose: 'all',
  jsDoc: 'extended',
  additionalProperties: false,
  sortProps: true,
};

const schema = createGenerator(config).createSchema(config.type);

// Post-traitement : HighlightLanguage | (string & {}) génère anyOf[ref, string]
// dans le schema, ce qui accepte n'importe quelle chaîne et perd la validation.
// On remplace ces anyOf par une référence directe pour garder la validation stricte
// tout en préservant le type TypeScript non-cassant.
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

const outputPath = join(packageRoot, 'src/schema.generated.json');
writeFileSync(outputPath, JSON.stringify(schema, null, 2) + '\n');

const defCount = Object.keys(schema.definitions ?? {}).length;
console.log(`schema written: src/schema.generated.json (${defCount} definitions)`);
