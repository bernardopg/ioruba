import { MAX_SUPPORTED_ADC_VALUE } from "./mixer";
import type {
  ControlEventPacket,
  FirmwareCalibration,
  FirmwareControllerConfig,
  FirmwareInfo,
  FirmwarePinMap,
  MixerProfile,
  SerialPacket,
  SliderPacket
} from "./types";

const handshakePrefix = "HELLO";
const controlEventPrefix = "EV";

/**
 * Versão de protocolo serial que este desktop entende plenamente. O firmware
 * atual (`ioruba-controller.ino`) emite `protocol=2`. Quando o handshake reporta
 * uma versão diferente, o app continua funcionando para frames de knob básicos,
 * mas marca `protocolSupported = false` para que a UI possa avisar sobre firmware
 * possivelmente incompatível (mais novo ou mais antigo que o esperado).
 */
export const SUPPORTED_PROTOCOL_VERSION = 2;

function parseLegacySliderPacket(payload: string): { sliderId: number; value: number } | null {
  if (!payload.length || payload[0] !== "P") {
    return null;
  }

  const separatorIndex = payload.indexOf(":");
  if (separatorIndex <= 1 || separatorIndex === payload.length - 1) {
    return null;
  }

  const sliderIdText = payload.slice(1, separatorIndex);
  const valueText = payload.slice(separatorIndex + 1);
  if (!/^[0-9]+$/.test(sliderIdText) || !/^[0-9]+$/.test(valueText)) {
    return null;
  }

  return {
    sliderId: Number.parseInt(sliderIdText, 10) - 1,
    value: Number.parseInt(valueText, 10)
  };
}

export function sanitizeSerialPayload(payload: string | Uint8Array): string {
  const text =
    typeof payload === "string"
      ? payload
      : new TextDecoder().decode(payload);

  return text.split("\0").join("").trim();
}

