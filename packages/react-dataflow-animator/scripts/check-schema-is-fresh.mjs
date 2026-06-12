import { createGenerator } from 'ts-json-schema-generator';
import { readFileSync } from 'fs';
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

const generated =
  JSON.stringify(
    applySchemaPatches(createGenerator(config).createSchema(config.type)),
    null,
    2,
  ) + '\n';
const committed = readFileSync(
  join(packageRoot, 'src/schema.generated.json'),
  'utf8',
);

if (generated !== committed) {
  console.error(
    'ERROR: src/schema.generated.json is stale. Run `npm run generate:schema` to regenerate.',
  );
  process.exit(1);
}

console.log('schema is up to date');
