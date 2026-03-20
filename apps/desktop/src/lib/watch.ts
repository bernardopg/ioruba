export type WatchScope = "app" | "serial" | "backend";
export type WatchLevel = "info" | "warning" | "error";

export interface WatchLogInput {
  scope: WatchScope;
  level: WatchLevel;
  message: string;
  detail?: string;
  timestampMs?: number;
}

export interface WatchLogEntry {
  seq: number;
  timestampMs: number;
  scope: WatchScope;
  level: WatchLevel;
  message: string;
  detail?: string;
}

const watchTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

export function formatWatchTimestamp(timestampMs: number): string {
  return watchTimeFormatter.format(new Date(timestampMs));
}
