import { readFileSync, writeFileSync } from 'fs';
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
const data = buildSubIconData(names);
const outputPath = join(packageRoot, 'src/dom/icons/subIconData.generated.ts');
writeFileSync(outputPath, await renderSubIconDataModule(data));

console.log(
  `subicon data written: src/dom/icons/subIconData.generated.ts ` +
    `(${Object.keys(data).length} glyphs)`
);
