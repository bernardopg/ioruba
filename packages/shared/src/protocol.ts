import type {
  FirmwareCalibration,
  FirmwareControllerConfig,
  FirmwareInfo,
  MixerProfile,
  SerialPacket,
  SliderPacket
} from "./types";

const legacyPattern = /^P(\d+):(\d+)$/i;
const handshakePrefix = "HELLO";

export function sanitizeSerialPayload(payload: string | Uint8Array): string {
  const text =
    typeof payload === "string"
      ? payload
      : new TextDecoder().decode(payload);

  return text.replace(/\0/g, "").trim();
}

export function parseSliderPacket(payload: string | Uint8Array): SliderPacket {
  const packet = parseSerialPacket(payload);

  if (packet.kind === "handshake") {
    throw new Error("Expected slider packet, received handshake data");
  }

  return packet;
}

export function parseSerialPacket(payload: string | Uint8Array): SerialPacket {
  const clean = sanitizeSerialPayload(payload);

  if (!clean) {
    throw new Error("Empty slider data");
  }

  const handshake = parseHandshakePacket(clean);
  if (handshake) {
    return {
      kind: "handshake",
      info: handshake
    };
  }

  const legacyMatch = clean.match(legacyPattern);
  if (legacyMatch) {
    const sliderId = Number.parseInt(legacyMatch[1], 10) - 1;
    const value = Number.parseInt(legacyMatch[2], 10);
    assertSliderValue(value, clean);

    if (sliderId < 0) {
      throw new Error("Invalid legacy slider id");
    }
    return { kind: "delta", sliderId, value };
  }

  const values = clean
    .split("|")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const value = Number.parseInt(chunk, 10);
      assertSliderValue(value, chunk);
      return value;
    });

  if (values.length === 0) {
    throw new Error("Empty slider data");
  }

  return { kind: "state", values };
}

export function encodeSliderPacket(values: number[]): string {
  values.forEach((value) => assertSliderValue(value, String(value)));
  return values.join("|");
}

export function buildFirmwareControllerConfig(
  profile: MixerProfile
): FirmwareControllerConfig {
  return {
    changeThreshold: profile.firmware.changeThreshold,
    edgeDeadzone: profile.firmware.edgeDeadzone,
    smoothingStrength: profile.firmware.smoothingStrength,
    calibrations: profile.sliders
      .slice()
      .sort((left, right) => left.id - right.id)
      .map((slider) => ({
        minRaw: slider.calibration?.minRaw ?? 0,
        maxRaw: slider.calibration?.maxRaw ?? 1023
      }))
  };
}

export function encodeFirmwareConfigCommand(profile: MixerProfile): string {
  const config = buildFirmwareControllerConfig(profile);

  return [
    `CONFIG threshold=${config.changeThreshold}`,
    `deadzone=${config.edgeDeadzone}`,
    `smooth=${config.smoothingStrength}`,
    `mins=${config.calibrations.map((entry) => entry.minRaw).join(",")}`,
    `maxs=${config.calibrations.map((entry) => entry.maxRaw).join(",")}`
  ].join("; ");
}

export function firmwareConfigMatchesProfile(
  profile: MixerProfile,
  firmwareInfo: FirmwareInfo | null
): boolean {
  if (!firmwareInfo?.controllerConfig) {
    return false;
  }

  const expected = buildFirmwareControllerConfig(profile);
  const actual = firmwareInfo.controllerConfig;

  if (
    expected.changeThreshold !== actual.changeThreshold ||
    expected.edgeDeadzone !== actual.edgeDeadzone ||
    expected.smoothingStrength !== actual.smoothingStrength ||
    expected.calibrations.length !== actual.calibrations.length
  ) {
    return false;
  }

  return expected.calibrations.every((entry, index) => {
    const candidate = actual.calibrations[index];
    return (
      candidate?.minRaw === entry.minRaw &&
      candidate?.maxRaw === entry.maxRaw
    );
  });
}

function assertSliderValue(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 1023) {
    throw new Error(`Invalid slider value: ${label}`);
  }
}

function parseHandshakePacket(payload: string): FirmwareInfo | null {
  const normalized = payload.trimStart();
  if (!normalized.toUpperCase().startsWith(`${handshakePrefix} `)) {
    return null;
  }

  const handshakePayload = normalized.slice(handshakePrefix.length).trimStart();
  if (!handshakePayload) {
    return null;
  }

  const fields = handshakePayload
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) {
        throw new Error(`Invalid handshake field: ${entry}`);
      }

      const key = entry.slice(0, separatorIndex).trim().toLowerCase();
      const value = entry.slice(separatorIndex + 1).trim();
      if (!value) {
        throw new Error(`Missing handshake value for ${key}`);
      }

      accumulator[key] = value;
      return accumulator;
    }, {});

  const boardName = fields.board;
  const firmwareVersion = fields.fw ?? fields.version;
  const protocolValue = fields.protocol;

  if (!boardName) {
    throw new Error("Missing handshake board name");
  }

  if (!firmwareVersion) {
    throw new Error("Missing handshake firmware version");
  }

  if (!protocolValue) {
    throw new Error("Missing handshake protocol version");
  }

  const protocolVersion = Number.parseInt(protocolValue, 10);
  if (!Number.isInteger(protocolVersion) || protocolVersion < 1) {
    throw new Error(`Invalid handshake protocol version: ${protocolValue}`);
  }

  const knobValue = fields.knobs;
  let knobCount: number | null = null;
  if (knobValue !== undefined) {
    const parsedKnobCount = Number.parseInt(knobValue, 10);
    if (!Number.isInteger(parsedKnobCount) || parsedKnobCount < 0) {
      throw new Error(`Invalid handshake knob count: ${knobValue}`);
    }

    knobCount = parsedKnobCount;
  }

  const controllerConfig = parseControllerConfig(fields);

  return {
    boardName,
    firmwareVersion,
    protocolVersion,
    knobCount,
    controllerConfig
  };
}

function parseControllerConfig(
  fields: Record<string, string>
): FirmwareControllerConfig | null {
  if (
    fields.threshold === undefined ||
    fields.deadzone === undefined ||
    fields.smooth === undefined
  ) {
    return null;
  }

  const changeThreshold = parseNonNegativeInteger(
    fields.threshold,
    "handshake threshold"
  );
  const edgeDeadzone = parseNonNegativeInteger(
    fields.deadzone,
    "handshake deadzone"
  );
  const smoothingStrength = parsePercentInteger(
    fields.smooth,
    "handshake smooth"
  );

  const mins = parseCalibrationList(fields.mins, "mins");
  const maxs = parseCalibrationList(fields.maxs, "maxs");
  const calibrationCount = Math.max(mins.length, maxs.length);
  const calibrations: FirmwareCalibration[] = [];

  for (let index = 0; index < calibrationCount; index += 1) {
    const minRaw = mins[index] ?? 0;
    const maxRaw = maxs[index] ?? 1023;

    if (minRaw >= maxRaw) {
      throw new Error(
        `Invalid handshake calibration range at knob ${index}: ${minRaw}-${maxRaw}`
      );
    }

    calibrations.push({
      minRaw,
      maxRaw
    });
  }

  return {
    changeThreshold,
    edgeDeadzone,
    smoothingStrength,
    calibrations
  };
}

function parseCalibrationList(value: string | undefined, label: string): number[] {
  if (value === undefined) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => parseNonNegativeInteger(entry, `handshake ${label}`));
}

function parseNonNegativeInteger(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return parsed;
}

function parsePercentInteger(value: string, label: string): number {
  const parsed = parseNonNegativeInteger(value, label);
  if (parsed > 100) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return parsed;
}
