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
import { compile } from './engine/compiler';
import { useClock } from './hooks/useClock';
import { highlightCode } from './highlight/highlight';
import { Stage } from './components/Stage';
import { Controls } from './components/Controls';

const emptySubscribe = () => () => {};
const returnTrue = () => true;
const returnFalse = () => false;

/**
 * Lecteur principal : compile une `spec` en chronologie déterministe puis la joue.
 *
 * SSR-safe : aucun accès au DOM pendant le rendu (la mesure et l'horloge sont
 * confinées à des effets côté client), donc le composant s'hydrate sans
 * divergence dans Docusaurus & co.
 */
export function DataFlowPlayer({
  spec,
  className,
  style,
  height = 420,
  autoPlay = false,
  loop = false,
  controls = true,
  theme = 'auto',
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

  const rootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Vrai uniquement côté client (après hydratation), sans setState-in-effect.
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

  return (
    <div
      ref={rootRef}
      className={`rdfa-player${className ? ` ${className}` : ''}`}
      data-theme={theme}
      style={{ height: heightValue, ...style }}
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
            />
          ) : null}
        </>
      )}
    </div>
  );
}
