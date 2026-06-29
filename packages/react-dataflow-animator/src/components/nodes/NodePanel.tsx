import type { ReactNode } from 'react';
import type { Highlighter, Node } from '../../types';

/**
 * Text panel for `simple_node` / `complex_node` nodes: replaces the
 * pictogram with a text box. `complex_node` adds a header separated from the
 * body by a line (resembling an HTTP packet); `simple_node` only displays the
 * body. `language` syntax highlights ALL areas (header + body) via the highlighter.
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
