import type { MouseEvent, ReactNode } from 'react';
import type { Clock } from '../hooks/useClock';
import { clamp, nextStop, prevStop, type Timeline } from '../engine/timeline';

export interface ControlsProps {
  clock: Clock;
  timeline: Timeline;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Optional slot for the JSON spec button (rendered before full screen). */
  exportSlot?: ReactNode;
}

const Icon = {
  play: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  ),
  restart: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  prev: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5h2v14H7zM20 5v14l-9-7z" />
    </svg>
  ),
  next: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15 5h2v14h-2zM4 5v14l9-7z" />
    </svg>
  ),
  enterFs: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  ),
  exitFs: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  ),
};

function fmt(ms: number): string {
  return `${Math.round(ms / 1000)}s`;
}

export function Controls({
  clock,
  timeline,
  isFullscreen,
  onToggleFullscreen,
  exportSlot,
}: ControlsProps) {
  const { t, playing, durationMs } = clock;
  const ratio = durationMs > 0 ? clamp(t / durationMs, 0, 1) : 0;

  const seekFromEvent = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const r = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    clock.seek(r * durationMs);
  };

  return (
    <div className="rdfa-controls">
      <button
        type="button"
        className="rdfa-btn"
        onClick={clock.restart}
        aria-label="Recommencer depuis le début"
        title="Recommencer depuis le début"
      >
        {Icon.restart}
      </button>
      <button
        type="button"
        className="rdfa-btn"
        onClick={clock.toggle}
        aria-label={playing ? 'Pause' : 'Lecture'}
        title={playing ? 'Pause' : 'Lecture'}
      >
        {playing ? Icon.pause : Icon.play}
      </button>
      <button
        type="button"
        className="rdfa-btn"
        onClick={() => {
          clock.pause();
          clock.seek(prevStop(timeline, t));
        }}
        aria-label="Étape précédente"
        title="Étape précédente"
      >
        {Icon.prev}
      </button>
      <button
        type="button"
        className="rdfa-btn"
        onClick={() => clock.playTo(nextStop(timeline, t))}
        aria-label="Étape suivante"
        title="Étape suivante"
      >
        {Icon.next}
      </button>

      <button
        type="button"
        className="rdfa-timeline"
        onClick={seekFromEvent}
        aria-label="Barre de progression"
      >
        <span className="rdfa-timeline-track">
          <span
            className="rdfa-timeline-fill"
            style={{ width: `${ratio * 100}%` }}
          />
          {timeline.stops.map((stop) =>
            stop > 0 && stop < durationMs ? (
              <span
                key={stop}
                className="rdfa-timeline-step"
                style={{ left: `${(stop / durationMs) * 100}%` }}
              />
            ) : null
          )}
          <span
            className="rdfa-timeline-thumb"
            style={{ left: `${ratio * 100}%` }}
          />
        </span>
      </button>

      <span className="rdfa-time">
        {fmt(t)} / {fmt(durationMs)}
      </span>

      {exportSlot}

      <button
        type="button"
        className="rdfa-btn"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
      >
        {isFullscreen ? Icon.exitFs : Icon.enterFs}
      </button>
    </div>
  );
}
