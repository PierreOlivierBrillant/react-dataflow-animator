import type { ReactNode } from 'react';
import type { Highlighter, ObjectContent, StaticObject } from '../../types';
import type { NodePlacement } from '../../engine/layout';
import { ContentPanel } from '../dynamic/ContentPanel';
import { getNodeIcon } from './nodeIcons';
import { getSubIcon } from './subIcons';

export interface StaticNodeProps {
  object: StaticObject;
  placement: NodePlacement;
  /** Contenu effectif (set_content actif, ou contenu initial du nœud). */
  content?: ObjectContent | null;
  /** Spinner de chargement actif. */
  loading?: boolean;
  highlight: Highlighter;
}

export function StaticNode({
  object,
  placement,
  content,
  loading,
  highlight,
}: StaticNodeProps) {
  const visual: ReactNode = content ? (
    <ContentPanel content={content} highlight={highlight} />
  ) : (
    <>
      <span className="rdfa-node-icon">{getNodeIcon(object.object_type)}</span>
      {object.subicon ? (
        <span className="rdfa-node-subicon">{getSubIcon(object.subicon)}</span>
      ) : null}
      {loading ? <span className="rdfa-spinner" /> : null}
    </>
  );

  const inner = object.url ? (
    <a
      className="rdfa-node-link"
      href={object.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="rdfa-node-visual">{visual}</span>
    </a>
  ) : (
    <span className="rdfa-node-visual">{visual}</span>
  );

  return (
    <div
      className={`rdfa-node${content ? ' rdfa-node--content' : ''}`}
      data-node-id={object.id}
      style={{ left: `${placement.cx * 100}%`, top: `${placement.cy * 100}%` }}
    >
      {inner}
      {object.text ? <span className="rdfa-node-label">{object.text}</span> : null}
    </div>
  );
}
