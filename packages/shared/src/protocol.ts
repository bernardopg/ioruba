import type { FirmwareInfo, SerialPacket, SliderPacket } from "./types";

const legacyPattern = /^P(?<slider>\d+):(?<value>\d+)$/i;
const handshakePattern = /^HELLO\s+(?<payload>.+)$/i;

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
  if (legacyMatch?.groups) {
    const sliderId = Number.parseInt(legacyMatch.groups.slider, 10) - 1;
    const value = Number.parseInt(legacyMatch.groups.value, 10);
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

function assertSliderValue(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 1023) {
    throw new Error(`Invalid slider value: ${label}`);
  }
}

function parseHandshakePacket(payload: string): FirmwareInfo | null {
  const match = payload.match(handshakePattern);
  if (!match?.groups?.payload) {
    return null;
  }

  const fields = match.groups.payload
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

  return {
    boardName,
    firmwareVersion,
    protocolVersion,
    knobCount
  };
}
