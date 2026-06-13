import {
  defaultPersistedState,
  emptyAudioInventory
} from "./defaults";
import {
  sliderToAppliedPercent,
} from "./mixer";
import type {
  AudioInventory,
  FirmwareInfo,
  MixerProfile,
  OutcomeMap,
  PersistedState,
  SliderOutcome,
  RuntimeSnapshot,
  RuntimeStatus,
  SliderStateMap,
  TelemetryPoint
} from "./types";

const accentPalette = ["cyan", "amber", "teal", "rose", "lime"];

export function resolveActiveProfile(
  persistedState: PersistedState = defaultPersistedState
): MixerProfile {
  return (
    persistedState.profiles.find(
      (profile) => profile.id === persistedState.selectedProfileId
    ) ?? persistedState.profiles[0]
  );
}

export function buildRuntimeSnapshot(args: {
  profile: MixerProfile;
  status: RuntimeStatus;
  statusText: string;
  availablePorts: string[];
  connectionPort: string | null;
  lastSerialLine: string | null;
  demoMode: boolean;
  currentValues: SliderStateMap;
  appliedValues: SliderStateMap;
  outcomes: OutcomeMap;
  telemetry: TelemetryPoint[];
  audioInventory?: AudioInventory;
  firmwareInfo?: FirmwareInfo | null;
}): RuntimeSnapshot {
  const {
    profile,
    status,
    statusText,
    availablePorts,
    connectionPort,
    lastSerialLine,
    demoMode,
    currentValues,
    appliedValues,
    outcomes,
    telemetry,
    audioInventory = emptyAudioInventory,
    firmwareInfo = null
  } = args;

  return {
    status,
    statusText,
    connectionPort,
    availablePorts,
    knobs: profile.sliders.map((slider) => {
      const rawValue = currentValues[slider.id] ?? 0;
      const appliedRawValue = appliedValues[slider.id] ?? rawValue;

      return {
        id: slider.id,
        name: slider.name,
        percent: sliderToAppliedPercent(slider, rawValue),
        rawValue,
        appliedRawValue,
        targets: slider.targets.map(describeTarget),
        outcome: outcomes[slider.id] ?? createWaitingOutcome(),
        accent: accentPalette[slider.id % accentPalette.length]
      };
    }),
    diagnostics: {
      audioSummary: audioInventory.summary,
      activeApplications: audioInventory.applications,
      lastSerialLine,
      hint: buildHint(status, statusText),
      backend: audioInventory.backend,
      firmware: firmwareInfo
    },
    demoMode,
    telemetry,
    transitionDurationMs: profile.audio.transitionDurationMs
  };
}

export function createWaitingOutcome(): SliderOutcome {
  return {
    summary: "waiting for data",
    severity: "info",
    targets: []
  };
}

export function buildDemoFrame(tick: number, sliderCount: number): SliderStateMap {
  const seeds = [
    (tick * 17) % 1023,
    (tick * 31 + 340) % 1023,
    (tick * 23 + 680) % 1023,
    (tick * 29 + 170) % 1023
  ];

  return Array.from({ length: sliderCount }).reduce<SliderStateMap>(
    (accumulator, _, index) => {
      accumulator[index] = seeds[index % seeds.length];
      return accumulator;
    },
    {}
  );
}

export function pushTelemetry(
  telemetry: TelemetryPoint[],
  nextPoints: TelemetryPoint[],
  windowSize: number
): TelemetryPoint[] {
  // Janela <= 0 desliga a telemetria sem alocar nada.
  if (windowSize <= 0) {
    return telemetry.length === 0 ? telemetry : [];
  }

  // Nada a anexar: preserva a referência existente para não invalidar memos a
  // jusante (React/Zustand) à toa.
  if (nextPoints.length === 0) {
    return telemetry.length <= windowSize
      ? telemetry
      : telemetry.slice(telemetry.length - windowSize);
  }

  const total = telemetry.length + nextPoints.length;

  // Caminho comum em regime: o resultado cabe na janela. Uma única alocação
  // (concat) em vez do `[...a, ...b]` seguido de `slice` (duas alocações).
  if (total <= windowSize) {
    return telemetry.concat(nextPoints);
  }

  // Excedeu a janela: monta direto o sufixo de `windowSize` pontos sem criar o
  // array intermediário `merged`. Copia apenas a cauda necessária de cada lado.
  const result: TelemetryPoint[] = new Array(windowSize);
  const dropCount = total - windowSize;

  let writeIndex = 0;
  // Quantos pontos antigos sobrevivem após descartar os mais velhos.
  const keptFromOld = Math.max(0, telemetry.length - dropCount);
  for (let readIndex = telemetry.length - keptFromOld; readIndex < telemetry.length; readIndex++) {
    result[writeIndex++] = telemetry[readIndex];
  }

  // Quantos pontos novos entram (a cauda, caso nextPoints sozinho já exceda).
  const startNew = Math.max(0, nextPoints.length - windowSize);
  for (let readIndex = startNew; readIndex < nextPoints.length; readIndex++) {
    result[writeIndex++] = nextPoints[readIndex];
  }

  return result;
}

export function describeTarget(
  target: MixerProfile["sliders"][number]["targets"][number]
): string {
  switch (target.kind) {
    case "master":
      return "master";
    case "application":
      return `app:${target.name}`;
    case "source":
      return `source:${target.name}`;
    case "sink":
      return `sink:${target.name}`;
  }
}

function buildHint(status: RuntimeStatus, statusText: string): string {
  switch (status) {
    case "booting":
      return "Inicializando serviços";
    case "ready":
      return "Pronto para conectar";
    case "searching":
      return "Procurando um Arduino serial";
    case "connecting":
      return "Abrindo porta serial e aguardando firmware";
    case "connected":
    case "disconnected":
    case "error":
      return statusText;
    case "demo":
      return "Leituras sintéticas estão alimentando a interface";
  }
}
