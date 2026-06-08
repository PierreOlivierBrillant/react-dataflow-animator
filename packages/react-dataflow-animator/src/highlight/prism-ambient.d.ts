// Les composants Prism sont importés en tant qu'effets de bord (enregistrement
// d'une grammaire sur l'instance globale). Seul `prism-core` exporte l'objet Prism.
declare module 'prismjs/components/prism-core.js' {
  import type Prism from 'prismjs';
  const value: typeof Prism;
  export default value;
}
declare module 'prismjs/components/*.js';
