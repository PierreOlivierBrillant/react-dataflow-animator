import type { DataFlowSpec } from '../types';

/** Sérialise la spec pour affichage / copie / téléchargement (indentation 2). */
export function serializeSpec(spec: DataFlowSpec): string {
  return JSON.stringify(spec, null, 2);
}

/** Copie un texte dans le presse-papier. */
export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

/** Télécharge un texte JSON sous forme de fichier `.json` (ancre temporaire). */
export function downloadJson(text: string, filename = 'dataflow.json'): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
