import type { ReactNode } from 'react';
import {
  isPlainText,
  parseRichText,
  type RichSegment,
  type TexNode,
} from '@react-dataflow-animator/core/tex/parse';

/**
 * The two renderers for the `$…$` subset — HTML and SVG — over the one AST from
 * {@link parseRichText}. They exist as a pair because a spec's prose reaches the
 * screen through both: node labels are HTML, connection labels are an SVG
 * `<text>`, where `<sub>` does not exist.
 *
 * Both fast-path a string with no `$` straight back to React, so the overwhelming
 * majority of labels — re-rendered on every animation frame — cost one `indexOf`.
 */

/** Baseline offset of one script level, in `em` of the surrounding text. */
const SHIFT_EM = { sub: 0.22, sup: -0.38 };
/** Font factor per script level, floored at depth 2 — LaTeX stops shrinking
 *  there too, past which a script is unreadable at label size. */
const SCRIPT_SCALE = 0.75;
const MAX_SCRIPT_DEPTH = 2;

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

/**
 * Renders a spec prose field: `$…$` spans become math, the rest stays literal.
 * Returns the input string untouched when it holds no math, so nothing wraps
 * text that doesn't need it.
 */
export function richText(text: string): ReactNode {
  if (isPlainText(text)) return text;
  return parseRichText(text).map((seg, i) =>
    seg.kind === 'literal' ? (
      seg.value
    ) : (
      <span className="rdfa-tex" key={i}>
        {renderHtml(seg.nodes)}
      </span>
    )
  );
}

function renderHtml(nodes: TexNode[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.kind) {
      case 'text':
        return n.value;
      case 'var':
        return (
          <i className="rdfa-tex-var" key={i}>
            {n.value}
          </i>
        );
      case 'space':
        return (
          <span
            key={i}
            className="rdfa-tex-space"
            style={{ marginLeft: `${n.em}em` }}
          />
        );
      case 'sub':
        return <sub key={i}>{renderHtml(n.children)}</sub>;
      case 'sup':
        return <sup key={i}>{renderHtml(n.children)}</sup>;
      case 'over':
        return (
          <span className="rdfa-tex-over" key={i}>
            {renderHtml(n.children)}
          </span>
        );
    }
  });
}

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

/** A leaf of the flattened tree: one `<tspan>` worth of text. */
interface Run {
  value: string;
  italic: boolean;
  overline: boolean;
  /** Baseline offset in `em` of the base text (SVG y grows downwards). */
  shift: number;
  /** Font factor relative to the base text. */
  scale: number;
  /** Horizontal gap to insert BEFORE this run, in `em` of the base text. */
  gap: number;
}

/**
 * Renders a prose field inside an SVG `<text>`.
 *
 * SVG has no `<sub>`, so the tree is flattened into sibling `<tspan>`s carrying
 * an explicit `dy`. Three constraints shape this, and each one is why a naive
 * recursion fails:
 *  - `dy` is cumulative, so only the delta from the previous run is emitted;
 *  - `dy`/`dx` resolve against the tspan's OWN font-size, hence dividing by its
 *    scale to land a shift expressed in base `em`;
 *  - an empty tspan advances nothing, so a `\,` gap can't be its own element —
 *    it rides the next run as `dx`.
 */
export function richTextSvg(text: string): ReactNode {
  if (isPlainText(text)) return text;
  const runs = flattenRuns(parseRichText(text));
  let prevShift = 0;
  return runs.map((run, i) => {
    const dy = (run.shift - prevShift) / run.scale;
    prevShift = run.shift;
    return (
      <tspan
        key={i}
        dx={run.gap === 0 ? undefined : `${(run.gap / run.scale).toFixed(3)}em`}
        dy={dy === 0 ? undefined : `${dy.toFixed(3)}em`}
        fontSize={run.scale === 1 ? undefined : `${run.scale}em`}
        fontStyle={run.italic ? 'italic' : undefined}
        textDecoration={run.overline ? 'overline' : undefined}
      >
        {run.value}
      </tspan>
    );
  });
}

function flattenRuns(segments: RichSegment[]): Run[] {
  const out: Run[] = [];
  let gap = 0;
  const push = (run: Omit<Run, 'gap'>) => {
    out.push({ ...run, gap });
    gap = 0;
  };
  const walk = (
    nodes: TexNode[],
    depth: number,
    shift: number,
    overline: boolean
  ) => {
    const scale = Math.pow(SCRIPT_SCALE, Math.min(depth, MAX_SCRIPT_DEPTH));
    for (const n of nodes) {
      switch (n.kind) {
        case 'text':
        case 'var':
          push({
            value: n.value,
            italic: n.kind === 'var',
            overline,
            shift,
            scale,
          });
          break;
        case 'space':
          gap += n.em * scale;
          break;
        case 'sub':
        case 'sup':
          walk(
            n.children,
            depth + 1,
            shift + SHIFT_EM[n.kind] * scale,
            overline
          );
          break;
        case 'over':
          walk(n.children, depth, shift, true);
          break;
      }
    }
  };
  for (const seg of segments) {
    if (seg.kind === 'literal') {
      push({
        value: seg.value,
        italic: false,
        overline: false,
        shift: 0,
        scale: 1,
      });
    } else {
      walk(seg.nodes, 0, 0, false);
    }
  }
  return out;
}
