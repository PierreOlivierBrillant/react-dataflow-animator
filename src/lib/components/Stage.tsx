import { useMemo } from 'react';
import type {
  DataFlowSpec,
  DynamicObject,
  Highlighter,
  ObjectContent,
} from '../types';
import {
  clamp,
  evaluate,
  easeInOutCubic,
  stepIndexAt,
  type ArrowClip,
  type CommentClip,
  type MoveClip,
  type Timeline,
} from '../engine/timeline';

/** Durée (ms) du fondu d'apparition/disparition des paquets. */
const FADE_MS = 250;
import { computeLayout } from '../engine/layout';
import { connection, pointOnSegment } from '../engine/geometry';
import { collectBidirectional, shiftFor } from '../engine/compiler';
import { useStageGeometry } from '../hooks/useStageGeometry';
import { StaticNode } from './nodes/StaticNode';
import { ArrowLine } from './dynamic/ArrowLine';
import { Packet } from './dynamic/Packet';

export interface StageProps {
  spec: DataFlowSpec;
  timeline: Timeline;
  t: number;
  highlight: Highlighter;
  debug?: boolean;
}

export function Stage({ spec, timeline, t, highlight, debug }: StageProps) {
  const signature = useMemo(
    () =>
      `${spec.direction ?? 'left-to-right'}|` +
      spec.static_objects.map((o) => o.id).join(','),
    [spec],
  );

  const { stageRef, geometry, aspect } = useStageGeometry(signature);
  const layout = useMemo(() => computeLayout(spec, { aspect }), [spec, aspect]);
  const bidir = useMemo(() => collectBidirectional(spec), [spec]);
  const dynamicById = useMemo(() => {
    const map: Record<string, DynamicObject> = {};
    for (const obj of spec.dynamic_objects) map[obj.id] = obj;
    return map;
  }, [spec]);

  const active = useMemo(() => evaluate(timeline, t), [timeline, t]);

  // Contenu effectif par nœud : contenu initial, puis set_content actif.
  const contentByNode = useMemo(() => {
    const map: Record<string, ObjectContent> = {};
    for (const obj of spec.static_objects) if (obj.content) map[obj.id] = obj.content;
    for (const a of active) {
      if (a.clip.kind === 'set_content') map[a.clip.objectId] = a.clip.content;
    }
    return map;
  }, [spec, active]);

  const loadingNodes = useMemo(() => {
    const set = new Set<string>();
    for (const a of active) if (a.clip.kind === 'loading') set.add(a.clip.objectId);
    return set;
  }, [active]);

  const nodes = spec.static_objects;
  const connections = spec.connections ?? [];

  return (
    <div className="rdfa-stage" ref={stageRef}>
      {/* Couche arrière : flèches */}
      <svg className="rdfa-arrow-svg">
        {connections.map((link, i) => {
          const f = geometry[link.from];
          const tg = geometry[link.to];
          if (!f || !tg) return null;
          return (
            <ArrowLine
              key={link.id ?? `${link.from}-${link.to}-${i}`}
              from={f}
              to={tg}
              shift={shiftFor(link.from, link.to, bidir)}
              style={link.style}
              text={link.text}
              progress={1}
            />
          );
        })}
        {active.map((a) => {
          if (a.clip.kind !== 'arrow') return null;
          const clip = a.clip as ArrowClip;
          const f = geometry[clip.fromId];
          const tg = geometry[clip.toId];
          if (!f || !tg) return null;
          return (
            <ArrowLine
              key={clip.id}
              from={f}
              to={tg}
              shift={clip.shift}
              style={clip.style}
              text={clip.text}
              progress={a.progress}
            />
          );
        })}
      </svg>

      {/* Nœuds statiques */}
      {nodes.map((o) => {
        const placement = layout[o.id];
        if (!placement) return null;
        return (
          <StaticNode
            key={o.id}
            object={o}
            placement={placement}
            content={contentByNode[o.id] ?? null}
            loading={loadingNodes.has(o.id)}
            highlight={highlight}
          />
        );
      })}

      {/* Couche avant : paquets + commentaires */}
      <div className="rdfa-overlay">
        {active.map((a) => {
          if (a.clip.kind !== 'move') return null;
          const clip = a.clip as MoveClip;
          const f = geometry[clip.fromId];
          const tg = geometry[clip.toId];
          const obj = dynamicById[clip.objectId];
          if (!f || !tg || !obj) return null;
          const conn = connection(f, tg, clip.shift);
          const pt = pointOnSegment(conn.start, conn.end, easeInOutCubic(a.progress));
          // Fondu : apparition pendant le hold de départ, disparition en fin de vie.
          const inDur = clip.animStartMs - clip.startMs;
          const fadeIn = inDur > 0 ? clamp((t - clip.startMs) / inDur, 0, 1) : 1;
          const outStart = clip.visibleUntilMs - FADE_MS;
          const fadeOut = t > outStart ? clamp((clip.visibleUntilMs - t) / FADE_MS, 0, 1) : 1;
          const opacity = Math.min(fadeIn, fadeOut);
          return (
            <Packet
              key={clip.id}
              object={obj}
              x={pt.x}
              y={pt.y}
              opacity={opacity}
              scale={0.8 + 0.2 * opacity}
            />
          );
        })}
        {active.map((a) => {
          if (a.clip.kind !== 'comment') return null;
          const clip = a.clip as CommentClip;
          const n = geometry[clip.nextToId];
          if (!n) return null;
          return (
            <div
              key={clip.id}
              className="rdfa-comment"
              style={{ left: n.x, top: n.y - n.height / 2 - 8, opacity: a.progress }}
            >
              {clip.text}
            </div>
          );
        })}
      </div>

      {debug ? <DebugOverlay timeline={timeline} t={t} activeCount={active.length} /> : null}
    </div>
  );
}

function DebugOverlay({
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
}
