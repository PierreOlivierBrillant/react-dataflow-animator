import type { DataFlowSpec } from '../types';

/** Handle returned by {@link mountVanillaStage}. */
export interface VanillaStageHandle {
  /** Detaches the rendered content and releases any resources it holds. */
  destroy(): void;
}

const PLACEHOLDER_STYLE = [
  'display:flex',
  'align-items:center',
  'justify-content:center',
  'height:100%',
  'box-sizing:border-box',
  'padding:1rem',
  'border:2px dashed currentColor',
  'border-radius:8px',
  'opacity:0.6',
  'font:italic 0.85rem/1.4 inherit',
  'text-align:center',
].join(';');

/**
 * Framework-agnostic DOM renderer entry point — PLACEHOLDER.
 *
 * This will become the vanilla-DOM equivalent of `Stage.tsx`
 * (`packages/react-dataflow-animator/src/components/Stage.tsx`): given a
 * spec and a frozen instant `t`, it must eventually produce the exact same
 * `.rdfa-*` markup — styled by the same `dataflow.css` — without any
 * framework runtime. It is introduced now, ahead of the real implementation,
 * so the A/B validation harness and its pixel-diff gate can be built and
 * calibrated first (see docs/AI-VALIDATION.md). Later phases replace the
 * body of this function; the signature is the stable contract both sides
 * of the harness are written against.
 *
 * Renders a clearly-labelled placeholder instead of the diagram — a large
 * pixel diff against the React `Stage` is EXPECTED at this stage, not a
 * regression.
 */
export function mountVanillaStage(
  container: HTMLElement,
  spec: DataFlowSpec,
  t: number
): VanillaStageHandle {
  const root = document.createElement('div');
  root.className = 'rdfa-stage rdfa-vanilla-placeholder';
  root.setAttribute('style', PLACEHOLDER_STYLE);
  root.textContent = `vanilla DOM stage not implemented yet — ${spec.nodes.length} node(s), t=${Math.round(t)}ms`;
  container.appendChild(root);

  return {
    destroy() {
      root.remove();
    },
  };
}
