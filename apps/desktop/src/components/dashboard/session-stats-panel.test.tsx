// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSessionStats, updateSessionStats } from "@ioruba/shared";

import { SessionStatsPanel } from "@/components/dashboard/session-stats-panel";

afterEach(() => {
  cleanup();
});

const knobs = [
  { id: 0, name: "Master" },
  { id: 1, name: "Voice" }
];

function point(knobId: number, percent: number, tick = 1) {
  return { tick, knobId, rawValue: percent, appliedValue: percent, percent };
}

describe("SessionStatsPanel", () => {
  it("shows the empty state and disables reset with no samples", () => {
    const onReset = vi.fn();
    render(
      <SessionStatsPanel
        knobs={knobs}
        language="pt-BR"
        onReset={onReset}
        stats={createSessionStats()}
      />
    );

    expect(screen.getByText(/nenhuma amostra ainda/i)).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /resetar estatísticas/i })
    ).toHaveProperty("disabled", true);
  });

  it("renders per-knob aggregates and fires reset", () => {
    const onReset = vi.fn();
    let stats = createSessionStats();
    stats = updateSessionStats(stats, [point(0, 20), point(0, 80, 2)]);

    render(
      <SessionStatsPanel
        knobs={knobs}
        language="pt-BR"
        onReset={onReset}
        stats={stats}
      />
    );

    const masterRow = screen.getByText("Master").closest("tr");
    expect(masterRow).not.toBeNull();
    // sampleCount, min, avg, max, current for knob 0 (20 then 80).
    expect(masterRow?.textContent).toContain("2");
    expect(masterRow?.textContent).toContain("20%");
    expect(masterRow?.textContent).toContain("50%");
    expect(masterRow?.textContent).toContain("80%");

    // Knob 1 had no samples, so it is omitted from the table.
    expect(screen.queryByText("Voice")).toBeNull();

    const resetButton = screen.getByRole("button", {
      name: /resetar estatísticas/i
    });
    fireEvent.click(resetButton);
    expect(onReset).toHaveBeenCalledOnce();
  });
});
