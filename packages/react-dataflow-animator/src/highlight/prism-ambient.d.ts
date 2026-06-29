// Prism components are imported as side effects (registering
// a grammar on the global instance). Only `prism-core` exports the Prism object.
declare module 'prismjs/components/prism-core.js' {
  import type Prism from 'prismjs';
  const value: typeof Prism;
  export default value;
}
declare module 'prismjs/components/*.js';
