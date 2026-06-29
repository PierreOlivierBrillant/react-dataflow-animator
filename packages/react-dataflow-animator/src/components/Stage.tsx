import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import type {
  DataFlowSpec,
  Packet as PacketSpec,
  Highlighter,
  ObjectContent,
  Zone,
} from '../types';
import {
  evaluate,
  easeInOutCubic,
  type ArrowClip,
  type CommentClip,
  type HighlightClip,
  type MoveClip,
  type SetContentClip,
  type SetVisibleClip,
  type Timeline,
} from '../engine/timeline';
import { computeLayout, connectionAxis } from '../engine/layout';
import { computeScale, type Density } from '../engine/scale';
import { computePlacements, computeContentLimits } from '../engine/placements';
import {
  collectArrowConnections,
  computePortOffsets,
} from '../engine/portOffsets';
import {
  connection,
  pathTip,
  type GeometryMap,
  type NodeGeom,
} from '../engine/geometry';
import { useStageGeometry } from '../hooks/useStageGeometry';
import { buildStageSignature } from './stageSignature';
import { clipOpacity, contentCrossfade } from './clipOpacity';
import { StaticNode } from './nodes/StaticNode';
import { ArrowLine } from './dynamic/ArrowLine';
import { Packet } from './dynamic/Packet';
import { CommentBubble } from './CommentBubble';
import { DebugOverlay } from './DebugOverlay';

// SSR-safe : useLayoutEffect côté client, useEffect côté serveur.
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Hauteur (px) de l'« espace de conception » de référence. L'échelle visuelle est
 * `designScale × (hauteur_réelle / DESIGN_H)` : tout est donc strictement
 * proportionnel à la taille du lecteur (cf. calcul de `scale` dans Stage).
 */
const DESIGN_H = 495;

/** Espacement minimum (px) entre un élément contenu et la bordure de sa zone. */
const ZONE_PADDING = 20;
/** Pixels supplémentaires réservés en haut d'une zone qui a un label, pour
 *  garantir que le texte du label (positionné à top: 8px) ne chevauche jamais
 *  l'arrière-plan du nœud le plus haut — indépendamment du z-index. */
const ZONE_LABEL_EXTRA_TOP = 20;
/** Espace vertical (px) entre le bas du visuel d'un nœud et le haut de son label. */
const NODE_LABEL_GAP = 6;

interface ZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calcule les bornes (px, relatives au Stage) de chaque zone.
 * Les zones internes sont résolues avant les zones qui les contiennent.
 */
