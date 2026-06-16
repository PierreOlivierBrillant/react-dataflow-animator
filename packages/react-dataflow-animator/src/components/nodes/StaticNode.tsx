import type { CSSProperties, ReactNode } from 'react';
import {
  defineAnimatable,
  type AnimatableComponent,
} from '../../utils/animatable';
import type { Highlighter, ObjectContent, Node } from '../../types';
import type { NodePlacement } from '../../engine/layout';
import { ContentPanel } from '../dynamic/ContentPanel';
import { NodeView } from './NodeView';
import { isPanelNode, isShapeType } from './nodeKinds';
import { nodeTint } from './nodeColors';
import { getSubIcon } from './subIcons';

export interface StaticNodeProps {
  object: Node;
  placement: NodePlacement;
  /** Contenu effectif (set_content actif, ou contenu initial du nœud). */
  content?: ObjectContent | null;
  /** Opacité du contenu (fondu d'apparition/disparition de set_content). */
  contentOpacity?: number;
  /** Spinner de chargement actif. */
  loading?: boolean;
  /** Nœud surligné par une action highlight. */
  highlighted?: boolean;
  highlight: Highlighter;
  /** Opacité globale du nœud (fondu show/hide de set_visible). */
  opacity?: number;
  /** Hauteur imposée au conteneur visuel pendant une transition set_content (px).
   *  Permet d'animer le déplacement du label en synchronie avec le fondu. */
  visualHeight?: number;
  /** Taille max (px) du panneau set_content pour qu'il ne recouvre pas ses voisins
   *  (les nœuds ne bougeant pas, c'est le panneau qui rétrécit pour tenir). */
  contentLimit?: { maxW: number; maxH: number };
  /** Facteur de police COMMUN à tous les panneaux de code (synchronisation). */
  codeFontScale?: number;
  /** Remonte au Stage le ratio de réduction que ce code nécessiterait seul. */
  onCodeFit?: (id: string, ratio: number) => void;
}

export const StaticNode: AnimatableComponent<StaticNodeProps> =
  defineAnimatable(function StaticNode({
    object,
    placement,
    content,
    contentOpacity = 1,
    loading,
    highlighted,
    highlight,
    opacity,
    visualHeight,
    contentLimit,
    codeFontScale,
    onCodeFit,
  }: StaticNodeProps) {
    const isPanel = isPanelNode(object.type);
    const isShape = isShapeType(object.type);
    const visual: ReactNode = content ? (
      <ContentPanel
        content={content}
        highlight={highlight}
        codeFontScale={codeFontScale}
        onCodeFit={
          onCodeFit ? (ratio) => onCodeFit(object.id, ratio) : undefined
        }
      />
    ) : (
      <>
        <NodeView node={object} highlight={highlight} />
        {object.icon ? (
          <span className="rdfa-node-subicon">{getSubIcon(object.icon)}</span>
        ) : null}
        {loading ? <span className="rdfa-spinner" /> : null}
      </>
    );

    // Pendant une transition set_content (visualHeight défini), on contraint la
    // hauteur du conteneur visuel pour que le label glisse progressivement.
    // overflow:hidden + alignItems:flex-start révèle le ContentPanel du haut vers
    // le bas (barre de fenêtre d'abord) sans clipper la boîte englobante du nœud.
    const visualStyle: CSSProperties | undefined = content
      ? {
          opacity: contentOpacity,
          ...(visualHeight != null
            ? {
                height: visualHeight,
                overflow: 'hidden',
                alignItems: 'flex-start',
              }
            : {}),
        }
      : undefined;
    const inner = object.url ? (
      <a
        className="rdfa-node-link"
        href={object.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="rdfa-node-visual" style={visualStyle}>
          {visual}
        </span>
      </a>
    ) : (
      <span className="rdfa-node-visual" style={visualStyle}>
        {visual}
      </span>
    );

    // `tinted` ne sert qu'à la pastille des pictogrammes ; formes/panneaux lisent
    // directement --rdfa-fill. Inutile quand un set_content occupe le nœud.
    const cls =
      'rdfa-node' +
      (content ? ' rdfa-node--content' : '') +
      (!content && isPanel ? ' rdfa-node--panel' : '') +
      (!content && isShape ? ' rdfa-node--shape' : '') +
      (!content && object.background_color ? ' rdfa-node--tinted' : '') +
      (highlighted ? ' rdfa-node--highlight' : '');

    return (
      <div
        className={cls}
        data-node-id={object.id}
        style={
          {
            left: `${placement.cx * 100}%`,
            top: `${placement.cy * 100}%`,
            opacity,
            // Plafonds par nœud : le panneau set_content rétrécit pour ne pas
            // recouvrir ses voisins (les nœuds ne se déplaçant pas).
            ...(content && contentLimit
              ? {
                  '--rdfa-content-maxw': `${contentLimit.maxW}px`,
                  '--rdfa-content-maxh': `${contentLimit.maxH}px`,
                }
              : {}),
            ...nodeTint(object),
          } as CSSProperties
        }
      >
        {inner}
        {object.text ? (
          <span className="rdfa-node-label">{object.text}</span>
        ) : null}
      </div>
    );
  });
