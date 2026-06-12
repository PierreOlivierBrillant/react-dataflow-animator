import { useMemo, type CSSProperties } from 'react';
import type {
  DataFlowSpec,
  Packet as PacketSpec,
  Highlighter,
  ObjectContent,
} from '../types';
import {
  clamp,
  evaluate,
  easeInOutCubic,
  type ArrowClip,
  type CommentClip,
  type HighlightClip,
  type MoveClip,
  type Timeline,
} from '../engine/timeline';
import { computeLayout } from '../engine/layout';
import { computeScale, type Density } from '../engine/scale';
import { computePlacements } from '../engine/placements';
import {
  collectArrowConnections,
  computePortOffsets,
} from '../engine/portOffsets';
import { connection, pathTip } from '../engine/geometry';
import { useStageGeometry } from '../hooks/useStageGeometry';
import { buildStageSignature } from './stageSignature';
import { StaticNode } from './nodes/StaticNode';
import { ArrowLine } from './dynamic/ArrowLine';
import { Packet } from './dynamic/Packet';
import { CommentBubble } from './CommentBubble';
import { DebugOverlay } from './DebugOverlay';

/** Durée (ms) du fondu d'apparition/disparition (paquets, contenus). */
const FADE_MS = 250;

/**
 * Opacité d'un clip avec fondu : entrée pendant le hold d'apparition (ou sur
 * FADE_MS s'il n'y en a pas), sortie sur FADE_MS avant la disparition.
 * Pas de fondu de sortie si `keepEnd` est vrai (le clip doit rester visible
 * jusqu'à la toute fin de la chronologie).
 */
