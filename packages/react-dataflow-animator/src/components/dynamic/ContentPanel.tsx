import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Highlighter, ObjectContent } from '../../types';

/**
 * Panel injected by `set_content` (or initial content of a node):
 *  - `code` mode: dark terminal, Prism syntax highlighting, NO URL bar, and the code
 *    NEVER wraps (the font is scaled down to fit the panel);
 *  - `text` mode: browser window (URL bar configurable via `content.url`);
 *  - `image` mode: image in a window.
 */
export interface ContentPanelProps {
  content: ObjectContent;
  highlight: Highlighter;
  /** COMMON font scale factor for all code panels (synchronization). */
  codeFontScale?: number;
  /** Bubbles up to the Stage the shrink ratio that THIS code would need on its own. */
  onCodeFit?: (ratio: number) => void;
}

/**
 * Code block with `white-space: pre` (no line wrapping). It MEASURES the
 * shrink ratio that would make it fit (width AND height) and bubbles it up to the
 * Stage via `onFit`, but APPLIES the GLOBAL `fontScale` factor (= the minimum
 * across all code panels): this way all code blocks have EXACTLY the same
 * font size, and none overflow or are clipped.
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
  // onFit is not stable (captures the nodeId); we read it via a ref to avoid
  // re-running the measure effect on each render.
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
      // The <pre> has its own padding (which does NOT depend on the font): we
      // subtract it to only reason about the TEXT area.
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
      // Available height = body height (bounded by max-height), minus <pre> padding.
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

  // Final font = base (CSS, proportional to the reader) × GLOBAL factor.
  // No significant floor: the size remains exactly proportional to the
  // reader (on a thumbnail, the code is small, like everything else).
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

  // text / UI: dummy browser window.
  return (
    <div className="rdfa-content">
      <div className="rdfa-window-bar">
        <span className="rdfa-window-url">{url}</span>
      </div>
      <div className="rdfa-content-body">{content.value}</div>
    </div>
  );
}
