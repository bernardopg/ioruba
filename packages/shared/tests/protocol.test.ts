import { describe, expect, it } from "vitest";

import {
  applyNoiseReduction,
  buildRuntimeSnapshot,
  buildFirmwareControllerConfig,
  defaultProfile,
  encodeFirmwareConfigCommand,
  emptyAudioInventory,
  encodeSliderPacket,
  firmwareConfigMatchesProfile,
  mergeSliderPacket,
  parseSerialPacket,
  parseSliderPacket,
  resolveFilteredUpdates,
  sliderValueToPercent,
  sliderValueToNormalized,
} from "../src/index";

describe("serial protocol parity", () => {
  it("parses newline-terminated payloads", () => {
    expect(parseSliderPacket("512|768|1023|0|256\n")).toEqual({
      kind: "state",
      values: [512, 768, 1023, 0, 256],
    });
  });

  it("ignores NUL boot noise", () => {
    expect(parseSliderPacket("\0\0" + "1|815|697\n")).toEqual({
      kind: "state",
      values: [1, 815, 697],
    });
  });

  it("parses legacy delta payloads", () => {
    expect(parseSliderPacket("P3:820")).toEqual({
      kind: "delta",
      sliderId: 2,
      value: 820,
    });
  });

  it("rejects out of range values", () => {
    expect(() => parseSliderPacket("512|2048|0")).toThrow(
      "Invalid slider value: 2048",
    );
  });

  it("encodes packet values", () => {
    expect(encodeSliderPacket([1, 2, 3])).toBe("1|2|3");
  });

  it("parses firmware handshake packets", () => {
    expect(
      parseSerialPacket(
        "HELLO board=Ioruba Nano; fw=0.5.0; protocol=2; knobs=3; threshold=4; deadzone=7; smooth=75; mins=0,12,24; maxs=1000,1010,1023",
      ),
    ).toEqual({
      kind: "handshake",
      info: {
        boardName: "Ioruba Nano",
        firmwareVersion: "0.5.0",
        protocolVersion: 2,
        knobCount: 3,
        controllerConfig: {
          changeThreshold: 4,
          edgeDeadzone: 7,
          smoothingStrength: 75,
          calibrations: [
            { minRaw: 0, maxRaw: 1000 },
            { minRaw: 12, maxRaw: 1010 },
            { minRaw: 24, maxRaw: 1023 },
          ],
        },
      },
    });
  });

  it("rejects handshake payloads when parsed as slider frames", () => {
    expect(() =>
      parseSliderPacket(
        "HELLO board=Ioruba Nano; fw=0.5.0; protocol=2; knobs=3",
      ),
    ).toThrow("Expected slider packet, received handshake data");
  });

  it("builds a firmware config command from the active profile", () => {
    expect(encodeFirmwareConfigCommand(defaultProfile)).toBe(
      "CONFIG threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023",
    );
  });

  it("compares firmware config reported by the controller with the active profile", () => {
    const firmwareInfo = {
      boardName: "Ioruba Nano",
      firmwareVersion: "0.5.0",
      protocolVersion: 2,
      knobCount: 3,
      controllerConfig: buildFirmwareControllerConfig(defaultProfile),
    };

    expect(firmwareConfigMatchesProfile(defaultProfile, firmwareInfo)).toBe(
      true,
    );
  });
});

describe("mixer math parity", () => {
  it("maps full range to normalized volume", () => {
    expect(sliderValueToNormalized(0)).toBe(0);
    expect(sliderValueToNormalized(1023)).toBe(1);
    expect(sliderValueToNormalized(1016)).toBe(1);
    expect(sliderValueToNormalized(7)).toBe(0);
    expect(sliderValueToNormalized(512)).toBeGreaterThan(0.49);
  });

  it("maps the top end of the ADC range to 100%", () => {
    expect(sliderValueToPercent(1023)).toBe(100);
    expect(sliderValueToPercent(1016)).toBe(100);
    expect(sliderValueToPercent(1015)).toBe(99);
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
      2: 1000,
    });

    expect(updates).toEqual([
      { sliderId: 0, rawValue: 512 },
      { sliderId: 2, rawValue: 1023 },
    ]);
  });

  it("uses the live raw reading for display percent even if the applied value is lagging", () => {
    const snapshot = buildRuntimeSnapshot({
      profile: defaultProfile,
      status: "connected",
      statusText: "ok",
      availablePorts: ["/dev/ttyUSB0"],
      connectionPort: "/dev/ttyUSB0",
      lastSerialLine: "1016|0|0",
      demoMode: false,
      currentValues: { 0: 1016, 1: 0, 2: 0 },
      appliedValues: { 0: 1008, 1: 0, 2: 0 },
      outcomes: {},
      telemetry: [],
      audioInventory: emptyAudioInventory,
    });

    expect(snapshot.knobs[0]?.rawValue).toBe(1016);
    expect(snapshot.knobs[0]?.appliedRawValue).toBe(1008);
    expect(snapshot.knobs[0]?.percent).toBe(100);
  });
});
