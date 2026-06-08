import type { Highlighter, ObjectContent } from '../../types';

/**
 * Panneau injecté par `set_content` (ou contenu initial d'un nœud) :
 *  - mode `code` : terminal sombre avec coloration syntaxique (Prism) ;
 *  - mode `text` : fenêtre de navigateur (barre d'URL factice + pastilles macOS) ;
 *  - mode `image` : image dans une fenêtre.
 */
export interface ContentPanelProps {
  content: ObjectContent;
  highlight: Highlighter;
}

function WindowDots() {
  return (
    <span className="rdfa-window-dots">
      <span className="rdfa-window-dot" />
      <span className="rdfa-window-dot" />
      <span className="rdfa-window-dot" />
    </span>
  );
}

export function ContentPanel({ content, highlight }: ContentPanelProps) {
  const type = content.content_type ?? 'text';

  if (type === 'code') {
    const html = highlight(content.content ?? '', content.language ?? 'plaintext');
    return (
      <div className="rdfa-content rdfa-terminal">
        <div className="rdfa-window-bar">
          <WindowDots />
          {content.language ? (
            <span className="rdfa-window-url">{content.language}</span>
          ) : null}
        </div>
        <div className="rdfa-content-body rdfa-code">
          <pre>
            <code dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
        </div>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className="rdfa-content">
        <div className="rdfa-window-bar">
          <WindowDots />
        </div>
        <div className="rdfa-content-body">
          <img src={content.content} alt="" />
        </div>
      </div>
    );
  }

  // text / UI : fenêtre de navigateur factice.
  return (
    <div className="rdfa-content">
      <div className="rdfa-window-bar">
        <WindowDots />
        <span className="rdfa-window-url">https://localhost</span>
      </div>
      <div className="rdfa-content-body">{content.content}</div>
    </div>
  );
}
