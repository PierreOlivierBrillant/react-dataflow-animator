import type { ReactNode } from 'react';
import type { Highlighter, Node } from '../../types';

/**
 * Panneau textuel des nœuds `simple_node` / `complex_node` : remplace le
 * pictogramme par une boîte de texte. `complex_node` ajoute un en-tête séparé du
 * corps par un trait (allure d'un paquet HTTP) ; `simple_node` n'affiche que le
 * corps. `language` colore TOUTES les zones (header + body) via le highlighter.
 */
export function NodePanel({
  object,
  highlight,
}: {
  object: Node;
  highlight: Highlighter;
}): ReactNode {
  const isComplex = object.type === 'complex_node';
  const { header, body, language } = object;

  const zone = (text: string, className: string): ReactNode =>
    language ? (
      <div
        className={`${className} rdfa-code`}
        dangerouslySetInnerHTML={{ __html: highlight(text, language) }}
      />
    ) : (
      <div className={className}>{text}</div>
    );

  return (
    <div
      className={
        'rdfa-node-panel' + (isComplex ? ' rdfa-node-panel--complex' : '')
      }
    >
      {isComplex && header ? zone(header, 'rdfa-node-panel-header') : null}
      {body ? zone(body, 'rdfa-node-panel-body') : null}
    </div>
  );
}
