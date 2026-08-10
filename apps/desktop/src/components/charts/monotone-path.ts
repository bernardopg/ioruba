export type PixelPoint = {
  x: number;
  y: number;
};

function sign(value: number): number {
  return value < 0 ? -1 : 1;
}

/**
 * Tangent at an interior point, per Fritsch–Carlson.
 *
 * Averaging neighbouring slopes (the naive choice) lets a cubic overshoot
 * between samples, which on a 0–100 telemetry axis draws a knob briefly going
 * above 100% or below 0% between two flat readings. Clamping the tangent to
 * three times the smaller neighbouring slope removes the overshoot and keeps
 * the curve monotone wherever the data is.
 */
function interiorTangent(
  previous: PixelPoint,
  current: PixelPoint,
  next: PixelPoint
): number {
  const leftRun = current.x - previous.x;
  const rightRun = next.x - current.x;

  const leftSlope = (current.y - previous.y) / (leftRun || Number.NaN);
  const rightSlope = (next.y - current.y) / (rightRun || Number.NaN);

  if (Number.isNaN(leftSlope) || Number.isNaN(rightSlope)) {
    return 0;
  }

  // Sign change (a local extremum) must flatten to zero, otherwise the curve
  // bulges past the sample it is supposed to turn at.
  if (sign(leftSlope) !== sign(rightSlope)) {
    return 0;
  }

  const weighted =
    (leftSlope * rightRun + rightSlope * leftRun) / (leftRun + rightRun);

  return (
    sign(leftSlope) *
      Math.min(
        Math.abs(leftSlope),
        Math.abs(rightSlope),
        0.5 * Math.abs(weighted)
      ) || 0
  );
}

/**
 * Tangent at the first/last point, given the tangent of its only neighbour.
 */
function endpointTangent(
  from: PixelPoint,
  to: PixelPoint,
  neighbourTangent: number
): number {
  const run = to.x - from.x;
  if (!run) {
    return neighbourTangent;
  }

  const slope = (to.y - from.y) / run;
  const tangent = (3 * slope - neighbourTangent) / 2;

  return Number.isFinite(tangent) ? tangent : 0;
}

/**
 * SVG path for a monotone cubic spline through `points`, already in pixel space
 * and sorted by ascending `x`.
 *
 * This is the shape recharts drew with `type="monotoneX"` (it delegates to
 * d3-shape's `curveMonotoneX`, the same Fritsch–Carlson construction).
 *
 * Returns `""` for no points and a bare `M` for a single one, which renders
 * nothing — matching a line with `dot={false}`.
 */
export function monotoneCubicPath(points: readonly PixelPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  const head = `M${points[0].x},${points[0].y}`;
  if (points.length === 1) {
    return head;
  }

  const tangents = points.map((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return 0;
    }
    return interiorTangent(points[index - 1], point, points[index + 1]);
  });

  tangents[0] = endpointTangent(points[0], points[1], tangents[1]);
  const last = points.length - 1;
  tangents[last] = endpointTangent(
    points[last],
    points[last - 1],
    tangents[last - 1]
  );

  const segments: string[] = [];
  for (let index = 0; index < last; index++) {
    const from = points[index];
    const to = points[index + 1];
    // Control points sit a third of the span in, riding each endpoint's
    // tangent — the standard Hermite-to-Bézier conversion.
    const third = (to.x - from.x) / 3;

    segments.push(
      `C${from.x + third},${from.y + third * tangents[index]}` +
        ` ${to.x - third},${to.y - third * tangents[index + 1]}` +
        ` ${to.x},${to.y}`
    );
  }

  return head + segments.join("");
}
