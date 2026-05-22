import { describe, expect, it } from "vitest";

import { defaultPersistedState, defaultProfile } from "@ioruba/shared";

import {
  classifySerialOpenError,
  normalizeSerialPorts,
  resolveSerialPort,
  shouldAutoConnect,
  sameSerialPorts
} from "./serial";

describe("serial helpers", () => {
  it("normalizes serial port lists from plugin shaped payloads", () => {
    expect(
      normalizeSerialPorts([
        "/dev/ttyUSB0",
        { port_name: "/dev/ttyACM0" },
        { path: "/dev/ttyS1" }
      ])
    ).toEqual(["/dev/ttyUSB0", "/dev/ttyACM0"]);
  });

  it("ranks real USB serial devices ahead of onboard ttyS ports", () => {
    expect(
      normalizeSerialPorts({
        "/dev/ttyS13": {
          path: "/dev/ttyS13",
          manufacturer: "Unknown",
          pid: "Unknown",
          product: "Unknown",
          serial_number: "Unknown",
          type: "PCI",
          vid: "Unknown"
        },
        "/dev/ttyUSB0": {
          path: "/dev/ttyUSB0",
          manufacturer: "FTDI",
          pid: "6001",
          product: "FT232R USB UART",
          serial_number: "A5069RR4",
          type: "USB",
          vid: "0403"
        }
      })
    ).toEqual(["/dev/ttyUSB0"]);
  });

  it("uses the active profile for auto connect and port resolution", () => {
    const persisted = {
      ...defaultPersistedState,
      profiles: [
        { ...defaultProfile, id: "first", serial: { ...defaultProfile.serial, autoConnect: false } },
        {
          ...defaultProfile,
          id: "second",
          serial: {
            ...defaultProfile.serial,
            autoConnect: true,
            preferredPort: "/dev/ttyUSB9"
          }
        }
      ],
      selectedProfileId: "second",
      lastPort: "/dev/ttyUSB0"
    };

    expect(shouldAutoConnect(persisted)).toBe(true);
    expect(resolveSerialPort(persisted, ["/dev/ttyUSB0", "/dev/ttyUSB9"])).toBe(
      "/dev/ttyUSB9"
    );
  });

  it("falls back to the best detected serial device when no explicit port is set", () => {
    const persisted = {
      ...defaultPersistedState,
      profiles: [
        {
          ...defaultProfile,
          id: "active",
          serial: {
            ...defaultProfile.serial,
            preferredPort: null
          }
        }
      ],
      selectedProfileId: "active",
      lastPort: null
    };

    expect(
      resolveSerialPort(persisted, ["/dev/ttyS13", "/dev/ttyUSB0"])
    ).toBe("/dev/ttyUSB0");
  });

  it("treats the same port set as unchanged even if order differs", () => {
    expect(
      sameSerialPorts(["/dev/ttyUSB0", "/dev/ttyACM0"], ["/dev/ttyACM0", "/dev/ttyUSB0"])
    ).toBe(true);
  });
});

describe("classifySerialOpenError", () => {
  const port = "/dev/ttyUSB0";

  it("classifies EBUSY / device or resource busy as busy", () => {
    const result = classifySerialOpenError(
      new Error("Serial port error: Device or resource busy"),
      port
    );
    expect(result.kind).toBe("busy");
    expect(result.message).toContain(port);
    expect(result.message).toContain("em uso");
    expect(result.detail).toContain("Device or resource busy");
  });

  it("classifies NoDevice variant as busy", () => {
    const result = classifySerialOpenError(
      new Error("Serial port error: No device"),
      port
    );
    expect(result.kind).toBe("busy");
  });

  it("classifies EACCES / permission denied as permission", () => {
    const result = classifySerialOpenError(
      new Error("IO error: Permission denied"),
      port
    );
    expect(result.kind).toBe("permission");
    expect(result.message).toContain("dialout");
    expect(result.detail).toContain("Permission denied");
  });

  it("classifies ENOENT / no such file as not_found", () => {
    const result = classifySerialOpenError(
      new Error("IO error: No such file or directory"),
      port
    );
    expect(result.kind).toBe("not_found");
    expect(result.message).toContain("não encontrada");
  });

  it("falls back to unknown for unrecognised errors", () => {
    const result = classifySerialOpenError(
      new Error("Something completely unexpected"),
      port
    );
    expect(result.kind).toBe("unknown");
    expect(result.detail).toContain("Something completely unexpected");
  });

  it("accepts a raw string as input", () => {
    const result = classifySerialOpenError("Permission denied (os error 13)", port);
    expect(result.kind).toBe("permission");
  });
});