export function parseSliderPacket(payload: string | Uint8Array): SliderPacket {
  const packet = parseSerialPacket(payload);

  if (packet.kind === "handshake") {
    throw new Error("Expected slider packet, received handshake data");
  }

  if (packet.kind === "control") {
    throw new Error("Expected slider packet, received control event data");
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

  const controlEvent = parseControlEventPacket(clean);
  if (controlEvent) {
    return controlEvent;
  }

  const legacyMatch = parseLegacySliderPacket(clean);
  if (legacyMatch) {
    const sliderId = legacyMatch.sliderId;
    const value = legacyMatch.value;
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
  // O frame serial é stateless: não conhece o `adcBits` da placa no momento da
  // análise. Aceita qualquer valor bruto dentro do teto suportado (16-bit); a
  // normalização para porcentagem usa o `adcMax` real no runtime. Isso permite
  // placas de 12-bit (ESP32/RP2040 → 0..4095) sem travar em 1023.
  if (!Number.isInteger(value) || value < 0 || value > MAX_SUPPORTED_ADC_VALUE) {
    throw new Error(`Invalid slider value: ${label}`);
  }
}

function parsePinLabel(value: string, label: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return value;
}

function parsePinList(value: string, label: string): string[] {
  if (value === "none") {
    return [];
  }

  const pins = value.split(",").map((entry) => parsePinLabel(entry.trim(), label));
  if (pins.length === 0 || new Set(pins).size !== pins.length) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return pins;
}

function parseEncoderPinList(value: string): FirmwarePinMap["encoderPins"] {
  if (value === "none") {
    return [];
  }

  const pins = value.split(",").map((entry) => {
    const pair = entry.trim().split("/");
    if (pair.length !== 2) {
      throw new Error(`Invalid encoder pins: ${entry}`);
    }
    const [a, b] = pair.map((pin) => parsePinLabel(pin.trim(), "encoder pin"));
    if (a === b) {
      throw new Error(`Invalid encoder pins: ${entry}`);
    }
    return { a, b };
  });
  const flattened = pins.flatMap(({ a, b }) => [a, b]);
  if (pins.length === 0 || new Set(flattened).size !== flattened.length) {
    throw new Error(`Invalid encoder pins: ${value}`);
  }
  return pins;
}

function parseFirmwarePinMap(
  fields: Record<string, string>,
  knobCount: number | null,
  buttonCount: number | null,
  encoderCount: number | null,
): FirmwarePinMap | null {
  const values = [fields.knobpins, fields.buttonpins, fields.encoderpins];
  if (values.every((value) => value === undefined)) {
    return null;
  }
  if (values.some((value) => value === undefined)) {
    throw new Error("Incomplete handshake pin map");
  }
  if (knobCount === null || buttonCount === null || encoderCount === null) {
    throw new Error("Handshake pin map requires input counts");
  }

  const pinMap = {
    knobPins: parsePinList(fields.knobpins!, "knob pins"),
    buttonPins: parsePinList(fields.buttonpins!, "button pins"),
    encoderPins: parseEncoderPinList(fields.encoderpins!),
  };
  if (
    pinMap.knobPins.length !== knobCount ||
    pinMap.buttonPins.length !== buttonCount ||
    pinMap.encoderPins.length !== encoderCount
  ) {
    throw new Error("Handshake pin map count does not match enabled inputs");
  }

  const allPins = [
    ...pinMap.knobPins,
    ...pinMap.buttonPins,
    ...pinMap.encoderPins.flatMap(({ a, b }) => [a, b]),
  ];
  if (new Set(allPins).size !== allPins.length) {
    throw new Error("Handshake pin map contains overlapping pins");
  }
  return pinMap;
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

  const parseInputCount = (field: "knobs" | "buttons" | "encoders"): number | null => {
    const value = fields[field];
    if (value === undefined) {
      return null;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`Invalid handshake ${field} count: ${value}`);
    }
    return parsed;
  };

  const knobCount = parseInputCount("knobs");
  const buttonCount = parseInputCount("buttons");
  const encoderCount = parseInputCount("encoders");
  const pinMap = parseFirmwarePinMap(fields, knobCount, buttonCount, encoderCount);

  const mcu = fields.mcu ?? null;

  const adcBitsValue = fields.adcbits;
  let adcBits: number | null = null;
  if (adcBitsValue !== undefined) {
    const parsedAdcBits = Number.parseInt(adcBitsValue, 10);
    if (!Number.isInteger(parsedAdcBits) || parsedAdcBits < 1 || parsedAdcBits > 16) {
      throw new Error(`Invalid handshake adc bits: ${adcBitsValue}`);
    }

    adcBits = parsedAdcBits;
  }

  const controllerConfig = parseControllerConfig(fields);

  return {
    boardName,
    firmwareVersion,
    protocolVersion,
    protocolSupported: protocolVersion === SUPPORTED_PROTOCOL_VERSION,
    knobCount,
    buttonCount,
    encoderCount,
    pinMap,
    mcu,
    adcBits,
    controllerConfig
  };
}

function parseControlEventPacket(payload: string): ControlEventPacket | null {
  const normalized = payload.trimStart();
  if (!normalized.toUpperCase().startsWith(`${controlEventPrefix} `)) {
    return null;
  }

  const eventPayload = normalized.slice(controlEventPrefix.length).trimStart();
  if (!eventPayload) {
    throw new Error("Missing control event payload");
  }

  const fields = parseKeyValueFields(eventPayload, "control event");
  const input = fields.input ?? fields.type;
  const idValue = fields.id;

  if (input !== "button" && input !== "encoder") {
    throw new Error(`Invalid control event input: ${input ?? "missing"}`);
  }

  if (idValue === undefined) {
    throw new Error("Missing control event id");
  }

  const controlId = parseNonNegativeInteger(idValue, "control event id");

  if (input === "button") {
    const event = fields.event;
    if (event !== "press" && event !== "release") {
      throw new Error(`Invalid button event: ${event ?? "missing"}`);
    }

    return {
      kind: "control",
      input,
      controlId,
      event
    };
  }

  const deltaValue = fields.delta;
  if (deltaValue === undefined) {
    throw new Error("Missing encoder delta");
  }

  const delta = parseSignedInteger(deltaValue, "encoder delta");
  if (delta === 0) {
    throw new Error("Invalid encoder delta: 0");
  }

  return {
    kind: "control",
    input,
    controlId,
    delta
  };
}

function parseKeyValueFields(payload: string, label: string): Record<string, string> {
  return payload
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) {
        throw new Error(`Invalid ${label} field: ${entry}`);
      }

      const key = entry.slice(0, separatorIndex).trim().toLowerCase();
      const value = entry.slice(separatorIndex + 1).trim().toLowerCase();
      if (!value) {
        throw new Error(`Missing ${label} value for ${key}`);
      }

      accumulator[key] = value;
      return accumulator;
    }, {});
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

function parseSignedInteger(value: string, label: string): number {
  if (!/^-?[0-9]+$/.test(value)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
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
