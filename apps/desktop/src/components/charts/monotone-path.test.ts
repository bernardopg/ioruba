import { describe, expect, it } from "vitest";

import { monotoneCubicPath, type PixelPoint } from "./monotone-path";

/**
 * Samples a cubic Bézier segment, so assertions can talk about the drawn curve
 * instead of the control points that happen to produce it.
 */
function sampleCubic(
  from: PixelPoint,
  c1: PixelPoint,
  c2: PixelPoint,
  to: PixelPoint,
  steps = 24
): PixelPoint[] {
  const samples: PixelPoint[] = [];
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const inv = 1 - t;
    samples.push({
      x:
        inv ** 3 * from.x +
        3 * inv ** 2 * t * c1.x +
        3 * inv * t ** 2 * c2.x +
        t ** 3 * to.x,
      y:
        inv ** 3 * from.y +
        3 * inv ** 2 * t * c1.y +
        3 * inv * t ** 2 * c2.y +
        t ** 3 * to.y
    });
  }
  return samples;
}

/** Walks a path built by `monotoneCubicPath` and samples every segment. */
function samplePath(path: string): PixelPoint[] {
  const move = path.match(/^M(-?[\d.e-]+),(-?[\d.e-]+)/);
  if (!move) {
    return [];
  }

  let cursor: PixelPoint = { x: Number(move[1]), y: Number(move[2]) };
  const samples: PixelPoint[] = [cursor];

  const curves = path.matchAll(
    /C(-?[\d.e-]+),(-?[\d.e-]+) (-?[\d.e-]+),(-?[\d.e-]+) (-?[\d.e-]+),(-?[\d.e-]+)/g
  );

  for (const curve of curves) {
    const [, c1x, c1y, c2x, c2y, tox, toy] = curve.map(Number);
    const to = { x: tox, y: toy };
    samples.push(
      ...sampleCubic(
        cursor,
        { x: c1x, y: c1y },
        { x: c2x, y: c2y },
        to
      ).slice(1)
    );
    cursor = to;
  }

  return samples;
}

describe("monotoneCubicPath", () => {
  it("returns an empty path for no points", () => {
    expect(monotoneCubicPath([])).toBe("");
  });

  it("returns a bare move for a single point, which draws nothing", () => {
    expect(monotoneCubicPath([{ x: 10, y: 20 }])).toBe("M10,20");
  });

  it("passes exactly through every sample", () => {
    const points = [
      { x: 0, y: 100 },
      { x: 40, y: 20 },
      { x: 80, y: 60 },
      { x: 120, y: 10 }
    ];

    const path = monotoneCubicPath(points);

    for (const point of points) {
      expect(path).toContain(`${point.x},${point.y}`);
    }
  });

  it("does not overshoot between two flat readings", () => {
    // The regression this curve exists to avoid: a naive cubic bulges past a
    // plateau, drawing a knob above 100% between two identical samples.
    const points = [
      { x: 0, y: 50 },
      { x: 30, y: 0 },
      { x: 60, y: 0 },
      { x: 90, y: 50 }
    ];

    const samples = samplePath(monotoneCubicPath(points));
    const minimum = Math.min(...samples.map((sample) => sample.y));

    expect(minimum).toBeGreaterThanOrEqual(-1e-9);
  });

  it("stays inside the value range of a monotone series", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 25, y: 10 },
      { x: 50, y: 45 },
      { x: 75, y: 55 },
      { x: 100, y: 100 }
    ];

    const samples = samplePath(monotoneCubicPath(points));

    expect(Math.min(...samples.map((s) => s.y))).toBeGreaterThanOrEqual(-1e-9);
    expect(Math.max(...samples.map((s) => s.y))).toBeLessThanOrEqual(100 + 1e-9);
  });

  it("keeps a monotone series monotone", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 20, y: 5 },
      { x: 40, y: 60 },
      { x: 60, y: 62 },
      { x: 80, y: 100 }
    ];

    const samples = samplePath(monotoneCubicPath(points));

    for (let index = 1; index < samples.length; index++) {
      expect(samples[index].y).toBeGreaterThanOrEqual(samples[index - 1].y - 1e-9);
    }
  });

  it("survives repeated x values without emitting NaN", () => {
    // Two telemetry points can share a tick when frames arrive in the same
    // window; a zero-width run must not divide its way into the path.
    const path = monotoneCubicPath([
      { x: 0, y: 10 },
      { x: 0, y: 20 },
      { x: 10, y: 30 }
    ]);

    expect(path).not.toContain("NaN");
  });

  it("draws a flat line through equal values", () => {
    const samples = samplePath(
      monotoneCubicPath([
        { x: 0, y: 42 },
        { x: 50, y: 42 },
        { x: 100, y: 42 }
      ])
    );

    for (const sample of samples) {
      expect(sample.y).toBeCloseTo(42, 9);
    }
  });
});
