import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  /** Facteur de police COMMUN à tous les panneaux de code (synchronisation). */
  codeFontScale?: number;
  /** Remonte au Stage le ratio de réduction que CE code nécessiterait seul. */
  onCodeFit?: (ratio: number) => void;
}

/**
 * Bloc de code en `white-space: pre` (pas de retour à la ligne). Il MESURE le
 * ratio de réduction qui le ferait tenir (largeur ET hauteur) et le remonte au
 * Stage via `onFit`, mais APPLIQUE le facteur GLOBAL `fontScale` (= le minimum
 * sur tous les panneaux de code) : ainsi tous les codes ont EXACTEMENT la même
 * taille de police, et aucun ne déborde ni n'est clippé.
 */
function CodeBlock({
  html,
  fontScale = 1,
  onFit,
}: {
  html: string;
  fontScale?: number;
  onFit?: (ratio: number) => void;
}) {
  const ref = useRef<HTMLPreElement>(null);
  // onFit n'est pas stable (capture le nodeId) ; on le lit via une ref pour ne
  // pas relancer l'effet de mesure à chaque rendu.
  const onFitRef = useRef(onFit);
  useEffect(() => {
    onFitRef.current = onFit;
  });
  const [baseFont, setBaseFont] = useState<number>();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const SAFETY = 2;
      // Le <pre> porte son propre padding (qui ne dépend PAS de la police) : on le
      // retranche pour ne raisonner que sur la zone de TEXTE.
      const preCs = getComputedStyle(el);
      const padX =
        (parseFloat(preCs.paddingLeft) || 0) +
        (parseFloat(preCs.paddingRight) || 0);
      const padY =
        (parseFloat(preCs.paddingTop) || 0) +
        (parseFloat(preCs.paddingBottom) || 0);
      const applied = el.style.fontSize;
      el.style.fontSize = '';
      const base = parseFloat(getComputedStyle(el).fontSize) || 12.5;
      const naturalW = el.scrollWidth - padX;
      const naturalH = el.scrollHeight - padY;
      const availW = el.clientWidth - padX;
      // Hauteur dispo = celle du corps (borné par max-height), padding du <pre> déduit.
      const body = el.parentElement;
      const availH = (body ? body.clientHeight : el.clientHeight) - padY;
      el.style.fontSize = applied;
      const ratioW =
        availW > 0 && naturalW > availW ? (availW - SAFETY) / naturalW : 1;
      const ratioH =
        availH > 0 && naturalH > availH ? (availH - SAFETY) / naturalH : 1;
      setBaseFont(base);
      onFitRef.current?.(Math.min(ratioW, ratioH, 1));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html]);

  // Police finale = base (CSS, proportionnelle au lecteur) × facteur GLOBAL.
  // Pas de plancher significatif : la taille reste exactement proportionnelle au
  // lecteur (sur une miniature, le code est petit, comme tout le reste).
  const fontPx =
    baseFont != null && fontScale < 1
      ? Math.max(1, baseFont * fontScale)
      : undefined;
  return (
    <pre ref={ref} style={fontPx ? { fontSize: `${fontPx}px` } : undefined}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}

export function ContentPanel({
  content,
  highlight,
  codeFontScale,
  onCodeFit,
}: ContentPanelProps) {
  const type = content.type ?? 'text';

  if (type === 'code') {
    const html = highlight(
      content.value ?? '',
      content.language ?? 'plaintext'
    );
    return (
      <div className="rdfa-content rdfa-terminal">
        <div className="rdfa-content-body rdfa-code">
          <CodeBlock html={html} fontScale={codeFontScale} onFit={onCodeFit} />
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
          <img src={content.value} alt="" />
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="rdfa-content rdfa-content--table">
        <div className="rdfa-content-body rdfa-content-table-wrapper">
          <table className="rdfa-content-table">
            {content.columns && (
              <thead>
                <tr>
                  {content.columns.map((col, i) => (
                    <th key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
            )}
            {content.rows_data && (
              <tbody>
                {content.rows_data.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
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
      <div className="rdfa-content-body">{content.value}</div>
    </div>
  );
}