function clipOpacity(
  clip: {
    startMs: number;
    animStartMs: number;
    visibleUntilMs: number;
    keepEnd?: boolean;
  },
  t: number
): number {
  const inDur = clip.animStartMs - clip.startMs;
  const fadeIn =
    inDur > 0
      ? clamp((t - clip.startMs) / inDur, 0, 1)
      : clamp((t - clip.startMs) / FADE_MS, 0, 1);
  if (clip.keepEnd) return fadeIn;
  const outStart = clip.visibleUntilMs - FADE_MS;
  const fadeOut =
    t > outStart ? clamp((clip.visibleUntilMs - t) / FADE_MS, 0, 1) : 1;
  return Math.min(fadeIn, fadeOut);
}

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
  const signature = useMemo(() => buildStageSignature(spec), [spec]);

  const { stageRef, geometry, aspect, width, height } =
    useStageGeometry(signature);
  const layout = useMemo(() => computeLayout(spec, { aspect }), [spec, aspect]);

  const { scale, maxW, contentMaxW } = useMemo(
    () => computeScale(layout, width, height, density),
    [layout, width, height, density]
  );
  const allNodes = useMemo(() => Object.values(geometry), [geometry]);
  const dynamicById = useMemo(() => {
    const map: Record<string, PacketSpec> = {};
    for (const obj of spec.packets) map[obj.id] = obj;
    return map;
  }, [spec]);

  const active = useMemo(() => evaluate(timeline, t), [timeline, t]);

  const lineConnections = useMemo(() => collectArrowConnections(spec), [spec]);
  const portOffsets = useMemo(
    () => computePortOffsets(lineConnections, layout),
    [lineConnections, layout]
  );

  // Contenu effectif par nœud : contenu initial (opacité 1), puis set_content
  // actif (avec fondu d'apparition/disparition).
  const contentByNode = useMemo(() => {
    const map: Record<string, { content: ObjectContent; opacity: number }> = {};
    for (const obj of spec.nodes) {
      if (obj.content) map[obj.id] = { content: obj.content, opacity: 1 };
    }
    for (const a of active) {
      if (a.clip.kind === 'set_content') {
        map[a.clip.objectId] = {
          content: a.clip.content,
          opacity: clipOpacity(a.clip, t),
        };
      }
    }
    return map;
  }, [spec, active, t]);

  const loadingNodes = useMemo(() => {
    const set = new Set<string>();
    for (const a of active)
      if (a.clip.kind === 'loading') set.add(a.clip.objectId);
    return set;
  }, [active]);

  // Cibles surlignées (nœuds statiques ou connexions) par l'action highlight.
  const highlightedIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of active) {
      if (a.clip.kind === 'highlight')
        set.add((a.clip as HighlightClip).targetId);
    }
    return set;
  }, [active]);

  const nodes = spec.nodes;

  // Garantit qu'aucun nœud ne sort du canevas : on borne son centre selon sa
  // taille mesurée (basé sur le ratio de layout, donc stable — pas de boucle).
  const placements = useMemo(
    () => computePlacements(layout, geometry, width, height),
    [layout, geometry, width, height]
  );

  return (
    <div
      className="rdfa-stage"
      ref={stageRef}
      style={
        {
          '--rdfa-scale': scale,
          '--rdfa-maxw': `${maxW}px`,
          '--rdfa-content-maxw': `${contentMaxW}px`,
          visibility: width === 0 || height === 0 ? 'hidden' : 'visible',
        } as CSSProperties
      }
    >
      {/* Couche arrière : flèches */}
      <svg className="rdfa-arrow-svg">
        {/* Lignes de base */}
        {spec.connections?.map((link, i) => {
          const f = geometry[link.from];
          const tg = geometry[link.to];
          if (!f || !tg) return null;
          const key = link.id ?? `${link.from}|${link.to}|${i}`;
          const ports = portOffsets[key] ?? { start: 0, end: 0 };
          return (
            <ArrowLine
              key={key}
              from={f}
              to={tg}
              startPortOffset={ports.start}
              endPortOffset={ports.end}
              style={link.style}
              arrow_head={link.arrow_head}
              text={link.text}
              progress={1}
              highlighted={!!link.id && highlightedIds.has(link.id)}
              obstacles={allNodes}
            />
          );
        })}
        {active.map((a) => {
          if (a.clip.kind !== 'arrow') return null;
          const clip = a.clip as ArrowClip;
          const f = geometry[clip.fromId];
          const tg = geometry[clip.toId];
          if (!f || !tg) return null;

          let lineKey = clip.id;
          if (!portOffsets[lineKey]) {
            const matchingLine = lineConnections.find(
              (c) => c.from === clip.fromId && c.to === clip.toId
            );
            if (matchingLine) lineKey = matchingLine.key;
          }
          const ports = portOffsets[lineKey] ?? { start: 0, end: 0 };
          return (
            <ArrowLine
              key={clip.id}
              from={f}
              to={tg}
              startPortOffset={ports.start}
              endPortOffset={ports.end}
              style={clip.style}
              arrow_head={clip.arrow_head}
              text={clip.text}
              progress={a.progress}
              obstacles={allNodes}
            />
          );
        })}
      </svg>

      {/* Nœuds statiques */}
      {nodes.map((o) => {
        const placement = placements[o.id];
        if (!placement) return null;
        return (
          <StaticNode
            key={o.id}
            object={o}
            placement={placement}
            content={contentByNode[o.id]?.content ?? null}
            contentOpacity={contentByNode[o.id]?.opacity ?? 1}
            loading={loadingNodes.has(o.id)}
            highlighted={highlightedIds.has(o.id)}
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
          let moveKey = clip.id;
          if (!portOffsets[moveKey]) {
            const matchingLine = lineConnections.find(
              (c) => c.from === clip.fromId && c.to === clip.toId
            );
            if (matchingLine) moveKey = matchingLine.key;
          }
          const movePorts = portOffsets[moveKey] ?? { start: 0, end: 0 };
          const conn = connection(
            f,
            tg,
            allNodes,
            movePorts.start,
            movePorts.end
          );
          const pt = pathTip(conn, easeInOutCubic(a.progress));
          const opacity = clipOpacity(clip, t);
          return (
            <Packet
              key={clip.id}
              object={obj}
              x={pt.x}
              y={pt.y}
              opacity={opacity}
              scale={0.8 + 0.2 * opacity}
              highlight={highlight}
            />
          );
        })}
        {active.map((a) => {
          if (a.clip.kind !== 'comment') return null;
          const clip = a.clip as CommentClip;
          const n = geometry[clip.nextToId];
          if (!n) return null;
          return (
            <CommentBubble
              key={clip.id}
              node={n}
              text={clip.text}
              opacity={a.progress}
              stageW={width}
              stageH={height}
            />
          );
        })}
      </div>

      {debug ? (
        <DebugOverlay timeline={timeline} t={t} activeCount={active.length} />
      ) : null}
    </div>
  );
}
