import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import './styles/dataflow.css';
import type { DataFlowPlayerProps } from './types';
import { compile } from '@react-dataflow-animator/core/engine/compiler';
import {
  nextStop,
  prevStop,
} from '@react-dataflow-animator/core/engine/timeline';
import { useClock } from './hooks/useClock';
import { highlightCode } from '@react-dataflow-animator/core/highlight/highlight';
import { Stage } from './components/Stage';
import { Controls } from './components/Controls';
import { JsonDialog } from './components/JsonDialog';
import {
  copyText,
  downloadJson,
  serializeSpec,
} from '@react-dataflow-animator/core/export/json';

const emptySubscribe = () => () => {};
const returnTrue = () => true;
const returnFalse = () => false;

const JsonIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4a3 3 0 0 0-3 3v2a2 2 0 0 1-2 2v2a2 2 0 0 1 2 2v2a3 3 0 0 0 3 3h1v-2H7a1 1 0 0 1-1-1v-2a3 3 0 0 0-1.2-2.4A3 3 0 0 0 6 9V7a1 1 0 0 1 1-1h1V4H7zm10 0a3 3 0 0 1 3 3v2a2 2 0 0 0 2 2v2a2 2 0 0 0-2 2v2a3 3 0 0 1-3 3h-1v-2h1a1 1 0 0 0 1-1v-2a3 3 0 0 1 1.2-2.4A3 3 0 0 1 18 9V7a1 1 0 0 0-1-1h-1V4h1z" />
  </svg>
);

/**
 * Main player: compiles a `spec` into a deterministic timeline and plays it.
 *
 * SSR-safe: no DOM access during render (measurement and clock are
 * confined to client-side effects), so the component hydrates without
 * divergence in Docusaurus & co.
 */
export function DataFlowPlayer({
  spec,
  className,
  style,
  height = 420,
  autoPlay = false,
  loop = false,
  controls = true,
  exportable = false,
  theme = 'default',
  mode = 'auto',
  density = 'comfortable',
  debug = false,
  speed = 1,
  highlight,
  fallback,
}: DataFlowPlayerProps) {
  const { timeline, warnings } = useMemo(() => compile(spec), [spec]);
  const clock = useClock({
    durationMs: timeline.durationMs,
    speed,
    loop,
    autoPlay,
  });
  const highlighter = highlight ?? highlightCode;
  const specJson = useMemo(() => serializeSpec(spec), [spec]);

  const rootRef = useRef<HTMLDivElement>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // True only on client-side (after hydration), without setState-in-effect.
  const isClient = useSyncExternalStore(
    emptySubscribe,
    returnTrue,
    returnFalse
  );

  useEffect(() => {
    if (debug && warnings.length)
      console.warn('[DataFlowAnimator]', ...warnings);
  }, [debug, warnings]);

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  const heightValue = typeof height === 'number' ? `${height}px` : height;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!controls) return;
      if (e.key === ' ') {
        e.preventDefault();
        clock.toggle();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        clock.pause();
        clock.seek(nextStop(timeline, clock.t));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        clock.pause();
        clock.seek(prevStop(timeline, clock.t));
      }
    },
    [controls, clock, timeline]
  );

  return (
    <div
      ref={rootRef}
      className={`rdfa-player${className ? ` ${className}` : ''}`}
      data-theme={theme}
      data-mode={mode}
      style={{ height: heightValue, ...style }}
      tabIndex={controls ? 0 : undefined}
      onKeyDown={controls ? handleKeyDown : undefined}
    >
      {fallback && !isClient ? (
        <div className="rdfa-stage rdfa-fallback">{fallback}</div>
      ) : (
        <>
          <Stage
            spec={spec}
            timeline={timeline}
            t={clock.t}
            highlight={highlighter}
            density={density}
            debug={debug}
          />
          {controls ? (
            <Controls
              clock={clock}
              timeline={timeline}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              exportSlot={
                exportable ? (
                  <button
                    type="button"
                    className="rdfa-btn"
                    aria-label="Spécification JSON"
                    title="Spécification JSON"
                    onClick={() => setJsonOpen(true)}
                  >
                    {JsonIcon}
                  </button>
                ) : null
              }
            />
          ) : null}
          {exportable && jsonOpen ? (
            <JsonDialog
              json={specJson}
              highlight={highlighter}
              onCopy={() => copyText(specJson)}
              onDownload={() => downloadJson(specJson)}
              onClose={() => setJsonOpen(false)}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
