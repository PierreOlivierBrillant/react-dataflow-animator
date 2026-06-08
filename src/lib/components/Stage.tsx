import { useMemo, type CSSProperties } from 'react';
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
import { computeLayout } from '../engine/layout';
import { connection, pointOnSegment } from '../engine/geometry';
import { collectBidirectional, shiftFor } from '../engine/compiler';
import { useStageGeometry } from '../hooks/useStageGeometry';
import { StaticNode } from './nodes/StaticNode';
import { ArrowLine } from './dynamic/ArrowLine';
import { Packet } from './dynamic/Packet';

/** Durée (ms) du fondu d'apparition/disparition des paquets. */
const FADE_MS = 250;

type Density = 'compact' | 'comfortable' | 'spacious';

/** Réglages par densité : multiplicateur d'échelle et fraction de cellule (largeur max). */
const DENSITY: Record<Density, { scale: number; maxw: number }> = {
  compact: { scale: 0.82, maxw: 0.78 },
  comfortable: { scale: 1, maxw: 0.86 },
  spacious: { scale: 1.18, maxw: 0.92 },
};

export interface StageProps {
  spec: DataFlowSpec;
  timeline: Timeline;
  t: number;
  highlight: Highlighter;
  density?: Density;
  debug?: boolean;
}

export function Stage({
  spec,
  timeline,
  t,
  highlight,
  density = 'comfortable',
  debug,
}: StageProps) {
  const signature = useMemo(
    () =>
      `${spec.direction ?? 'left-to-right'}|` +
      spec.static_objects.map((o) => o.id).join(','),
    [spec],
  );

  const { stageRef, geometry, aspect, width, height } = useStageGeometry(signature);
  const layout = useMemo(() => computeLayout(spec, { aspect }), [spec, aspect]);

  // « Cellule » = plus petite distance entre deux nœuds (px). Elle pilote :
  //  - l'échelle globale (icônes/polices plus gros en plein écran, plus petits si serré) ;
  //  - la largeur max des panneaux/paquets (pour ne jamais déborder sur le voisin).
  const { scale, maxW, contentMaxW } = useMemo(() => {
    const ids = Object.keys(layout);
    // Plus petite distance entre deux nœuds. NB : on part de +Infini pour ne pas
    // plafonner artificiellement la cellule des layouts peu denses (sinon les
    // panneaux deviennent inutilement étroits alors qu'il reste de la place).
    let cell = Infinity;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = layout[ids[i]];
        const b = layout[ids[j]];
        const d = Math.hypot((a.cx - b.cx) * width, (a.cy - b.cy) * height);
        if (d > 0) cell = Math.min(cell, d);
      }
    }
    if (!Number.isFinite(cell)) cell = Math.min(width, height) * 0.5 || 220; // <2 nœuds
    cell = clamp(cell, 96, 520);
    const d = DENSITY[density];
    const baseScale = clamp(cell / 170, 0.72, 1.8);
    return {
      scale: clamp(baseScale * d.scale, 0.6, 2.4),
      maxW: Math.round(cell * d.maxw),
      // Les panneaux set_content peuvent être plus larges que les paquets
      // (un seul par nœud) → on utilise davantage l'espace disponible.
      contentMaxW: Math.round(cell * 0.95),
    };
  }, [layout, width, height, density]);
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
    <div
      className="rdfa-stage"
      ref={stageRef}
      style={
        {
          '--rdfa-scale': scale,
          '--rdfa-maxw': `${maxW}px`,
          '--rdfa-content-maxw': `${contentMaxW}px`,
        } as CSSProperties
      }
    >
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
