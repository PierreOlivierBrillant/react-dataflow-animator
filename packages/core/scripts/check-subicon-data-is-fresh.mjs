import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildSubIconData,
  catalogIconNames,
  packageRoot,
  renderSubIconDataModule,
} from './subicon-data.mjs';

const names = catalogIconNames(
  readFileSync(join(packageRoot, 'src/dom/icons/subIconCatalog.ts'), 'utf8')
);
const generated = await renderSubIconDataModule(buildSubIconData(names));
const committed = readFileSync(
  join(packageRoot, 'src/dom/icons/subIconData.generated.ts'),
  'utf8'
);

if (generated !== committed) {
  console.error(
    'ERROR: src/dom/icons/subIconData.generated.ts is stale. Run ' +
      '`npm run generate:subicons` to regenerate.'
  );
  process.exit(1);
}

console.log('subicon data is up to date');
