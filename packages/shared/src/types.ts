export type UiLanguage = "pt-BR" | "en";
export type ThemeMode = "system" | "light" | "dark";
export type NoiseReductionLevel = "low" | "default" | "high";
export type RuntimeStatus =
  | "booting"
  | "ready"
  | "searching"
  | "connecting"
  | "connected"
  | "demo"
  | "disconnected"
  | "error";

export type AudioTarget =
  | { kind: "master" }
  | { kind: "application"; name: string }
  | { kind: "source"; name: string }
  | { kind: "sink"; name: string };

export interface SliderConfig {
  id: number;
  name: string;
  targets: AudioTarget[];
  inverted?: boolean;
}

export interface SerialSettings {
  preferredPort: string | null;
  baudRate: number;
  autoConnect: boolean;
  heartbeatTimeoutMs: number;
}

export interface AudioSettings {
  noiseReduction: NoiseReductionLevel;
  smoothTransitions: boolean;
  transitionDurationMs: number;
}

export interface UiSettings {
  language: UiLanguage;
  theme: ThemeMode;
  showVisualizers: boolean;
  telemetryWindow: number;
}

export interface MixerProfile {
  id: string;
  name: string;
  serial: SerialSettings;
  sliders: SliderConfig[];
  audio: AudioSettings;
  ui: UiSettings;
}

export interface WindowState {
  width: number;
  height: number;
}

export interface PersistedState {
  selectedProfileId: string;
  profiles: MixerProfile[];
  lastWindow: WindowState;
  demoMode: boolean;
  lastPort: string | null;
}

export interface AudioEndpoint {
  name: string;
  description: string;
}

export interface AudioInventory {
  backend: "pactl" | "unsupported";
  applications: string[];
  sinks: AudioEndpoint[];
  sources: AudioEndpoint[];
  defaultSink: string | null;
  defaultSource: string | null;
  summary: string;
  diagnostics: string[];
}

export interface FirmwareInfo {
  boardName: string;
  firmwareVersion: string;
  protocolVersion: number;
  knobCount: number | null;
}

export type OutcomeSeverity = "info" | "success" | "warning" | "error";
export type TargetOutcomeStatus =
  | "updated"
  | "idle"
  | "unavailable"
  | "skipped"
  | "error";

export interface RuntimeTargetOutcome {
  target: string;
  status: TargetOutcomeStatus;
  detail: string;
  matched: string[];
}

export interface SliderOutcome {
  summary: string;
  severity: OutcomeSeverity;
  targets: RuntimeTargetOutcome[];
}

export interface RuntimeDiagnostics {
  audioSummary: string;
  activeApplications: string[];
  lastSerialLine: string | null;
  hint: string;
  backend: AudioInventory["backend"];
  firmware: FirmwareInfo | null;
}

export interface RuntimeKnobSnapshot {
  id: number;
  name: string;
  percent: number;
  rawValue: number;
  appliedRawValue: number;
  targets: string[];
  outcome: SliderOutcome;
  accent: string;
}

export interface TelemetryPoint {
  tick: number;
  knobId: number;
  rawValue: number;
  appliedValue: number;
  percent: number;
}

export interface RuntimeSnapshot {
  status: RuntimeStatus;
  statusText: string;
  connectionPort: string | null;
  availablePorts: string[];
  knobs: RuntimeKnobSnapshot[];
  diagnostics: RuntimeDiagnostics;
  demoMode: boolean;
  telemetry: TelemetryPoint[];
}

export type SliderStateMap = Record<number, number>;
export type OutcomeMap = Record<number, SliderOutcome>;

export type SliderPacket =
  | { kind: "state"; values: number[] }
  | { kind: "delta"; sliderId: number; value: number };

export type SerialPacket =
  | SliderPacket
  | { kind: "handshake"; info: FirmwareInfo };

export interface SliderUpdate {
  sliderId: number;
  rawValue: number;
}
