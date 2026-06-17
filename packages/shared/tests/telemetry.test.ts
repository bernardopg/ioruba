import { describe, expect, it } from "vitest";

import {
  createSessionStats,
  knobAveragePercent,
  pushTelemetry,
  updateSessionStats
} from "../src/runtime";
import type { TelemetryPoint } from "../src/types";

function kpoint(tick: number, knobId: number, percent: number): TelemetryPoint {
  return { tick, knobId, rawValue: percent, appliedValue: percent, percent };
}

function point(tick: number): TelemetryPoint {
  return { tick, knobId: 0, rawValue: tick, appliedValue: tick, percent: tick % 101 };
}

function points(from: number, count: number): TelemetryPoint[] {
  return Array.from({ length: count }, (_, index) => point(from + index));
}

function ticks(series: TelemetryPoint[]): number[] {
  return series.map((entry) => entry.tick);
}

describe("pushTelemetry", () => {
  it("appends when the result still fits the window", () => {
    const result = pushTelemetry(points(0, 3), points(3, 2), 10);
    expect(ticks(result)).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps only the most recent windowSize points when exceeding it", () => {
    const result = pushTelemetry(points(0, 8), points(8, 4), 5);
    expect(result).toHaveLength(5);
    expect(ticks(result)).toEqual([7, 8, 9, 10, 11]);
  });

  it("drops the entire old buffer when new points alone exceed the window", () => {
    const result = pushTelemetry(points(0, 3), points(100, 7), 4);
    expect(result).toHaveLength(4);
    expect(ticks(result)).toEqual([103, 104, 105, 106]);
  });

  it("returns the same reference when nothing is appended and it fits", () => {
    const existing = points(0, 4);
    expect(pushTelemetry(existing, [], 10)).toBe(existing);
  });

  it("trims an oversized buffer even when nothing is appended", () => {
    const existing = points(0, 8);
    const result = pushTelemetry(existing, [], 3);
    expect(ticks(result)).toEqual([5, 6, 7]);
  });

  it("returns an empty buffer when the window is disabled", () => {
    expect(pushTelemetry(points(0, 5), points(5, 2), 0)).toEqual([]);
  });

  it("preserves the empty reference when window is disabled and buffer is empty", () => {
    const empty: TelemetryPoint[] = [];
    expect(pushTelemetry(empty, [], 0)).toBe(empty);
  });

  it("matches the naive merge-and-slice semantics across sizes", () => {
    const naive = (
      telemetry: TelemetryPoint[],
      next: TelemetryPoint[],
      windowSize: number
    ) => {
      if (windowSize <= 0) return [];
      const merged = [...telemetry, ...next];
      return merged.slice(Math.max(0, merged.length - windowSize));
    };

    for (const windowSize of [1, 2, 5, 10]) {
      for (let oldLen = 0; oldLen <= 12; oldLen++) {
        for (let newLen = 0; newLen <= 6; newLen++) {
          const telemetry = points(0, oldLen);
          const next = points(1000, newLen);
          expect(ticks(pushTelemetry(telemetry, next, windowSize))).toEqual(
            ticks(naive(telemetry, next, windowSize))
          );
        }
      }
    }
  });
});

describe("updateSessionStats", () => {
  it("returns the same reference when there are no new points", () => {
    const stats = createSessionStats();
    expect(updateSessionStats(stats, [])).toBe(stats);
  });

  it("accumulates per-knob min/max/avg/last across calls", () => {
    let stats = createSessionStats();
    stats = updateSessionStats(stats, [kpoint(1, 0, 20), kpoint(1, 1, 80)]);
    stats = updateSessionStats(stats, [kpoint(2, 0, 60), kpoint(2, 0, 40)]);

    expect(stats.sampleCount).toBe(4);
    expect(stats.firstTick).toBe(1);
    expect(stats.lastTick).toBe(2);

    const knob0 = stats.perKnob[0];
    expect(knob0.sampleCount).toBe(3);
    expect(knob0.minPercent).toBe(20);
    expect(knob0.maxPercent).toBe(60);
    expect(knob0.lastPercent).toBe(40);
    expect(knobAveragePercent(knob0)).toBeCloseTo((20 + 60 + 40) / 3);

    const knob1 = stats.perKnob[1];
    expect(knob1.sampleCount).toBe(1);
    expect(knobAveragePercent(knob1)).toBe(80);
  });

  it("survives a window that would have trimmed older points", () => {
    let stats = createSessionStats();
    // Far more points than any window would keep, but the aggregate persists.
    for (let tick = 0; tick < 500; tick++) {
      stats = updateSessionStats(stats, [kpoint(tick, 0, tick % 101)]);
    }
    expect(stats.sampleCount).toBe(500);
    expect(stats.perKnob[0].minPercent).toBe(0);
    expect(stats.perKnob[0].maxPercent).toBe(100);
  });

  it("does not mutate the previous stats object", () => {
    const stats = createSessionStats();
    const next = updateSessionStats(stats, [kpoint(1, 0, 50)]);
    expect(stats.sampleCount).toBe(0);
    expect(stats.perKnob[0]).toBeUndefined();
    expect(next).not.toBe(stats);
  });

  it("reports a zero average for an empty knob entry", () => {
    expect(
      knobAveragePercent({
        knobId: 0,
        sampleCount: 0,
        minPercent: 0,
        maxPercent: 0,
        sumPercent: 0,
        lastPercent: 0
      })
    ).toBe(0);
  });
});
