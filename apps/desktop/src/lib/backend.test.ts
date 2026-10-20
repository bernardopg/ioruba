import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "@ioruba/shared";
import { applySliderTargetsBatch } from "./backend";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true, invoke }));

describe("audio IPC ADC scaling", () => {
  beforeEach(() => invoke.mockReset().mockResolvedValue({ outcomes: {} }));
  it("preserves the midpoint of a 12-bit controller", async () => {
    await applySliderTargetsBatch(defaultProfile, [{ sliderId: 0, rawValue: 2048 }], 4095);
    expect(invoke.mock.calls[0][1].request.sliders[0].normalizedValue).toBeCloseTo(2048 / 4095);
  });
  it("keeps inversion and 10-bit controllers working", async () => {
    const profile = structuredClone(defaultProfile);
    profile.sliders[0].inverted = true;
    await applySliderTargetsBatch(profile, [{ sliderId: 0, rawValue: 1023 }], 1023);
    expect(invoke.mock.calls[0][1].request.sliders[0].normalizedValue).toBe(0);
  });
  it("does not invoke the backend for an empty batch", async () => {
    expect(await applySliderTargetsBatch(defaultProfile, [])).toEqual({});
    expect(invoke).not.toHaveBeenCalled();
  });
});
