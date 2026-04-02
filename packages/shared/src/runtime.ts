import {
  defaultPersistedState,
  emptyAudioInventory
} from "./defaults";
import {
  sliderToAppliedPercent,
} from "./mixer";
import type {
  AudioInventory,
  MixerProfile,
  OutcomeMap,
  PersistedState,
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
    audioInventory = emptyAudioInventory
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
        outcome: outcomes[slider.id] ?? "waiting for data",
        accent: accentPalette[slider.id % accentPalette.length]
      };
    }),
    diagnostics: {
      audioSummary: audioInventory.summary,
      activeApplications: audioInventory.applications,
      lastSerialLine,
      hint: buildHint(status, statusText),
      backend: audioInventory.backend
    },
    demoMode,
    telemetry
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
  const merged = [...telemetry, ...nextPoints];
  return merged.slice(Math.max(0, merged.length - windowSize));
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
