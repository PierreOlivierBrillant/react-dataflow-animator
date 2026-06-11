import { useMemo, type CSSProperties } from 'react';
import type {
  DataFlowSpec,
  DynamicObject,
  Highlighter,
  ObjectContent,
  Action,
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
import { connection, pathTip } from '../engine/geometry';
import { useStageGeometry } from '../hooks/useStageGeometry';
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
 */
function clipOpacity(
  clip: { startMs: number; animStartMs: number; visibleUntilMs: number },
  t: number
): number {
  const inDur = clip.animStartMs - clip.startMs;
  const fadeIn =
    inDur > 0
      ? clamp((t - clip.startMs) / inDur, 0, 1)
      : clamp((t - clip.startMs) / FADE_MS, 0, 1);
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
  const signature = useMemo(
    () =>
      `${spec.direction ?? 'left-to-right'}|` +
      spec.static_objects.map((o) => o.id).join(','),
    [spec]
  );

  const { stageRef, geometry, aspect, width, height } =
    useStageGeometry(signature);
  const layout = useMemo(() => computeLayout(spec, { aspect }), [spec, aspect]);

  const { scale, maxW, contentMaxW } = useMemo(
    () => computeScale(layout, width, height, density),
    [layout, width, height, density]
  );
  const allNodes = useMemo(() => Object.values(geometry), [geometry]);
  const dynamicById = useMemo(() => {
    const map: Record<string, DynamicObject> = {};
    for (const obj of spec.dynamic_objects) map[obj.id] = obj;
    return map;
  }, [spec]);

  const active = useMemo(() => evaluate(timeline, t), [timeline, t]);

  const { portOffsets, lineConnections } = useMemo(() => {
    const allConnections: [string, string, string][] = [];
    spec.connections?.forEach((c, i) => {
      const key = c.id ?? `${c.from}|${c.to}|${i}`;
      allConnections.push([key, c.from, c.to]);
    });

    const extractArrows = (actions: Action[]) => {
      actions.forEach((a, i) => {
        if (a.action_type === 'arrow' && a.from && a.to) {
          const key = a.id ?? `${a.from}|${a.to}|action_${i}`;
          allConnections.push([key, a.from, a.to]);
        } else if (a.action_type === 'parallel' && a.actions) {
          extractArrows(a.actions);
        }
      });
    };
    if (spec.actions) extractArrows(spec.actions);

    const uniqueConnections = [];
    const seen = new Set();
    for (const c of allConnections) {
      if (!seen.has(c[0])) {
        seen.add(c[0]);
        uniqueConnections.push(c);
      }
    }

    // On groupe par paire de nœuds (indépendamment de la direction)
    const pairConnections: Record<string, [string, string, string][]> = {};
    for (const c of uniqueConnections) {
      const [, from, to] = c;
      const pair = [from, to].sort().join('-');
      if (!pairConnections[pair]) pairConnections[pair] = [];
      pairConnections[pair].push(c);
    }

    // Calcul des faces de départ/arrivée pour chaque paire (fan-out)
    const nodeFaces: Record<string, { pairKey: string; coord: number }[]> = {};
    Object.keys(pairConnections).forEach((pairId) => {
      const conns = pairConnections[pairId];
      const [, from, to] = conns[0]; // On prend la première connexion comme référence
      const p1 = layout[from] ?? { cx: 0.5, cy: 0.5 };
      const p2 = layout[to] ?? { cx: 0.5, cy: 0.5 };
      const dx = p2.cx - p1.cx;
      const dy = p2.cy - p1.cy;
      const isHorizontal = Math.abs(dx) >= Math.abs(dy);

      const faceFrom = isHorizontal
        ? dx >= 0
          ? `${from}|RIGHT`
          : `${from}|LEFT`
        : dy >= 0
          ? `${from}|BOTTOM`
          : `${from}|TOP`;
      const coordFrom = isHorizontal ? p2.cy : p2.cx;
      if (!nodeFaces[faceFrom]) nodeFaces[faceFrom] = [];
      nodeFaces[faceFrom].push({ pairKey: pairId, coord: coordFrom });

      const faceTo = isHorizontal
        ? dx >= 0
          ? `${to}|LEFT`
          : `${to}|RIGHT`
        : dy >= 0
          ? `${to}|TOP`
          : `${to}|BOTTOM`;
      const coordTo = isHorizontal ? p1.cy : p1.cx;
      if (!nodeFaces[faceTo]) nodeFaces[faceTo] = [];
      nodeFaces[faceTo].push({ pairKey: pairId, coord: coordTo });
    });

    const faceOffsets: Record<string, Record<string, number>> = {};
    for (const [face, items] of Object.entries(nodeFaces)) {
      items.sort((a, b) => a.coord - b.coord);
      const total = items.length;
      faceOffsets[face] = {};
      items.forEach((item, i) => {
        faceOffsets[face][item.pairKey] = (i - (total - 1) / 2) * 30;
      });
    }

    const offsets: Record<string, { start: number; end: number }> = {};
    for (const [pairId, conns] of Object.entries(pairConnections)) {
      const total = conns.length;
      conns.forEach(([key, from, to], i) => {
        const intraPairOffset = (i - (total - 1) / 2) * 30;

        const p1 = layout[from] ?? { cx: 0.5, cy: 0.5 };
        const p2 = layout[to] ?? { cx: 0.5, cy: 0.5 };
        const dx = p2.cx - p1.cx;
        const dy = p2.cy - p1.cy;
        const isHorizontal = Math.abs(dx) >= Math.abs(dy);

        const faceFrom = isHorizontal
          ? dx >= 0
            ? `${from}|RIGHT`
            : `${from}|LEFT`
          : dy >= 0
            ? `${from}|BOTTOM`
            : `${from}|TOP`;
        const faceTo = isHorizontal
          ? dx >= 0
            ? `${to}|LEFT`
            : `${to}|RIGHT`
          : dy >= 0
            ? `${to}|TOP`
            : `${to}|BOTTOM`;

        const fanOutStart = faceOffsets[faceFrom]?.[pairId] ?? 0;
        const fanOutEnd = faceOffsets[faceTo]?.[pairId] ?? 0;

        offsets[key] = {
          start: intraPairOffset + fanOutStart,
          end: intraPairOffset + fanOutEnd,
        };
      });
    }

    return { portOffsets: offsets, lineConnections: allConnections };
  }, [spec, layout]);

  // Contenu effectif par nœud : contenu initial (opacité 1), puis set_content
  // actif (avec fondu d'apparition/disparition).
  const contentByNode = useMemo(() => {
    const map: Record<string, { content: ObjectContent; opacity: number }> = {};
    for (const obj of spec.static_objects) {
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

  const nodes = spec.static_objects;

  // Garantit qu'aucun nœud ne sort du canevas : on borne son centre selon sa
  // taille mesurée (basé sur le ratio de layout, donc stable — pas de boucle).
  const PLACEMENT_PAD = 6;
  const placements = useMemo(() => {
    const map: Record<string, { cx: number; cy: number }> = {};
    for (const id of Object.keys(layout)) {
      const base = layout[id];
      const g = geometry[id];
      if (!g || !width || !height) {
        map[id] = base;
        continue;
      }
      const hwr = (g.width / 2 + PLACEMENT_PAD) / width;
      const hhr = (g.height / 2 + PLACEMENT_PAD) / height;
      map[id] = {
        cx: 2 * hwr < 1 ? clamp(base.cx, hwr, 1 - hwr) : base.cx,
        cy: 2 * hhr < 1 ? clamp(base.cy, hhr, 1 - hhr) : base.cy,
      };
    }
    return map;
  }, [layout, geometry, width, height]);

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
              arrowHead={link.arrowHead}
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
              (c) => c[1] === clip.fromId && c[2] === clip.toId
            );
            if (matchingLine) lineKey = matchingLine[0];
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
              arrowHead={clip.arrowHead}
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
          const conn = connection(f, tg, allNodes);
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
