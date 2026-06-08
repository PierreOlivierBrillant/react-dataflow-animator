import { useLayoutEffect, useRef, useState } from 'react';
import type { Highlighter, ObjectContent } from '../../types';

/**
 * Panneau injecté par `set_content` (ou contenu initial d'un nœud) :
 *  - mode `code` : terminal sombre, coloration Prism, SANS barre d'URL, et le code
 *    ne revient JAMAIS à la ligne (la police est réduite pour tenir dans le panneau) ;
 *  - mode `text` : fenêtre de navigateur (barre d'URL paramétrable via `content.url`) ;
 *  - mode `image` : image dans une fenêtre.
 */
export interface ContentPanelProps {
  content: ObjectContent;
  highlight: Highlighter;
}

/**
 * Bloc de code en `white-space: pre` (pas de retour à la ligne) qui réduit sa
 * police pour que la ligne la plus longue tienne dans la largeur disponible.
 */
function CodeBlock({ html }: { html: string }) {
  const ref = useRef<HTMLPreElement>(null);
  const [fontPx, setFontPx] = useState<number>();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const fit = () => {
      // Mesure la largeur naturelle à la police de base (CSS), puis calcule la
      // police qui fait tenir la ligne la plus longue dans la largeur dispo.
      const applied = el.style.fontSize;
      el.style.fontSize = '';
      const base = parseFloat(getComputedStyle(el).fontSize) || 12.5;
      const natural = el.scrollWidth;
      const avail = el.clientWidth;
      el.style.fontSize = applied;
      setFontPx(
        avail > 0 && natural > avail + 1 ? Math.max(7, base * (avail / natural)) : undefined,
      );
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html]);

  return (
    <pre ref={ref} style={fontPx ? { fontSize: `${fontPx}px` } : undefined}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}

export function ContentPanel({ content, highlight }: ContentPanelProps) {
  const type = content.content_type ?? 'text';

  if (type === 'code') {
    const html = highlight(content.content ?? '', content.language ?? 'plaintext');
    return (
      <div className="rdfa-content rdfa-terminal">
        <div className="rdfa-content-body rdfa-code">
          <CodeBlock html={html} />
        </div>
      </div>
    );
  }

  const url = content.url ?? 'https://localhost';

  if (type === 'image') {
    return (
      <div className="rdfa-content">
        <div className="rdfa-window-bar">
          <span className="rdfa-window-url">{url}</span>
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
        <span className="rdfa-window-url">{url}</span>
      </div>
      <div className="rdfa-content-body">{content.content}</div>
    </div>
  );
}
