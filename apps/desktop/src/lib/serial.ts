import { resolveActiveProfile, type PersistedState } from "@ioruba/shared";

type SerialPortDetails = {
  path: string;
  manufacturer: string | null;
  product: string | null;
  serialNumber: string | null;
  type: string | null;
  pid: string | null;
  vid: string | null;
  sourceIndex: number;
};

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null;
}

function readText(candidate: unknown): string | null {
  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed ? trimmed : null;
}

function readKnownText(candidate: unknown): string | null {
  const value = readText(candidate);
  if (!value || value.toLowerCase() === "unknown") {
    return null;
  }

  return value;
}

function readPortPath(candidate: unknown, fallbackPath: string): string {
  const directPath = readKnownText(candidate);
  if (directPath) {
    return directPath;
  }

  if (!isRecord(candidate)) {
    return fallbackPath;
  }

  return (
    readKnownText(candidate.path) ??
    readKnownText(candidate.port_name) ??
    readKnownText(candidate.portName) ??
    fallbackPath
  );
}

function readPortMetadata(candidate: unknown): Omit<SerialPortDetails, "path" | "sourceIndex"> {
  if (!isRecord(candidate)) {
    return {
      manufacturer: null,
      product: null,
      serialNumber: null,
      type: null,
      pid: null,
      vid: null
    };
  }

  return {
    manufacturer: readText(candidate.manufacturer),
    product: readText(candidate.product),
    serialNumber: readText(candidate.serial_number),
    type: readText(candidate.type),
    pid: readText(candidate.pid),
    vid: readText(candidate.vid)
  };
}

function readSerialPortCandidates(candidate: unknown): SerialPortDetails[] {
  if (Array.isArray(candidate)) {
    return candidate.flatMap((entry, index) => {
      const path = readPortPath(entry, "");
      if (!path) {
        return [];
      }

      return [
        {
          path,
          sourceIndex: index,
          ...readPortMetadata(entry)
        }
      ];
    });
  }

  if (!isRecord(candidate)) {
    return [];
  }

  return Object.entries(candidate).flatMap(([fallbackPath, entry], index) => {
    const path = readPortPath(entry, fallbackPath);
    if (!path) {
      return [];
    }

    return [
      {
        path,
        sourceIndex: index,
        ...readPortMetadata(entry)
      }
    ];
  });
}

function hasKnownText(candidate: string | null): boolean {
  return candidate !== null && candidate.toLowerCase() !== "unknown";
}

function hasUsbHints(candidate: SerialPortDetails): boolean {
  return (
    candidate.type?.toLowerCase() === "usb" ||
    hasKnownText(candidate.serialNumber) ||
    hasKnownText(candidate.pid) ||
    hasKnownText(candidate.vid) ||
    (candidate.manufacturer !== null &&
      /arduino|ftdi|ch340|ch341|cp210|usb serial|usbserial/i.test(candidate.manufacturer)) ||
    (candidate.product !== null &&
      /arduino|ftdi|ch340|ch341|cp210|usb serial|usbserial|usbmodem/i.test(candidate.product))
  );
}

function isNoisySerialPath(path: string): boolean {
  return (
    /\/dev\/ttys\d+$/i.test(path) ||
    /\/dev\/ttyama\d+$/i.test(path) ||
    /\/dev\/tty\d+$/i.test(path) ||
    /\/dev\/ttyprintk$/i.test(path) ||
    path.includes("bluetooth") ||
    path.includes("rfcomm") ||
    path.includes("/dev/pts/")
  );
}

function isPreferredSerialPath(path: string): boolean {
  return (
    path.includes("/serial/by-id/") ||
    path.includes("/serial/by-path/") ||
    /^com\d+$/i.test(path) ||
    /\/dev\/ttyusb\d+$/i.test(path) ||
    /\/dev\/ttyacm\d+$/i.test(path) ||
    /\/dev\/cu\.(usb|usbmodem|usbserial)/i.test(path) ||
    /\/dev\/tty\.(usb|usbmodem|usbserial)/i.test(path)
  );
}

function isLikelyRelevantSerialPort(candidate: SerialPortDetails): boolean {
  const path = candidate.path.toLowerCase();

  if (isPreferredSerialPath(path)) {
    return true;
  }

  if (isNoisySerialPath(path)) {
    return false;
  }

  return hasUsbHints(candidate);
}

