/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useStageGeometry } from './useStageGeometry';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRect(x: number, y: number, w: number, h: number): DOMRect {
  return {
    x,
    y,
    width: w,
    height: h,
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({}),
  } as DOMRect;
}

// Stage dimensions controllable between tests.
let stageW = 800;
let stageH = 600;

// ── Test Component ────────────────────────────────────────────────────────────
//
// The values returned by the hook are serialized into data-attributes on the
// Stage in order to inspect them from the tests, avoiding any mutation of
// external variable during rendering.

function StageFixture({ signature }: { signature: string }) {
  const { geometry, aspect, width, height, stageRef } =
    useStageGeometry(signature);
  const ga = geometry['a'];
  const gb = geometry['b'];
  return (
    <div
      ref={stageRef}
      data-testid="stage"
      data-width={width}
      data-height={height}
      data-aspect={aspect}
      data-x-a={ga?.x ?? ''}
      data-y-a={ga?.y ?? ''}
      data-w-a={ga?.width ?? ''}
      data-h-a={ga?.height ?? ''}
      data-lh-a={ga?.labelH ?? ''}
      data-lw-a={ga?.labelW ?? ''}
      data-has-b={gb ? '1' : '0'}
    >
      {/* node-a: has a label */}
      <div data-node-id="a">
        <div className="rdfa-node-visual" />
        <span className="rdfa-node-label" />
      </div>
      {/* node-b: no label */}
      <div data-node-id="b">
        <div className="rdfa-node-visual" />
      </div>
    </div>
  );
}

// ── Mock Setup getBoundingClientRect ────────────────────────────────────────

beforeEach(() => {
  stageW = 800;
  stageH = 600;

  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      if (this.classList.contains('rdfa-node-visual'))
        return makeRect(100, 200, 60, 40);
      if (this.classList.contains('rdfa-node-label'))
        return makeRect(80, 248, 80, 16);
      // Stage div (stageRef.current) — fallback
      return makeRect(0, 0, stageW, stageH);
    }
  );
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useStageGeometry', () => {
  it('construit la GeometryMap à partir des mesures DOM', () => {
    render(<StageFixture signature="s1" />);
    const stage = screen.getByTestId('stage');

    // Both nodes must be present in the map.
    expect(stage.dataset.hasB).toBe('1');

    // x = r.left - sr.left + r.width/2  = 100 - 0 + 30 = 130
    // y = r.top  - sr.top  + r.height/2 = 200 - 0 + 20 = 220
    expect(Number(stage.dataset.xA)).toBe(130);
    expect(Number(stage.dataset.yA)).toBe(220);
    expect(Number(stage.dataset.wA)).toBe(60);
    expect(Number(stage.dataset.hA)).toBe(40);
  });

  it('inclut labelH et labelW pour les nœuds avec label', () => {
    render(<StageFixture signature="s1" />);
    const stage = screen.getByTestId('stage');

    expect(Number(stage.dataset.lhA)).toBe(16);
    expect(Number(stage.dataset.lwA)).toBe(80);
  });

  it('calcule width, height et aspect ratio depuis le Stage', () => {
    render(<StageFixture signature="s1" />);
    const stage = screen.getByTestId('stage');

    expect(Number(stage.dataset.width)).toBe(800);
    expect(Number(stage.dataset.height)).toBe(600);
    expect(Number(stage.dataset.aspect)).toBeCloseTo(800 / 600);
  });

  it('mesure un nœud révélé à l’exécution (set_visible) sans changement de signature', async () => {
    // A node added at runtime (revealed by set_visible) must be measured even
    // though the signature is unchanged, otherwise its edges have no geometry
    // and never draw (regression: bstInsert's new node was never connected).
    function RevealFixture({ showC }: { showC: boolean }) {
      const { geometry, stageRef } = useStageGeometry('const-sig');
      return (
        <div
          ref={stageRef}
          data-testid="stage"
          data-has-c={geometry['c'] ? '1' : '0'}
        >
          <div data-node-id="a">
            <div className="rdfa-node-visual" />
          </div>
          {showC && (
            <div data-node-id="c">
              <div className="rdfa-node-visual" />
            </div>
          )}
        </div>
      );
    }

    const { rerender } = render(<RevealFixture showC={false} />);
    expect(screen.getByTestId('stage').dataset.hasC).toBe('0');

    // Reveal node c (same signature) → the MutationObserver re-measures it.
    rerender(<RevealFixture showC={true} />);
    await waitFor(() =>
      expect(screen.getByTestId('stage').dataset.hasC).toBe('1')
    );
  });

  it('relance la mesure quand la signature change', () => {
    const { rerender } = render(<StageFixture signature="sig-v1" />);
    expect(Number(screen.getByTestId('stage').dataset.width)).toBe(800);

    // New simulated dimensions before re-render.
    stageW = 1024;
    stageH = 768;

    rerender(<StageFixture signature="sig-v2" />);

    const stage = screen.getByTestId('stage');
    expect(Number(stage.dataset.width)).toBe(1024);
    expect(Number(stage.dataset.height)).toBe(768);
    expect(Number(stage.dataset.aspect)).toBeCloseTo(1024 / 768);
  });
});
