// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  TimeSeriesChart,
  type ChartRow,
  type ChartSeries
} from "./time-series-chart";

afterEach(cleanup);

const SERIES: ChartSeries[] = [
  { key: "knob-1", name: "Master", color: "#111", strokeWidth: 3.2 },
  { key: "knob-2", name: "Browser", color: "#222", strokeWidth: 2.6 }
];

function rows(): ChartRow[] {
  return [
    { x: 1, "knob-1": 10, "knob-2": 90 },
    { x: 2, "knob-1": 40, "knob-2": 70 },
    { x: 3, "knob-1": 80, "knob-2": 20 }
  ];
}

function renderChart(data: ChartRow[], series: ChartSeries[] = SERIES) {
  return render(
    <TimeSeriesChart
      data={data}
      formatValue={(value) => `${Math.round(value)}%`}
      formatX={(value) => String(value)}
      series={series}
      xAxisLabel="Tick"
      yDomain={[0, 100]}
      yTicks={[0, 50, 100]}
    />
  );
}

function seriesPath(key: string): SVGPathElement {
  const path = document.querySelector<SVGPathElement>(
    `path[data-series="${key}"]`
  );
  if (!path) {
    throw new Error(`series ${key} was not drawn`);
  }
  return path;
}

describe("TimeSeriesChart", () => {
  it("draws one path per series", () => {
    renderChart(rows());

    expect(document.querySelectorAll("path[data-series]")).toHaveLength(2);
    expect(seriesPath("knob-1").getAttribute("d")).toMatch(/^M[\d.]+,[\d.]+C/);
  });

  it("renders the y axis ticks through the value formatter", () => {
    renderChart(rows());

    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("maps the value domain so a higher reading sits higher on screen", () => {
    // Guards the y inversion: SVG y grows downward, values grow upward.
    renderChart([
      { x: 1, "knob-1": 0 },
      { x: 2, "knob-1": 100 }
    ]);

    const d = seriesPath("knob-1").getAttribute("d") ?? "";
    const [, startY] = d.match(/^M[\d.]+,([\d.]+)/) ?? [];
    const [, endY] = d.match(/([\d.]+)$/) ?? [];

    expect(Number(endY)).toBeLessThan(Number(startY));
  });

  it("bridges rows where a series has no reading instead of breaking the line", () => {
    // `connectNulls` behaviour: a knob that reported nothing on one tick keeps a
    // continuous line, because it still holds its previous value.
    renderChart([
      { x: 1, "knob-1": 10 },
      { x: 2 },
      { x: 3, "knob-1": 30 }
    ]);

    const d = seriesPath("knob-1").getAttribute("d") ?? "";

    expect(d).not.toContain("NaN");
    expect(d.match(/C/g)).toHaveLength(1);
  });

  it("omits a series with no readings at all rather than drawing NaN", () => {
    renderChart([{ x: 1, "knob-1": 10 }, { x: 2, "knob-1": 20 }]);

    expect(seriesPath("knob-2").getAttribute("d")).toBe("");
  });

  it("renders nothing but an empty path for an empty dataset", () => {
    renderChart([]);

    expect(seriesPath("knob-1").getAttribute("d")).toBe("");
    expect(screen.queryByTestId("time-series-tooltip")).toBeNull();
  });

  it("shows a tooltip with every series value on hover", () => {
    renderChart(rows());

    fireEvent.pointerMove(screen.getByTestId("time-series-chart").parentElement!, {
      clientX: 0,
      clientY: 0
    });

    const tooltip = screen.getByTestId("time-series-tooltip");
    expect(tooltip.textContent).toContain("Master");
    expect(tooltip.textContent).toContain("Browser");
  });

  it("hides the tooltip when the pointer leaves", () => {
    renderChart(rows());
    const container = screen.getByTestId("time-series-chart").parentElement!;

    fireEvent.pointerMove(container, { clientX: 0, clientY: 0 });
    expect(screen.queryByTestId("time-series-tooltip")).not.toBeNull();

    fireEvent.pointerLeave(container);
    expect(screen.queryByTestId("time-series-tooltip")).toBeNull();
  });

  it("keeps the pointer handler harmless with no data", () => {
    renderChart([]);

    fireEvent.pointerMove(screen.getByTestId("time-series-chart").parentElement!, {
      clientX: 40,
      clientY: 10
    });

    expect(screen.queryByTestId("time-series-tooltip")).toBeNull();
  });

  it("keeps a single sample on the canvas instead of dividing by a zero span", () => {
    renderChart([{ x: 5, "knob-1": 50 }]);

    const d = seriesPath("knob-1").getAttribute("d") ?? "";

    expect(d).not.toContain("NaN");
    expect(d).toMatch(/^M[\d.]+,[\d.]+$/);
  });

  it("thins x axis labels so they cannot overlap", () => {
    // 200 ticks across a 640px fallback width would be unreadable; the axis
    // keeps only labels at least MIN_TICK_GAP apart.
    const dense = Array.from({ length: 200 }, (_, index) => ({
      x: index,
      "knob-1": index % 100
    }));

    renderChart(dense, [SERIES[0]]);

    const labels = Array.from(document.querySelectorAll("text")).filter(
      (node) => !node.textContent?.endsWith("%")
    );

    expect(labels.length).toBeGreaterThan(1);
    expect(labels.length).toBeLessThanOrEqual(640 / 28 + 1);
  });
});
