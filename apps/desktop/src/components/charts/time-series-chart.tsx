import { useMemo, useRef, useState } from "react";

import { monotoneCubicPath, type PixelPoint } from "./monotone-path";
import { useElementSize } from "./use-element-size";

export type ChartSeries = {
  /** Key holding this series' value on each row of `data`. */
  key: string;
  /** Label shown in the tooltip. */
  name: string;
  color: string;
  strokeWidth: number;
};

export type ChartRow = {
  x: number;
} & Record<string, number | undefined>;

type TimeSeriesChartProps = {
  data: readonly ChartRow[];
  series: readonly ChartSeries[];
  /** Inclusive value range of the y axis. */
  yDomain: readonly [number, number];
  yTicks: readonly number[];
  formatValue: (value: number) => string;
  formatX: (value: number) => string;
  xAxisLabel: string;
};

/**
 * Drawn before the first measurement (and in jsdom, which reports every element
 * as 0x0). The chart is width-responsive, so these only decide the geometry of
 * a frame nobody sees in the app — but they keep tests rendering a real chart
 * rather than an empty box.
 */
const FALLBACK_SIZE = { width: 640, height: 320 } as const;

const PADDING = { top: 12, right: 12, bottom: 28, left: 42 } as const;

/** Minimum horizontal gap between x-axis labels, in pixels. */
const MIN_TICK_GAP = 28;

function niceXTicks(
  rows: readonly ChartRow[],
  toPixel: (value: number) => number
): number[] {
  const ticks: number[] = [];
  let lastPixel = Number.NEGATIVE_INFINITY;

  for (const row of rows) {
    const pixel = toPixel(row.x);
    if (pixel - lastPixel >= MIN_TICK_GAP) {
      ticks.push(row.x);
      lastPixel = pixel;
    }
  }

  return ticks;
}

export function TimeSeriesChart({
  data,
  series,
  yDomain,
  yTicks,
  formatValue,
  formatX,
  xAxisLabel
}: TimeSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measured = useElementSize(containerRef);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = measured.width || FALLBACK_SIZE.width;
  const height = measured.height || FALLBACK_SIZE.height;

  const plotWidth = Math.max(1, width - PADDING.left - PADDING.right);
  const plotHeight = Math.max(1, height - PADDING.top - PADDING.bottom);

  const geometry = useMemo(() => {
    const [minX, maxX] = [data[0]?.x ?? 0, data.at(-1)?.x ?? 0];
    const xSpan = maxX - minX;
    const [minY, maxY] = yDomain;
    const ySpan = maxY - minY || 1;

    // A single sample has no span to scale across; pin it to the middle so the
    // tooltip and any marker still land somewhere sensible.
    const toX = (value: number) =>
      PADDING.left + (xSpan === 0 ? plotWidth / 2 : ((value - minX) / xSpan) * plotWidth);
    const toY = (value: number) =>
      PADDING.top + plotHeight - ((value - minY) / ySpan) * plotHeight;

    const paths = series.map((entry) => {
      // Rows where this series has no reading are dropped rather than breaking
      // the line: the knob still holds its last value, the chart just has no
      // sample for that tick. (recharts called this `connectNulls`.)
      const points: PixelPoint[] = [];
      for (const row of data) {
        const value = row[entry.key];
        if (typeof value === "number" && Number.isFinite(value)) {
          points.push({ x: toX(row.x), y: toY(value) });
        }
      }

      return { entry, d: monotoneCubicPath(points), points };
    });

    return { toX, toY, paths, xTicks: niceXTicks(data, toX) };
  }, [data, series, yDomain, plotWidth, plotHeight]);

  const hoveredRow = hoveredIndex === null ? null : data[hoveredIndex] ?? null;

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (data.length === 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;

    // Nearest sample by horizontal distance, which is what a reader means when
    // they point at a spot on a time axis.
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < data.length; index++) {
      const distance = Math.abs(geometry.toX(data[index].x) - pointerX);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    }

    setHoveredIndex(nearest);
  };

  const tooltipLeft = hoveredRow ? geometry.toX(hoveredRow.x) : 0;
  // Flip the tooltip to the left of the cursor near the right edge so it never
  // spills out of the card.
  const tooltipFlipped = tooltipLeft > width * 0.6;

  return (
    <div
      className="relative h-full w-full"
      onPointerLeave={() => setHoveredIndex(null)}
      onPointerMove={handlePointerMove}
      ref={containerRef}
    >
      <svg
        aria-hidden="true"
        className="h-full w-full overflow-visible"
        data-testid="time-series-chart"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
      >
        {/* Horizontal grid only, matching the previous chart. */}
        {yTicks.map((tick) => (
          <line
            key={`grid-${tick}`}
            stroke="color-mix(in oklab, var(--color-border) 75%, transparent)"
            strokeDasharray="4 6"
            x1={PADDING.left}
            x2={PADDING.left + plotWidth}
            y1={geometry.toY(tick)}
            y2={geometry.toY(tick)}
          />
        ))}

        {yTicks.map((tick) => (
          <text
            dominantBaseline="middle"
            fill="var(--color-muted)"
            fontSize={11}
            key={`y-${tick}`}
            textAnchor="end"
            x={PADDING.left - 10}
            y={geometry.toY(tick)}
          >
            {formatValue(tick)}
          </text>
        ))}

        {geometry.xTicks.map((tick) => (
          <text
            fill="var(--color-muted)"
            fontSize={11}
            key={`x-${tick}`}
            textAnchor="middle"
            x={geometry.toX(tick)}
            y={PADDING.top + plotHeight + 18}
          >
            {formatX(tick)}
          </text>
        ))}

        {hoveredRow ? (
          <line
            stroke="color-mix(in oklab, var(--accent-teal) 45%, var(--color-border))"
            strokeDasharray="3 5"
            x1={geometry.toX(hoveredRow.x)}
            x2={geometry.toX(hoveredRow.x)}
            y1={PADDING.top}
            y2={PADDING.top + plotHeight}
          />
        ) : null}

        {geometry.paths.map(({ entry, d }) => (
          <path
            d={d}
            data-series={entry.key}
            fill="none"
            key={entry.key}
            stroke={entry.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={entry.strokeWidth}
          />
        ))}

        {hoveredRow
          ? series.map((entry) => {
              const value = hoveredRow[entry.key];
              if (typeof value !== "number" || !Number.isFinite(value)) {
                return null;
              }
              return (
                <circle
                  cx={geometry.toX(hoveredRow.x)}
                  cy={geometry.toY(value)}
                  fill={entry.color}
                  key={`dot-${entry.key}`}
                  r={4}
                />
              );
            })
          : null}
      </svg>

      {hoveredRow ? (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-[18px] border border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_94%,var(--color-shell)_6%)] px-3 py-2 shadow-(--shadow-float)"
          data-testid="time-series-tooltip"
          style={
            tooltipFlipped
              ? { right: Math.max(8, width - tooltipLeft + 12) }
              : { left: Math.max(8, tooltipLeft + 12) }
          }
        >
          <p className="text-xs font-bold text-(--color-ink)">
            {xAxisLabel} {formatX(hoveredRow.x)}
          </p>
          <ul className="mt-1 space-y-0.5">
            {series.map((entry) => {
              const value = hoveredRow[entry.key];
              if (typeof value !== "number" || !Number.isFinite(value)) {
                return null;
              }
              return (
                <li
                  className="flex items-center gap-2 text-xs text-(--color-copy)"
                  key={entry.key}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="grow truncate">{entry.name}</span>
                  <span className="font-semibold text-(--color-ink)">
                    {formatValue(value)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
