import { describe, expect, it } from "vitest";

import {
  applyNoiseReduction,
  defaultProfile,
  encodeSliderPacket,
  mergeSliderPacket,
  parseSliderPacket,
  resolveFilteredUpdates,
  sliderValueToNormalized
} from "../src/index";

describe("serial protocol parity", () => {
  it("parses newline-terminated payloads", () => {
    expect(parseSliderPacket("512|768|1023|0|256\n")).toEqual({
      kind: "state",
      values: [512, 768, 1023, 0, 256]
    });
  });

  it("ignores NUL boot noise", () => {
    expect(parseSliderPacket("\0\0" + "1|815|697\n")).toEqual({
      kind: "state",
      values: [1, 815, 697]
    });
  });

  it("parses legacy delta payloads", () => {
    expect(parseSliderPacket("P3:820")).toEqual({
      kind: "delta",
      sliderId: 2,
      value: 820
    });
  });

  it("rejects out of range values", () => {
    expect(() => parseSliderPacket("512|2048|0")).toThrow(
      "Invalid slider value: 2048"
    );
  });

  it("encodes packet values", () => {
    expect(encodeSliderPacket([1, 2, 3])).toBe("1|2|3");
  });
});

describe("mixer math parity", () => {
  it("maps full range to normalized volume", () => {
    expect(sliderValueToNormalized(0)).toBe(0);
    expect(sliderValueToNormalized(1023)).toBe(1);
    expect(sliderValueToNormalized(512)).toBeGreaterThan(0.49);
  });

  it("applies default noise reduction", () => {
    expect(applyNoiseReduction("default", 500, 505)).toBe(500);
    expect(applyNoiseReduction("default", 500, 520)).toBe(520);
  });

  it("resolves filtered updates for changed knobs only", () => {
    const current = mergeSliderPacket({}, [512, 768, 1023], 3);
    const updates = resolveFilteredUpdates(defaultProfile, current, {
      0: 500,
      1: 768,
      2: 1000
    });

    expect(updates).toEqual([
      { sliderId: 0, rawValue: 512 },
      { sliderId: 2, rawValue: 1023 }
    ]);
  });
});
