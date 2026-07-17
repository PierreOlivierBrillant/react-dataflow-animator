import { describe, expect, it } from 'vitest';
import { shapeWaypoints } from './pathShapes';
import type { Point } from './geometry';

// Signed distance of a point to straight segment a→b (positive on one side).
function deviation(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return ((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

function maxAbsDeviation(pts: Point[], a: Point, b: Point): number {
  return pts.reduce((m, p) => Math.max(m, Math.abs(deviation(p, a, b))), 0);
}

const A: Point = { x: 0, y: 0 };
const DIAG: Point = { x: 100, y: 40 }; // transverse shift → visible curve
const ALIGNED: Point = { x: 100, y: 0 }; // aligned → any shape = straight line

describe('shapeWaypoints — straight', () => {
  it('2 control points → no intermediate point', () => {
    expect(shapeWaypoints([A, DIAG], 'straight')).toBeUndefined();
  });

  it('with detour → keeps only the detour', () => {
    const detour: Point = { x: 50, y: -30 };
    expect(shapeWaypoints([A, detour, ALIGNED], 'straight')).toEqual([detour]);
  });
});

describe('shapeWaypoints — bezier / simplebezier', () => {
  it('aligned nodes → straight line (undefined)', () => {
    expect(shapeWaypoints([A, ALIGNED], 'bezier')).toBeUndefined();
    expect(shapeWaypoints([A, ALIGNED], 'simplebezier')).toBeUndefined();
  });

  it('transverse shift → sampled curve bounded by extremities', () => {
    const pts = shapeWaypoints([A, DIAG], 'bezier');
    expect(pts).toBeDefined();
    expect(pts!.length).toBeGreaterThan(5);
    // x strictly increasing between the two extremities
    for (const p of pts!) {
      expect(p.x).toBeGreaterThan(A.x);
      expect(p.x).toBeLessThan(DIAG.x);
    }
    // the curve actually deviates from the straight segment
    expect(maxAbsDeviation(pts!, A, DIAG)).toBeGreaterThan(1);
  });

  it('simplebezier is more subtle (deviates less) than bezier', () => {
    const bez = shapeWaypoints([A, DIAG], 'bezier')!;
    const simple = shapeWaypoints([A, DIAG], 'simplebezier')!;
    expect(maxAbsDeviation(simple, A, DIAG)).toBeLessThan(
      maxAbsDeviation(bez, A, DIAG)
    );
  });

  it('detour: the curve passes through it (junction point reinserted)', () => {
    const detour: Point = { x: 50, y: -30 };
    const pts = shapeWaypoints([A, detour, ALIGNED], 'bezier')!;
    expect(pts.some((p) => p.x === detour.x && p.y === detour.y)).toBe(true);
  });
});

describe('shapeWaypoints — radial normals (round outline)', () => {
  it('bezier handles leave along the given outward normals', () => {
    // Aligned chord (0,0)→(100,0), but both endpoints exit UPWARD (normal 0,-1):
    // the curve must bow above the straight segment despite no transverse shift.
    const pts = shapeWaypoints([A, ALIGNED], 'bezier', undefined, {
      start: { x: 0, y: -1 },
      end: { x: 0, y: -1 },
    });
    expect(pts).toBeDefined();
    expect(pts!.some((p) => p.y < -1)).toBe(true);
    // x stays within the chord span.
    for (const p of pts!) {
      expect(p.x).toBeGreaterThanOrEqual(A.x - 1e-6);
      expect(p.x).toBeLessThanOrEqual(ALIGNED.x + 1e-6);
    }
  });

  it('normals aligned with the chord → samples stay on the straight line', () => {
    // start exits +x, end exits −x (i.e. toward each other) = a plain straight link.
    const pts = shapeWaypoints([A, ALIGNED], 'bezier', undefined, {
      start: { x: 1, y: 0 },
      end: { x: -1, y: 0 },
    });
    expect(pts).toBeDefined();
    expect(maxAbsDeviation(pts!, A, ALIGNED)).toBeCloseTo(0, 6);
  });

  it('normals override the endpoint axis for the handles', () => {
    // endpointAxis says horizontal, but the normals say vertical → curve bows.
    const pts = shapeWaypoints([A, ALIGNED], 'bezier', 'horizontal', {
      start: { x: 0, y: -1 },
      end: { x: 0, y: -1 },
    });
    expect(maxAbsDeviation(pts!, A, ALIGNED)).toBeGreaterThan(1);
  });
});

describe('shapeWaypoints — step', () => {
  it('orthogonal corners: alternatively H and V segments', () => {
    const pts = shapeWaypoints([A, DIAG], 'step')!;
    expect(pts).toEqual([
      { x: 50, y: 0 },
      { x: 50, y: 40 },
    ]);
    // each segment of the complete polyline is horizontal OR vertical
    const full = [A, ...pts, DIAG];
    for (let i = 0; i < full.length - 1; i++) {
      const h = Math.abs(full[i + 1].y - full[i].y) < 1e-9;
      const v = Math.abs(full[i + 1].x - full[i].x) < 1e-9;
      expect(h || v).toBe(true);
    }
  });

  it('aligned nodes → straight path (zero deviation)', () => {
    const pts = shapeWaypoints([A, ALIGNED], 'step');
    if (pts) expect(maxAbsDeviation(pts, A, ALIGNED)).toBeCloseTo(0, 6);
  });

  it('near-aligned segment → straight (no mid-jog under the threshold)', () => {
    // A 2px transverse offset over a 100px vertical run: no stepped corners.
    const near = shapeWaypoints(
      [
        { x: 0, y: 0 },
        { x: 2, y: 100 },
      ],
      'step',
      'vertical'
    );
    expect(near).toBeUndefined();
    // A clear offset still steps.
    const far = shapeWaypoints(
      [
        { x: 0, y: 0 },
        { x: 40, y: 100 },
      ],
      'step',
      'vertical'
    );
    expect(far).toBeDefined();
    expect(far!.length).toBeGreaterThan(0);
  });
});

describe('shapeWaypoints — smoothstep', () => {
  it('rounded corners: more points than step, bounded by box', () => {
    const step = shapeWaypoints([A, DIAG], 'step')!;
    const smooth = shapeWaypoints([A, DIAG], 'smoothstep')!;
    expect(smooth.length).toBeGreaterThan(step.length);
    for (const p of smooth) {
      expect(p.x).toBeGreaterThanOrEqual(A.x - 1e-6);
      expect(p.x).toBeLessThanOrEqual(DIAG.x + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(A.y - 1e-6);
      expect(p.y).toBeLessThanOrEqual(DIAG.y + 1e-6);
    }
  });
});