function scoreSerialPort(candidate: SerialPortDetails): number {
  const path = candidate.path.toLowerCase();
  let score = 0;

  if (path.includes("/serial/by-id/")) {
    score += 1000;
  }

  if (path.includes("/serial/by-path/")) {
    score += 950;
  }

  if (/^com\d+$/i.test(candidate.path)) {
    score += 900;
  }

  if (/\/dev\/ttyusb\d+$/i.test(path)) {
    score += 800;
  }

  if (/\/dev\/ttyacm\d+$/i.test(path)) {
    score += 780;
  }

  if (/\/dev\/cu\.(usb|usbmodem|usbserial)/i.test(path)) {
    score += 760;
  }

  if (/\/dev\/tty\.(usb|usbmodem|usbserial)/i.test(path)) {
    score += 740;
  }

  if (/\/dev\/ttys\d+$/i.test(path)) {
    score -= 600;
  }

  if (/\/dev\/ttyama\d+$/i.test(path)) {
    score -= 500;
  }

  if (path.includes("bluetooth") || path.includes("rfcomm")) {
    score -= 400;
  }

  if (candidate.type?.toLowerCase() === "usb") {
    score += 120;
  }

  if (hasKnownText(candidate.manufacturer)) {
    score += 25;
  }

  if (hasKnownText(candidate.product)) {
    score += 25;
  }

  if (hasKnownText(candidate.serialNumber)) {
    score += 25;
  }

  if (hasKnownText(candidate.pid)) {
    score += 10;
  }

  if (hasKnownText(candidate.vid)) {
    score += 10;
  }

  if (
    candidate.manufacturer &&
    /arduino|ftdi|ch340|ch341|cp210|usb serial|usbserial/i.test(candidate.manufacturer)
  ) {
    score += 50;
  }

  if (
    candidate.product &&
    /arduino|ftdi|ch340|ch341|cp210|usb serial|usbserial|usbmodem/i.test(candidate.product)
  ) {
    score += 50;
  }

  return score;
}

function rankSerialPorts(candidate: unknown): string[] {
  const candidates = readSerialPortCandidates(candidate);
  const relevantCandidates = candidates.filter(isLikelyRelevantSerialPort);
  const rankedCandidates = (relevantCandidates.length > 0
    ? relevantCandidates
    : candidates.filter((entry) => !isNoisySerialPath(entry.path.toLowerCase()))
  ).sort((left, right) => {
      const scoreDiff = scoreSerialPort(right) - scoreSerialPort(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const indexDiff = left.sourceIndex - right.sourceIndex;
      if (indexDiff !== 0) {
        return indexDiff;
      }

      return left.path.localeCompare(right.path);
    });

  return [...new Set(rankedCandidates.map((entry) => entry.path))];
}

export function normalizeSerialPorts(candidate: unknown): string[] {
  return rankSerialPorts(candidate);
}

export function shouldAutoConnect(persisted: PersistedState): boolean {
  return resolveActiveProfile(persisted).serial.autoConnect;
}

export function resolveSerialPort(
  persisted: PersistedState,
  availablePorts: string[]
): string | null {
  const activeProfile = resolveActiveProfile(persisted);
  const candidates = [activeProfile.serial.preferredPort, persisted.lastPort];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && availablePorts.includes(candidate)) {
      return candidate;
    }
  }

  return rankSerialPorts(availablePorts)[0] ?? null;
}

export function sameSerialPorts(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();

  return normalizedLeft.every((port, index) => port === normalizedRight[index]);
}

export type SerialOpenErrorKind = "busy" | "permission" | "not_found" | "unknown";

export interface SerialOpenError {
  kind: SerialOpenErrorKind;
  /** Friendly PT-BR message for display and watch log */
  message: string;
  /** Original error string from the serial plugin for the detail field */
  detail: string;
}

/**
 * Classifies a raw serial open error string from tauri-plugin-serialplugin
 * into a structured error with a human-readable message.
 *
 * The plugin serialises errors as strings, so we match on known substrings
 * produced by the serialport crate on Linux (EBUSY → "device or resource busy",
 * EACCES → "permission denied", ENOENT → "no such file").
 */
export function classifySerialOpenError(rawError: unknown, portPath: string): SerialOpenError {
  const detail = rawError instanceof Error ? rawError.message : String(rawError);
  const lower = detail.toLowerCase();

  if (lower.includes("busy") || lower.includes("no device") || lower.includes("nodevice")) {
    return {
      kind: "busy",
      message: `Porta ${portPath} está em uso por outro processo. Feche o monitor serial ou outro app que esteja com a porta aberta.`,
      detail
    };
  }

  if (lower.includes("permission denied") || lower.includes("access denied") || lower.includes("eacces")) {
    return {
      kind: "permission",
      message: `Sem permissão para abrir ${portPath}. Adicione seu usuário ao grupo dialout: sudo usermod -aG dialout $USER`,
      detail
    };
  }

  if (lower.includes("no such file") || lower.includes("not found") || lower.includes("enoent")) {
    return {
      kind: "not_found",
      message: `Porta ${portPath} não encontrada. O dispositivo pode ter sido desconectado.`,
      detail
    };
  }

  return {
    kind: "unknown",
    message: `Falha ao abrir porta serial ${portPath}.`,
    detail
  };
}
