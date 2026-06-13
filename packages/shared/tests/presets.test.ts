import { describe, expect, it } from "vitest";

import { defaultProfile } from "../src/defaults";
import { buildPresetProfile, findPreset, MIXER_PRESETS } from "../src/presets";

describe("mixer presets", () => {
  it("exposes the expected preset keys", () => {
    expect(MIXER_PRESETS.map((preset) => preset.key)).toEqual([
      "streaming",
      "calls",
      "music"
    ]);
  });

  it("every preset maps exactly the three hardware knobs", () => {
    for (const preset of MIXER_PRESETS) {
      expect(preset.sliders).toHaveLength(3);
    }
  });

  it("findPreset resolves a known key and rejects unknown ones", () => {
    expect(findPreset("music")?.name).toBe("Música");
    expect(findPreset("nope")).toBeUndefined();
  });

  it("builds a complete profile from a preset and base profile", () => {
    const preset = findPreset("streaming");
    expect(preset).toBeDefined();
    if (!preset) return;

    const profile = buildPresetProfile(preset, defaultProfile, "preset-id", "Streaming");

    expect(profile.id).toBe("preset-id");
    expect(profile.name).toBe("Streaming");
    // Slider ids are normalized to 0..n and full-range calibration applied.
    expect(profile.sliders.map((slider) => slider.id)).toEqual([0, 1, 2]);
    for (const slider of profile.sliders) {
      expect(slider.calibration).toEqual({ minRaw: 0, maxRaw: 1023 });
    }
    // First knob is always the master output.
    expect(profile.sliders[0].targets).toEqual([{ kind: "master" }]);
    // Serial/audio/firmware/ui are inherited from the base profile.
    expect(profile.serial).toEqual(defaultProfile.serial);
    expect(profile.audio).toEqual(defaultProfile.audio);
    expect(profile.firmware).toEqual(defaultProfile.firmware);
  });

  it("does not mutate the base profile or share slider references", () => {
    const preset = findPreset("calls");
    if (!preset) return;

    const profile = buildPresetProfile(preset, defaultProfile, "id", "Chamadas");
    profile.sliders[0].name = "mutated";
    profile.serial.baudRate = 1;

    expect(defaultProfile.sliders[0].name).not.toBe("mutated");
    expect(defaultProfile.serial.baudRate).not.toBe(1);
  });
});
