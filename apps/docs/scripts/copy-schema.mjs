import { copyFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// Le JSON Schema est généré depuis types.ts (src/schema.generated.json, source
// de vérité vérifiée par check:schema). On le copie dans static/ pour que
// Docusaurus le serve tel quel à <baseUrl>/schema.json — ainsi un utilisateur
// peut pointer un `$schema` ou la conf VS Code sur l'URL publique. Le fichier
// copié est gitignore : on ne committe pas de doublon qui pourrait dériver.
const __dirname = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(__dirname, '..');

const source = join(
  docsRoot,
  '..',
  '..',
  'packages',
  'react-dataflow-animator',
  'src',
  'schema.generated.json'
);
const destDir = join(docsRoot, 'static');
const dest = join(destDir, 'schema.json');

mkdirSync(destDir, { recursive: true });
copyFileSync(source, dest);

console.log('schema copied: static/schema.json');
