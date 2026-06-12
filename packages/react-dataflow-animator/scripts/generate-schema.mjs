import { createGenerator } from 'ts-json-schema-generator';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { applySchemaPatches } from './schema-patches.mjs';

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

const schema = applySchemaPatches(createGenerator(config).createSchema(config.type));

const outputPath = join(packageRoot, 'src/schema.generated.json');
writeFileSync(outputPath, JSON.stringify(schema, null, 2) + '\n');

const defCount = Object.keys(schema.definitions ?? {}).length;
console.log(`schema written: src/schema.generated.json (${defCount} definitions)`);
