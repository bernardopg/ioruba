import type { SliderPacket } from "./types";

const legacyPattern = /^P(?<slider>\d+):(?<value>\d+)$/i;

export function sanitizeSerialPayload(payload: string | Uint8Array): string {
  const text =
    typeof payload === "string"
      ? payload
      : new TextDecoder().decode(payload);

  return text.replace(/\0/g, "").trim();
}

export function parseSliderPacket(payload: string | Uint8Array): SliderPacket {
  const clean = sanitizeSerialPayload(payload);

  if (!clean) {
    throw new Error("Empty slider data");
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
