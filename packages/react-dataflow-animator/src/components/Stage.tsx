import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
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
  type HighlightClip,
  type MoveClip,
  type Timeline,
} from '../engine/timeline';
import { computeLayout } from '../engine/layout';
import { connection, pathTip, type NodeGeom } from '../engine/geometry';
import { useStageGeometry } from '../hooks/useStageGeometry';
import { StaticNode } from './nodes/StaticNode';
import { ArrowLine } from './dynamic/ArrowLine';
import { Packet } from './dynamic/Packet';

/** Durée (ms) du fondu d'apparition/disparition (paquets, contenus). */
const FADE_MS = 250;

/**
 * Opacité d'un clip avec fondu : entrée pendant le hold d'apparition (ou sur
 * FADE_MS s'il n'y en a pas), sortie sur FADE_MS avant la disparition.
 */
function clipOpacity(
  clip: { startMs: number; animStartMs: number; visibleUntilMs: number },
  t: number,
): number {
  const inDur = clip.animStartMs - clip.startMs;
  const fadeIn =
    inDur > 0
      ? clamp((t - clip.startMs) / inDur, 0, 1)
      : clamp((t - clip.startMs) / FADE_MS, 0, 1);
  const outStart = clip.visibleUntilMs - FADE_MS;
  const fadeOut = t > outStart ? clamp((clip.visibleUntilMs - t) / FADE_MS, 0, 1) : 1;
  return Math.min(fadeIn, fadeOut);
}

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
    // Distance horizontale au bord la plus faible (limite la largeur des panneaux
    // pour qu'aucun ne sorte du canevas).
    let minEdgeX = Infinity;
    for (let i = 0; i < ids.length; i++) {
      const a = layout[ids[i]];
      minEdgeX = Math.min(minEdgeX, Math.min(a.cx, 1 - a.cx) * width);
      for (let j = i + 1; j < ids.length; j++) {
        const b = layout[ids[j]];
        const d = Math.hypot((a.cx - b.cx) * width, (a.cy - b.cy) * height);
        if (d > 0) cell = Math.min(cell, d);
      }
    }
    if (!Number.isFinite(cell)) cell = Math.min(width, height) * 0.5 || 220; // <2 nœuds
    cell = clamp(cell, 96, 520);
    const edgeBudget = Number.isFinite(minEdgeX) ? 2 * minEdgeX : width || 320;
    const d = DENSITY[density];
    // L'échelle est limitée À LA FOIS par l'espace par élément (cell) ET par la
    // taille absolue du stage (petit canevas → éléments plus petits).
    const sizeScale = (Math.min(width, height) || 400) / 400;
    const baseScale = clamp(Math.min(cell / 170, sizeScale), 0.5, 1.8);
    return {
      scale: clamp(baseScale * d.scale, 0.45, 2.4),
      maxW: Math.round(cell * d.maxw),
      // Largeur max d'un panneau set_content : tient entre les voisins (cell) ET
      // dans le canevas (bords) → jamais de débordement.
      contentMaxW: Math.round(
        Math.min(cell * 0.95, edgeBudget * 0.92, (width || 320) * 0.92),
      ),
    };
  }, [layout, width, height, density]);
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

    const extractArrows = (actions: any[]) => {
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

    const offsets: Record<string, { start: number; end: number }> = {};
    for (const conns of Object.values(pairConnections)) {
      // Pour chaque paire, on calcule les offsets
      const total = conns.length;
      conns.forEach(([key], i) => {
        const offset = (i - (total - 1) / 2) * 30;
        if (!offsets[key]) offsets[key] = { start: 0, end: 0 };
        offsets[key].start = offset;
        offsets[key].end = offset;
      });
    }
    return { portOffsets: offsets, lineConnections: allConnections };
  }, [spec, layout, width, height]);

  // Contenu effectif par nœud : contenu initial (opacité 1), puis set_content
  // actif (avec fondu d'apparition/disparition).
  const contentByNode = useMemo(() => {
    const map: Record<string, { content: ObjectContent; opacity: number }> = {};
    for (const obj of spec.static_objects) {
      if (obj.content) map[obj.id] = { content: obj.content, opacity: 1 };
    }
    for (const a of active) {
      if (a.clip.kind === 'set_content') {
        map[a.clip.objectId] = { content: a.clip.content, opacity: clipOpacity(a.clip, t) };
      }
    }
    return map;
  }, [spec, active, t]);

  const loadingNodes = useMemo(() => {
    const set = new Set<string>();
    for (const a of active) if (a.clip.kind === 'loading') set.add(a.clip.objectId);
    return set;
  }, [active]);

  // Cibles surlignées (nœuds statiques ou connexions) par l'action highlight.
  const highlightedIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of active) {
      if (a.clip.kind === 'highlight') set.add((a.clip as HighlightClip).targetId);
    }
    return set;
  }, [active]);

  const nodes = spec.static_objects;

  // Garantit qu'aucun nœud ne sort du canevas : on borne son centre selon sa
  // taille mesurée (basé sur le ratio de layout, donc stable — pas de boucle).
  const PLACEMENT_PAD = 6;
  const placementOf = (id: string) => {
    const base = layout[id];
    if (!base) return undefined;
    const g = geometry[id];
    if (!g || !width || !height) return base;
    const hwr = (g.width / 2 + PLACEMENT_PAD) / width;
    const hhr = (g.height / 2 + PLACEMENT_PAD) / height;
    return {
      cx: 2 * hwr < 1 ? clamp(base.cx, hwr, 1 - hwr) : base.cx,
      cy: 2 * hhr < 1 ? clamp(base.cy, hhr, 1 - hhr) : base.cy,
    };
  };

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
            const matchingLine = lineConnections.find(c => c[1] === clip.fromId && c[2] === clip.toId);
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
              text={clip.text}
              progress={a.progress}
              obstacles={allNodes}
            />
          );
        })}
      </svg>

      {/* Nœuds statiques */}
      {nodes.map((o) => {
        const placement = placementOf(o.id);
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

      {debug ? <DebugOverlay timeline={timeline} t={t} activeCount={active.length} /> : null}
    </div>
  );
}

/**
 * Bulle de commentaire qui se mesure et se borne dans le canevas sur les deux
 * axes (au-dessus du nœud par défaut, en dessous sinon), avec une flèche qui
 * pointe vers le nœud quelle que soit la position contrainte.
 */
function CommentBubble({
  node,
  text,
  opacity,
  stageW,
  stageH,
}: {
  node: NodeGeom;
  text: string;
  opacity: number;
  stageW: number;
  stageH: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const PAD = 8;
  const nodeTop = node.y - node.height / 2;
  const nodeBottom = node.y + node.height / 2;
  const below = size.h > 0 && nodeTop - 8 - size.h < PAD;

  let top = below ? nodeBottom + 8 : nodeTop - 8 - size.h;
  if (size.h > 0 && stageH > 0) {
    top = clamp(top, PAD, Math.max(PAD, stageH - size.h - PAD));
  }
  let left = node.x - size.w / 2;
  if (size.w > 0 && stageW > 0) {
    left = clamp(left, PAD, Math.max(PAD, stageW - size.w - PAD));
  }
  const tailX = size.w > 0 ? clamp(node.x - left, 14, size.w - 14) : size.w / 2;

  return (
    <div
      ref={ref}
      className={`rdfa-comment${below ? ' rdfa-comment--below' : ''}`}
      style={{ left, top, opacity }}
    >
      {text}
      <span className="rdfa-comment-tail" style={{ left: tailX }} />
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
