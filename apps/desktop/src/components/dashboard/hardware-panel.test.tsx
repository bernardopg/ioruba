// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HardwarePanel } from "@/components/dashboard/hardware-panel";
import type { FirmwareInfo } from "@ioruba/shared";

const firmware: FirmwareInfo = {
  boardName: "Ioruba Pico",
  firmwareVersion: "0.5.0",
  protocolVersion: 2,
  protocolSupported: true,
  knobCount: 3,
  buttonCount: 2,
  encoderCount: 1,
  pinMap: {
    knobPins: ["A0", "A1", "A2"],
    buttonPins: ["GP2", "GP3"],
    encoderPins: [{ a: "GP10", b: "GP11" }],
  },
  mcu: "RP2040",
  adcBits: 12,
  controllerConfig: {
    changeThreshold: 4,
    edgeDeadzone: 7,
    smoothingStrength: 75,
    calibrations: [
      { minRaw: 0, maxRaw: 4095 },
      { minRaw: 10, maxRaw: 4090 },
      { minRaw: 0, maxRaw: 4095 }
    ]
  }
};

afterEach(cleanup);

describe("HardwarePanel", () => {
  it("surfaces board, MCU and 12-bit ADC range from the firmware handshake", () => {
    render(<HardwarePanel firmware={firmware} language="pt-BR" />);

    expect(screen.getByText("Ioruba Pico")).not.toBeNull();
    expect(screen.getByText("RP2040")).not.toBeNull();
    expect(screen.getByText("12-bit")).not.toBeNull();
    expect(screen.getByText("0–4095")).not.toBeNull();
    expect(screen.getByText(/pinagem ativa/i)).not.toBeNull();
    expect(screen.getByText("GP2")).not.toBeNull();
    expect(screen.getByText("GP10")).not.toBeNull();
    // Calibration rows render the raw min/max per knob.
    expect(screen.getAllByText("4095").length).toBeGreaterThanOrEqual(1);
  });

  it("flags an incompatible protocol", () => {
    render(
      <HardwarePanel
        firmware={{ ...firmware, protocolSupported: false, protocolVersion: 3 }}
        language="pt-BR"
      />
    );

    expect(screen.getByText(/protocolo incompatível/i)).not.toBeNull();
  });

  it("shows an empty state when no controller is connected", () => {
    render(<HardwarePanel firmware={null} language="pt-BR" />);

    expect(screen.getByText(/nenhum controlador conectado/i)).not.toBeNull();
  });

  it("renders English copy when requested", () => {
    render(<HardwarePanel firmware={firmware} language="en" />);

    expect(screen.getByText("Controller")).not.toBeNull();
    expect(screen.getByText("ADC resolution")).not.toBeNull();
  });
});