function computeZoneBounds(
  zones: Zone[] | undefined,
  geometry: GeometryMap
): Record<string, ZoneBounds> {
  if (!zones?.length) return {};

  const keys = zones.map((z, i) => z.id ?? `__zone_${i}`);
  const computed: Record<string, ZoneBounds> = {};

  const tryOne = (zone: Zone, key: string): boolean => {
    if (computed[key]) return false;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const id of zone.contains) {
      const g = geometry[id];
      if (g) {
        const lh = g.labelH ?? 0;
        const lw = lh > 0 ? (g.labelW ?? Math.max(g.width * 1.5, 60)) : 0;
        const halfW = Math.max(g.width / 2, lw / 2);
        minX = Math.min(minX, g.x - halfW);
        maxX = Math.max(maxX, g.x + halfW);
        minY = Math.min(minY, g.y - g.height / 2);
        maxY = Math.max(
          maxY,
          g.y + g.height / 2 + (lh > 0 ? NODE_LABEL_GAP + lh : 0)
        );
      } else if (computed[id]) {
        const b = computed[id];
        minX = Math.min(minX, b.x);
        maxX = Math.max(maxX, b.x + b.width);
        minY = Math.min(minY, b.y);
        maxY = Math.max(maxY, b.y + b.height);
      } else if (keys.includes(id)) {
        return false; // sous-zone pas encore calculée
      }
      // ID inconnu → ignoré silencieusement
    }
    if (minX === Infinity) return false;
    const topExtra = zone.label ? ZONE_LABEL_EXTRA_TOP : 0;
    computed[key] = {
      x: minX - ZONE_PADDING,
      y: minY - ZONE_PADDING - topExtra,
      width: maxX - minX + 2 * ZONE_PADDING,
      height: maxY - minY + 2 * ZONE_PADDING + topExtra,
    };
    return true;
  };

  // Point fixe : continue tant que des zones sont résolues (gère l'imbrication).
  let progress = true;
  while (progress) {
    progress = false;
    zones.forEach((zone, i) => {
      if (tryOne(zone, keys[i])) progress = true;
    });
  }

  return computed;
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

  const { stageRef, geometry, aspect, width, height, forceRemeasure } =
    useStageGeometry(signature);
  const layout = useMemo(() => computeLayout(spec, { aspect }), [spec, aspect]);

  // Proportionnalité EXACTE : on raisonne dans un « espace de conception » de
  // hauteur fixe (DESIGN_H), de même aspect que le lecteur. Tout (échelle, tailles
  // de panneau, ratios de police) y est calculé une fois — donc constant à aspect
  // donné — puis multiplié par k = hauteur_réelle / DESIGN_H. Les tailles valent
  // ainsi base × designScale × k (∝ k, donc à la taille du lecteur), les positions
  // restent en %, et les ratios de réduction sont identiques à toute taille : un
  // petit lecteur est une réduction strictement homogène d'un grand.
  const k = height > 0 ? height / DESIGN_H : 1;
  const designW = width > 0 && k > 0 ? width / k : 700;
  const design = useMemo(
    () => computeScale(layout, designW, DESIGN_H, density),
    [layout, designW, density]
  );
  const scale = design.scale * k;
  const maxW = design.maxW * k;
  const contentMaxW = design.contentMaxW * k;
  const contentMaxH = design.contentMaxH * k;
  // Le contenu suit exactement l'échelle des icônes.
  const contentScale = scale;
  const allNodes = useMemo(() => Object.values(geometry), [geometry]);
  // Géométrie pré-ContentPanel (icône) par nodeId : capturée dans useLayoutEffect
  // dès qu'un clip set_content devient actif, avant que le ResizeObserver tire.
  const [iconGeomByNode, setIconGeomByNode] = useState<
    Record<string, NodeGeom>
  >({});
  const dynamicById = useMemo(() => {
    const map: Record<string, PacketSpec> = {};
    for (const obj of spec.packets) map[obj.id] = obj;
    return map;
  }, [spec]);

  const active = evaluate(timeline, t);

  const direction = spec.direction ?? 'left-to-right';
  const lineConnections = useMemo(() => collectArrowConnections(spec), [spec]);
  const portOffsets = useMemo(
    () => computePortOffsets(lineConnections, layout, aspect, direction),
    [lineConnections, layout, aspect, direction]
  );

  // Axe d'accroche d'une connexion, dérivé du FLUX du layout (cf. connectionAxis) :
  // la même décision que computePortOffsets, passée à connection/ArrowLine pour que
  // l'accroche et la répartition fan-out s'accordent. undefined si un nœud manque
  // du layout (connection retombe alors sur l'axe pixel dominant).
  const axisFor = (fromId: string, toId: string) => {
    const p1 = layout[fromId];
    const p2 = layout[toId];
    return p1 && p2 ? connectionAxis(p1, p2, direction, aspect) : undefined;
  };

  // Capture la géométrie "icône" des nœuds qui viennent d'entrer en mode
  // set_content. S'exécute après le commit DOM, avant que le ResizeObserver
  // n'ait eu le temps de mettre à jour geometry avec les dimensions du ContentPanel.
  //
  // Quand un nouveau nœud set_content apparaît (hasNew), on appelle forceRemeasure()
  // dans le même layout effect. React 18 batche setIconGeomByNode + setGeometry en
  // un seul re-render, éliminant le flash intermédiaire ("effet 2 frames").
  useIsoLayoutEffect(() => {
    const activeContentNodeIds = new Set<string>();
    for (const a of active) {
      if (a.clip.kind === 'set_content') {
        activeContentNodeIds.add((a.clip as SetContentClip).objectId);
      }
    }
    const hasNew = [...activeContentNodeIds].some(
      (nodeId) => !iconGeomByNode[nodeId] && geometry[nodeId]
    );
    // Un nœud qui SORT du mode set_content rétrécit du panneau vers son icône :
    // un déplacement (clamp anti-débordement qui se relâche) que le ResizeObserver
    // peut manquer. Sans re-mesure, la géométrie reste sur la position du panneau
    // et la flèche ne revient pas exactement à sa place initiale.
    const hasGone = Object.keys(iconGeomByNode).some(
      (nodeId) => !activeContentNodeIds.has(nodeId)
    );
    setIconGeomByNode((prev) => {
      let next = prev;
      for (const nodeId of activeContentNodeIds) {
        if (!prev[nodeId] && geometry[nodeId]) {
          if (next === prev) next = { ...prev };
          next[nodeId] = geometry[nodeId];
        }
      }
      for (const nodeId of Object.keys(prev)) {
        if (!activeContentNodeIds.has(nodeId)) {
          if (next === prev) next = { ...prev };
          delete next[nodeId];
        }
      }
      return next;
    });
    if (hasNew || hasGone) forceRemeasure();
  }, [active, geometry, iconGeomByNode, forceRemeasure]);

  // Contenu effectif par nœud : contenu initial (opacité 1), puis set_content
  // actif (avec fondu d'apparition/disparition).
  const contentByNode: Record<
    string,
    { content: ObjectContent; opacity: number }
  > = {};
  for (const obj of spec.nodes) {
    if (obj.content)
      contentByNode[obj.id] = { content: obj.content, opacity: 1 };
  }
  for (const a of active) {
    if (a.clip.kind !== 'set_content') continue;
    const clip = a.clip as SetContentClip;
    contentByNode[clip.objectId] = {
      content: clip.content,
      // Eased : pilote l'opacité du contenu ET le lerp de géométrie (l. 299).
      opacity: contentCrossfade(clip, t),
    };
  }

  // Police de code SYNCHRONISÉE : chaque CodeBlock remonte (handleCodeFit) le ratio
  // de réduction qu'il nécessiterait seul pour tenir dans sa boîte ; on applique à
  // TOUS le minimum sur l'ENSEMBLE des panneaux de code déjà vus (pas seulement les
  // actifs : ils n'apparaissent pas tous en même temps), si bien que tous les codes
  // ont exactement la même taille de police à tout instant — et aucun ne déborde.
  // Le facteur grandit quand le lecteur grandit (plus de place → moins de réduction).
  const [codeRatios, setCodeRatios] = useState<Record<string, number>>({});
  useIsoLayoutEffect(() => setCodeRatios({}), [signature]);
  const handleCodeFit = useCallback((id: string, ratio: number) => {
    setCodeRatios((prev) =>
      Math.abs((prev[id] ?? 1) - ratio) < 0.005
        ? prev
        : { ...prev, [id]: ratio }
    );
  }, []);
  const codeFontScale = Math.min(1, ...Object.values(codeRatios));

  // Géométrie interpolée : pendant une transition set_content, lerp entre la
  // géométrie pré-content (icône, dans iconGeomByNode) et la géométrie actuelle
  // (ContentPanel mesuré). Facteur = contentCrossfade (eased) → le morph suit
  // exactement le fondu visuel, départ et arrivée ralentis.
  let effectiveGeometry: GeometryMap = geometry;
  let hasSetContentTransition = false;
  for (const a of active) {
    if (a.clip.kind !== 'set_content') continue;
    const clip = a.clip as SetContentClip;
    const nodeId = clip.objectId;
    const iconGeom = iconGeomByNode[nodeId];
    const currGeom = geometry[nodeId];
    if (!iconGeom || !currGeom) continue;
    const p = contentByNode[nodeId]?.opacity ?? 0;
    if (p >= 1) continue;
    if (!hasSetContentTransition) {
      effectiveGeometry = { ...geometry };
      hasSetContentTransition = true;
    }
    const lH = lerp(iconGeom.labelH ?? 0, currGeom.labelH ?? 0, p);
    const lW = lerp(iconGeom.labelW ?? 0, currGeom.labelW ?? 0, p);
    // Débord de la pastille teintée : se résorbe vers 0 à mesure que le panneau
    // set_content (non teinté) prend le pas, évitant un saut d'accroche.
    const bo = lerp(iconGeom.borderOutset ?? 0, currGeom.borderOutset ?? 0, p);
    effectiveGeometry[nodeId] = {
      id: currGeom.id,
      x: lerp(iconGeom.x, currGeom.x, p),
      y: lerp(iconGeom.y, currGeom.y, p),
      width: lerp(iconGeom.width, currGeom.width, p),
      height: lerp(iconGeom.height, currGeom.height, p),
      ...(lH > 0 ? { labelH: lH } : {}),
      ...(lW > 0 ? { labelW: lW } : {}),
      ...(bo > 0 ? { borderOutset: bo } : {}),
      // Même échelle de Stage que l'icône (gap flèche↔nœud à l'échelle).
      ...(currGeom.scale != null ? { scale: currGeom.scale } : {}),
    };
  }
  const allEffectiveNodes = hasSetContentTransition
    ? Object.values(effectiveGeometry)
    : allNodes;

  // Fraction révélée (0..1) par nœud : pilote le clip-path top-down de StaticNode.
  // = l'opacité eased du crossfade (contentCrossfade). Découplé de la géométrie
  // (pas de dépendance à la mesure / iconGeom) → robuste, marche aussi figé.
  const revealByNode: Record<string, number> = {};
  for (const nodeId of Object.keys(contentByNode)) {
    const op = contentByNode[nodeId].opacity;
    if (op < 1) revealByNode[nodeId] = op;
  }

  // Opacité de visibilité par nœud : 0 = caché, 1 = visible, intermédiaire = fondu.
  // Initialisé depuis `node.visible` puis mis à jour par les clips set_visible actifs.
  // Les clips set_visible ont keepEnd=true : ils restent dans `active` après la fin
  // de leur animation, ce qui permet de mémoriser le dernier état sans état mutable.
  const nodeVisibility: Record<string, number> = {};
  for (const node of spec.nodes) {
    if (node.visible === false) nodeVisibility[node.id] = 0;
  }
  for (const a of active) {
    if (a.clip.kind === 'set_visible') {
      const clip = a.clip as SetVisibleClip;
      nodeVisibility[clip.objectId] = clip.visible
        ? a.progress
        : 1 - a.progress;
    }
  }

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

  // Les nœuds ne se DÉPLACENT jamais : on les borne juste pour ne pas sortir du
  // canevas. C'est le rétrécissement des panneaux (contentLimits) qui évite les
  // chevauchements, pas un écartement.
  const placements = useMemo(
    () => computePlacements(layout, geometry, width, height),
    [layout, geometry, width, height]
  );

  // Taille de panneau maximale par nœud pour qu'un set_content ne recouvre jamais
  // un voisin (positions FIXES connues d'avance) : au-delà, le contenu rétrécit.
  // Calculée dans l'espace de CONCEPTION (constant) — le rendu applique ensuite ×k.
  const contentLimits = useMemo(
    () =>
      computeContentLimits(
        layout,
        designW,
        DESIGN_H,
        design.scale,
        design.contentMaxW,
        design.contentMaxH
      ),
    [layout, designW, design]
  );

  const zoneBounds = useMemo(
    () => computeZoneBounds(spec.zones, geometry),
    [spec.zones, geometry]
  );

  return (
    <div
      className="rdfa-stage"
      ref={stageRef}
      style={
        {
          '--rdfa-scale': scale,
          '--rdfa-content-scale': contentScale,
          '--rdfa-maxw': `${maxW}px`,
          '--rdfa-content-maxw': `${contentMaxW}px`,
          '--rdfa-content-maxh': `${contentMaxH}px`,
          visibility: width === 0 || height === 0 ? 'hidden' : 'visible',
        } as CSSProperties
      }
    >
      {/* Couche zones : derrière flèches et nœuds */}
      {spec.zones?.map((zone, i) => {
        const key = zone.id ?? `__zone_${i}`;
        const b = zoneBounds[key];
        if (!b) return null;
        return (
          <div
            key={zone.id ?? i}
            className="rdfa-zone"
            style={
              {
                left: b.x,
                top: b.y,
                width: b.width,
                height: b.height,
                ...(zone.color ? { '--rdfa-zone-color': zone.color } : {}),
              } as CSSProperties
            }
          />
        );
      })}

      {/* Couche arrière : flèches */}
      <svg className="rdfa-arrow-svg">
        {/* Lignes de base */}
        {spec.connections?.map((link, i) => {
          const f = effectiveGeometry[link.from];
          const tg = effectiveGeometry[link.to];
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
              path={link.path}
              arrow_head={link.arrow_head}
              text={link.text}
              progress={1}
              highlighted={!!link.id && highlightedIds.has(link.id)}
              obstacles={allEffectiveNodes}
              axis={axisFor(link.from, link.to)}
            />
          );
        })}
        {active.map((a) => {
          if (a.clip.kind !== 'arrow') return null;
          const clip = a.clip as ArrowClip;
          const f = effectiveGeometry[clip.fromId];
          const tg = effectiveGeometry[clip.toId];
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
              path={clip.path}
              arrow_head={clip.arrow_head}
              text={clip.text}
              progress={a.progress}
              obstacles={allEffectiveNodes}
              axis={axisFor(clip.fromId, clip.toId)}
            />
          );
        })}
      </svg>

      {/* Nœuds statiques */}
      {nodes.map((o) => {
        const placement = placements[o.id];
        if (!placement) return null;
        const nodeOpacity = nodeVisibility[o.id] ?? 1;
        if (nodeOpacity <= 0) return null;
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
            opacity={nodeOpacity < 1 ? nodeOpacity : undefined}
            reveal={revealByNode[o.id]}
            contentLimit={
              contentLimits[o.id]
                ? {
                    maxW: contentLimits[o.id].maxW * k,
                    maxH: contentLimits[o.id].maxH * k,
                  }
                : undefined
            }
            codeFontScale={codeFontScale}
            onCodeFit={handleCodeFit}
          />
        );
      })}

      {/* Labels des zones : au-dessus des nœuds, en dessous des paquets animés */}
      {spec.zones?.map((zone, i) => {
        if (!zone.label) return null;
        const key = zone.id ?? `__zone_${i}`;
        const b = zoneBounds[key];
        if (!b) return null;
        return (
          <span
            key={`zonelabel-${zone.id ?? i}`}
            className="rdfa-zone-label"
            style={
              {
                left: b.x + 12,
                top: b.y + 8,
                ...(zone.color ? { '--rdfa-zone-color': zone.color } : {}),
              } as CSSProperties
            }
          >
            {zone.label}
          </span>
        );
      })}

      {/* Couche avant : paquets + commentaires */}
      <div className="rdfa-overlay">
        {active.map((a) => {
          if (a.clip.kind !== 'move') return null;
          const clip = a.clip as MoveClip;
          const f = effectiveGeometry[clip.fromId];
          const tg = effectiveGeometry[clip.toId];
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
            allEffectiveNodes,
            movePorts.start,
            movePorts.end,
            undefined,
            axisFor(clip.fromId, clip.toId)
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
          const n = clip.nextToId
            ? effectiveGeometry[clip.nextToId]
            : undefined;
          // nextToId fourni mais nœud introuvable (mauvais ID) → on ignore
          if (clip.nextToId && !n) return null;
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
