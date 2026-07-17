import { memo } from 'react';
import {
  stepIndexAt,
  type Timeline,
} from '@react-dataflow-animator/core/engine/timeline';

export const DebugOverlay = memo(function DebugOverlay({
  timeline,
  t,
  activeCount,
}: {
  timeline: Timeline;
  t: number;
  activeCount: number;
}) {
  const step = stepIndexAt(timeline, t);
  return (
    <div className="rdfa-debug">
      <div>
        <b>t</b> {Math.round(t)} / {Math.round(timeline.durationMs)} ms
      </div>
      <div>
        <b>étape</b> {step + 1} / {timeline.steps.length} · <b>clips actifs</b>{' '}
        {activeCount}
      </div>
      {timeline.clips.map((c) => {
        const isActive = t >= c.startMs && t <= c.visibleUntilMs;
        return (
          <div
            key={c.id}
            className={`rdfa-debug-row${isActive ? ' is-active' : ''}`}
          >
            {c.kind} #{c.id} [{Math.round(c.startMs)}–{Math.round(c.endMs)}]
          </div>
        );
      })}
    </div>
  );
});
