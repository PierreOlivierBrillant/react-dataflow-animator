import { useEffect, useRef, useState } from 'react';
import Layout from '@theme/Layout';
import {
  DataFlowPlayer,
  type DataFlowSpec,
  type DataFlowPlayerProps,
  dataFlowSchema,
} from '../../../../packages/react-dataflow-animator/src';
import { demos, demosById } from '../site-content/demos';
import type { SpecError } from '../site-content/validateSpec';
import { motion } from 'motion/react';
import { Copy, Check, AlertCircle, ChevronDown, WrapText } from 'lucide-react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';

function initialDemoId(): string {
  if (typeof window === 'undefined') return demos[0].id;
  const id = new URLSearchParams(window.location.search).get('demo');
  return id && demosById[id] ? id : demos[0].id;
}

// ─── Monaco cross-reference markers ──────────────────────────────────────────

function getValueAtPath(obj: unknown, segments: string[]): unknown {
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

function setMonacoRefMarkers(
  errors: SpecError[],
  parsed: unknown,
  editor: Parameters<OnMount>[0] | null,
  monacoInst: Monaco | null
): void {
  if (!editor || !monacoInst) return;
  const model = editor.getModel();
  if (!model) return;

  const markers = errors
    .filter((e) => e.message.startsWith('ID inconnu'))
    .flatMap((err) => {
      const segments = err.path.split('/').filter(Boolean);
      if (segments.length === 0) return [];
      const key = segments[segments.length - 1];
      const value = getValueAtPath(parsed, segments);
      if (typeof value !== 'string') return [];
      const matches = model.findMatches(
        `"${key}": "${value}"`,
        false,
        false,
        false,
        null,
        false
      );
      return matches.map((m) => ({
        severity: monacoInst.MarkerSeverity.Warning,
        message: err.message,
        startLineNumber: m.range.startLineNumber,
        startColumn: m.range.startColumn,
        endLineNumber: m.range.endLineNumber,
        endColumn: m.range.endColumn,
      }));
    });

  monacoInst.editor.setModelMarkers(model, 'validateSpec', markers);
}

function clearMonacoRefMarkers(
  editor: Parameters<OnMount>[0] | null,
  monacoInst: Monaco | null
): void {
  if (!editor || !monacoInst) return;
  const model = editor.getModel();
  if (!model) return;
  monacoInst.editor.setModelMarkers(model, 'validateSpec', []);
}

/* ────────────── Component ────────────── */

export default function PlaygroundPage() {
  const [demoId, setDemoId] = useState(initialDemoId);
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(demosById[initialDemoId()].spec, null, 2)
  );
  const [spec, setSpec] = useState<DataFlowSpec | null>(
    () => demosById[initialDemoId()].spec
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const [schemaErrors, setSchemaErrors] = useState<SpecError[]>([]);
  const [copied, setCopied] = useState(false);

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [density, setDensity] =
    useState<NonNullable<DataFlowPlayerProps['density']>>('comfortable');

  // Resizing state
  const [leftWidth, setLeftWidth] = useState(44);
  const [isResizing, setIsResizing] = useState(false);

  // Synchronise url & initial state on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('demo', demoId);
      window.history.replaceState({}, '', url);
    }
  }, [demoId]);

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      setLeftWidth(Math.max(20, Math.min(newWidth, 80)));
    };
    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Parse JSON + validation schema (debounced)
  useEffect(() => {
    const tid = setTimeout(async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        setParseError(`JSON invalide : ${msg}`);
        setSchemaErrors([]);
        clearMonacoRefMarkers(editorRef.current, monacoRef.current);
        return;
      }
      setParseError(null);
      const { validateSpec } = await import('../site-content/validateSpec');
      const errors = validateSpec(parsed);
      setSchemaErrors(errors);
      setMonacoRefMarkers(errors, parsed, editorRef.current, monacoRef.current);
      if (errors.length === 0) {
        setSpec(parsed as DataFlowSpec);
      }
    }, 350);
    return () => clearTimeout(tid);
  }, [jsonText]);

  const handleTemplateChange = (key: string) => {
    setDemoId(key);
    const demo = demosById[key] ?? demos[0];
    setJsonText(JSON.stringify(demo.spec, null, 2));
    setSpec(demo.spec);
    setParseError(null);
    setSchemaErrors([]);
    clearMonacoRefMarkers(editorRef.current, monacoRef.current);
  };

  const handleFormat = () => {
    try {
      setJsonText(JSON.stringify(JSON.parse(jsonText), null, 2));
    } catch {}
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const monoSize =
    density === 'compact' ? 11 : density === 'spacious' ? 14 : 13;

  return (
    <Layout
      title="Playground"
      description="Éditeur interactif pour tester vos spécifications JSON."
    >
      <main className="flex flex-col overflow-hidden bg-surface-alt h-[calc(100vh-var(--ifm-navbar-height,64px))] [color-scheme:dark]">
        {/* Page header */}
        <div className="flex-none px-6 py-4 border-b border-white/[.06] flex items-center gap-4">
          <div>
            <h1 className="text-white mb-0 font-heading text-xl font-bold leading-tight tracking-tight">
              Playground
            </h1>
            <p className="text-xs mt-0.5 mb-0 text-white/35 font-sans">
              Éditez la spec JSON à gauche — l'animation se met à jour en temps
              réel.
            </p>
          </div>
        </div>

        {/* Body: editor | preview */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
          {/* ─── LEFT: JSON Editor ─── */}
          <div
            className="flex flex-col w-full md:min-w-[340px] flex-1 md:flex-none border-b md:border-b-0 overflow-hidden bg-surface-alt"
            style={{
              width:
                typeof window !== 'undefined' && window.innerWidth >= 768
                  ? `${leftWidth}%`
                  : undefined,
            }}
          >
            {/* Toolbar */}
            <div className="flex-none flex items-center gap-2 px-3 py-2 border-b border-white/[.05] bg-white/[.015] flex-wrap">
              {/* Template select */}
              <div className="relative">
                <select
                  value={demoId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs cursor-pointer outline-none bg-white/[.06] border border-white/[.09] text-white/75 font-sans"
                >
                  {demos.map((demo) => (
                    <option key={demo.id} value={demo.id}>
                      {demo.title}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={11}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/30"
                />
              </div>

              {/* Format */}
              <button
                onClick={handleFormat}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer bg-white/[.04] border border-white/[.08] text-white/50 font-sans"
              >
                <WrapText size={11} />
                Formater
              </button>

              {/* Density */}
              <div className="relative">
                <select
                  value={density}
                  onChange={(e) =>
                    setDensity(
                      e.target.value as NonNullable<
                        DataFlowPlayerProps['density']
                      >
                    )
                  }
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs cursor-pointer outline-none bg-white/[.04] border border-white/[.08] text-white/45 font-sans"
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Confortable</option>
                  <option value="spacious">Spacieux</option>
                </select>
                <ChevronDown
                  size={11}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/30"
                />
              </div>

              {/* Copy */}
              <button
                onClick={handleCopy}
                className={`ml-auto p-1.5 rounded-lg transition-colors cursor-pointer bg-transparent border-none outline-none ${copied ? 'text-[#34d399]' : 'text-white/30'}`}
                title="Copier"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>

            {/* Editor area */}
            <div className="relative flex-1 overflow-hidden">
              <Editor
                height="100%"
                language="json"
                theme="rdfa-dark"
                value={jsonText}
                onChange={(value) => setJsonText(value || '')}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                }}
                beforeMount={(monaco) => {
                  monaco.editor.defineTheme('rdfa-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': '#0B0A10',
                      'editor.lineHighlightBackground': '#ffffff0a',
                    },
                  });
                  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                    validate: true,
                    schemas: [
                      {
                        uri: 'http://react-dataflow-animator/schema.json',
                        fileMatch: ['*'],
                        schema: dataFlowSchema as any,
                      },
                    ],
                  });
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: monoSize,
                  fontFamily: "'JetBrains Mono', monospace",
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  renderLineHighlight: 'none',
                  hideCursorInOverviewRuler: true,
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8,
                  },
                  padding: { top: 16, bottom: 16 },
                  overviewRulerBorder: false,
                }}
                loading={
                  <div className="flex items-center justify-center w-full h-full text-white/30 text-sm font-sans">
                    Chargement de l'éditeur...
                  </div>
                }
              />
            </div>

            {/* Error bar */}
            {parseError && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="flex-none flex items-start gap-2 px-3 py-2.5 text-xs bg-red-500/[.08] border-t border-red-500/20 text-red-300 font-mono text-[10px]"
              >
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <span className="break-all">{parseError}</span>
              </motion.div>
            )}
          </div>

          {/* Resizer Handle (Desktop only) */}
          <div
            className={`hidden md:block w-[1.5px] hover:w-1.5 hover:-ml-[2px] hover:-mr-[2px] cursor-col-resize hover:bg-violet-500 transition-colors z-10 shrink-0 ${isResizing ? 'bg-violet-500 w-1.5 -ml-[2px] -mr-[2px]' : 'bg-white/[.06]'}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />

          {/* ─── RIGHT: Preview ─── */}
          <div
            className="flex flex-col flex-1 overflow-hidden bg-surface-alt relative"
            style={{ pointerEvents: isResizing ? 'none' : 'auto' }}
          >
            <div className="flex-1 overflow-hidden relative bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.07)_0%,transparent_70%)]">
              {spec ? (
                <DataFlowPlayer
                  spec={spec}
                  theme="dark"
                  controls={true}
                  density={density}
                  height="100%"
                  className="w-full h-full rounded-none border-x-0 border-t-0 bg-transparent border-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-sm text-white/20 font-sans">
                    Entrez une spec JSON valide pour voir l'animation.
                  </div>
                </div>
              )}
            </div>
            {schemaErrors.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="flex-none overflow-hidden"
              >
                <ul className="rdfa-playground-errors">
                  {schemaErrors.map((err, i) => (
                    <li key={i}>
                      <span className="rdfa-playground-errors-path">
                        {err.path}
                      </span>
                      {' — '}
                      {err.message}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}
