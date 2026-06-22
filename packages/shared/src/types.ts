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

export type ControlAction = "mute" | "next" | "prev";
export type ControlInputKind = "button" | "encoder";
export type ButtonEventKind = "press" | "release";
export type EncoderDirection = "clockwise" | "counterclockwise";

export type ControlConfig =
  | {
      input: "button";
      id: number;
      name: string;
      event: ButtonEventKind;
      action: ControlAction;
    }
  | {
      input: "encoder";
      id: number;
      name: string;
      direction: EncoderDirection;
      action: ControlAction;
    };

export interface FirmwareCalibration {
  minRaw: number;
  maxRaw: number;
}

export interface SliderConfig {
  id: number;
  name: string;
  targets: AudioTarget[];
  inverted?: boolean;
  calibration?: FirmwareCalibration;
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

export interface FirmwareSettings {
  changeThreshold: number;
  edgeDeadzone: number;
  smoothingStrength: number;
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
  controls: ControlConfig[];
  audio: AudioSettings;
  firmware: FirmwareSettings;
  ui: UiSettings;
}

export interface WindowState {
  width: number;
  height: number;
}

export interface PersistedState {
  schemaVersion: number;
  selectedProfileId: string;
  profiles: MixerProfile[];
  lastWindow: WindowState;
  demoMode: boolean;
  launchOnLogin: boolean;
  lastPort: string | null;
  /** Quando true, o cartão de onboarding inicial não é mais exibido. */
  onboardingDismissed?: boolean;
}

export interface AudioEndpoint {
  name: string;
  description: string;
}

export interface AudioInventory {
  backend: "pactl" | "windows" | "macos" | "unsupported";
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
  /**
   * `true` quando `protocolVersion` casa com `SUPPORTED_PROTOCOL_VERSION`. Quando
   * `false`, o firmware conectado fala um protocolo diferente do esperado e a UI
   * deve sinalizar possível incompatibilidade.
   */
  protocolSupported: boolean;
  knobCount: number | null;
  /**
   * Nome do microcontrolador reportado pelo handshake (`mcu=`), p.ex.
   * `"ATmega328P"`, `"ESP32"`. `null` quando o firmware não informa (campo
   * aditivo do protocolo v2; firmwares antigos o omitem).
   */
  mcu: string | null;
  /**
   * Resolução do ADC em bits (`adcBits=`): 10 para AVR (0..1023), 12 para
   * ESP32/RP2040 (0..4095). `null` quando ausente — o runtime assume 10-bit
   * por compatibilidade. Determina como o valor bruto vira porcentagem.
   */
  adcBits: number | null;
  controllerConfig: FirmwareControllerConfig | null;
}

export interface FirmwareControllerConfig extends FirmwareSettings {
  calibrations: FirmwareCalibration[];
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

/**
 * Running per-knob aggregates for the current session. These survive the
 * sliding telemetry window (which only keeps the last N points), giving a
 * whole-session view at O(1) memory. `sumPercent` is the internal accumulator
 * for the average; read it through {@link KnobSessionStats} consumers, not directly.
 */
export interface KnobSessionStats {
  knobId: number;
  sampleCount: number;
  minPercent: number;
  maxPercent: number;
  sumPercent: number;
  lastPercent: number;
}

export interface SessionTelemetryStats {
  sampleCount: number;
  firstTick: number | null;
  lastTick: number | null;
  perKnob: Record<number, KnobSessionStats>;
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
  /** Duração (ms) da transição visual dos knobs, vinda de `profile.audio`. */
  transitionDurationMs: number;
}

export type SliderStateMap = Record<number, number>;
export type OutcomeMap = Record<number, SliderOutcome>;

export type SliderPacket =
  | { kind: "state"; values: number[] }
  | { kind: "delta"; sliderId: number; value: number };

export type ControlEventPacket =
  | {
      kind: "control";
      input: "button";
      controlId: number;
      event: ButtonEventKind;
    }
  | {
      kind: "control";
      input: "encoder";
      controlId: number;
      delta: number;
    };

export interface ControlActionDispatch {
  action: ControlAction;
  controlId: number;
  controlName: string;
  input: ControlInputKind;
  detail: string;
}

export type SerialPacket =
  | SliderPacket
  | ControlEventPacket
  | { kind: "handshake"; info: FirmwareInfo };

export interface SliderUpdate {
  sliderId: number;
  rawValue: number;
}
