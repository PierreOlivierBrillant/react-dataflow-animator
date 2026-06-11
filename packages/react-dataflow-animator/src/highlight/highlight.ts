// IMPORTANT : importer le core EN PREMIER (il publie l'instance Prism globale),
// puis les grammaires comme effets de bord, en respectant leurs dépendances
// (clike avant javascript, markup avant jsx, etc.).
import Prism from 'prismjs/components/prism-core.js';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-clike.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-csharp.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-http.js';

import type { Highlighter } from '../types';

/** Alias usuels -> identifiants Prism. */
const ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  cs: 'csharp',
  'c#': 'csharp',
  dotnet: 'csharp',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  html: 'markup',
  xml: 'markup',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Coloration syntaxique par défaut (Prism). Renvoie du HTML avec des `<span
 * class="token …">`. Les couleurs sont définies de façon SCOPÉE dans
 * `styles/dataflow.css` (aucun thème Prism global n'est importé).
 *
 * Tolérant : si le langage est inconnu, renvoie le code échappé tel quel.
 */
export const highlightCode: Highlighter = (code, language) => {
  const lang = ALIASES[language?.toLowerCase()] ?? language;
  const grammar = lang ? Prism.languages[lang] : undefined;
  if (!grammar) return escapeHtml(code);
  try {
    return Prism.highlight(code, grammar, lang);
  } catch {
    return escapeHtml(code);
  }
};
