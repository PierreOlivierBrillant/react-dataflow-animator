import type { DataFlowSpec } from '../types';

/** Serializes the spec for display / copying / downloading (indentation 2). */
export function serializeSpec(spec: DataFlowSpec): string {
  return JSON.stringify(spec, null, 2);
}

/** Copies text to the clipboard. */
export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

/** Downloads JSON text as a `.json` file (temporary anchor). */
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
