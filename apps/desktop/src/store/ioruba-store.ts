import { create } from "zustand";
import {
  buildDemoFrame,
  buildRuntimeSnapshot,
  defaultPersistedState,
  emptyAudioInventory,
  mergeSliderPacket,
  parseSliderPacket,
  pushTelemetry,
  resolveActiveProfile,
  resolveFilteredUpdates,
  type AudioInventory,
  type PersistedState,
  type RuntimeStatus,
  type SliderStateMap,
  type SliderUpdate,
  type TelemetryPoint
} from "@ioruba/shared";

type ConnectionMode = "idle" | "serial" | "demo";

interface IorubaState {
  hydrated: boolean;
  persisted: PersistedState;
  audioInventory: AudioInventory;
  currentValues: SliderStateMap;
  appliedValues: SliderStateMap;
  outcomes: Record<number, string>;
  availablePorts: string[];
  lastSerialLine: string | null;
  telemetry: TelemetryPoint[];
  tick: number;
  connectionMode: ConnectionMode;
  errorMessage: string | null;
  configDraft: string;
  snapshot: ReturnType<typeof buildRuntimeSnapshot>;
  hydrate: (persisted: PersistedState, audioInventory: AudioInventory) => void;
  refreshInventory: (audioInventory: AudioInventory) => void;
  setAvailablePorts: (ports: string[]) => void;
  setStatus: (
    status: RuntimeStatus,
    statusText: string,
    connectionPort?: string | null
  ) => void;
  requestConnect: () => void;
  disconnect: (reason?: string) => void;
  setDemoMode: (enabled: boolean) => void;
  setPreferredPort: (port: string | null) => void;
  setConfigDraft: (draft: string) => void;
  applyConfigDraft: () => void;
  resetProfile: () => void;
  processSerialLine: (rawLine: string) => SliderUpdate[];
  commitAppliedResults: (
    updates: SliderUpdate[],
    outcomes: Record<number, string>
  ) => void;
  runDemoStep: () => void;
}

function createSnapshot(state: Pick<
  IorubaState,
  | "persisted"
  | "audioInventory"
  | "availablePorts"
  | "currentValues"
  | "appliedValues"
  | "outcomes"
  | "lastSerialLine"
  | "telemetry"
> & {
  connectionMode: ConnectionMode;
  status: RuntimeStatus;
  statusText: string;
  connectionPort: string | null;
}) {
  return buildRuntimeSnapshot({
    profile: resolveActiveProfile(state.persisted),
    status: state.status,
    statusText: state.statusText,
    availablePorts: state.availablePorts,
    connectionPort: state.connectionPort,
    lastSerialLine: state.lastSerialLine,
    demoMode: state.connectionMode === "demo",
    currentValues: state.currentValues,
    appliedValues: state.appliedValues,
    outcomes: state.outcomes,
    telemetry: state.telemetry,
    audioInventory: state.audioInventory
  });
}

function updateActiveProfile(
  persisted: PersistedState,
  updater: (profileJson: ReturnType<typeof resolveActiveProfile>) => ReturnType<typeof resolveActiveProfile>
): PersistedState {
  const activeProfile = resolveActiveProfile(persisted);
  const nextProfile = updater(activeProfile);

  return {
    ...persisted,
    profiles: persisted.profiles.map((profile) =>
      profile.id === nextProfile.id ? nextProfile : profile
    )
  };
}

function serializeActiveProfile(persisted: PersistedState) {
  return JSON.stringify(resolveActiveProfile(persisted), null, 2);
}

export const useIorubaStore = create<IorubaState>((set, get) => {
  const initialSnapshot = buildRuntimeSnapshot({
    profile: resolveActiveProfile(defaultPersistedState),
    status: "booting",
    statusText: "Inicializando Ioruba Desktop",
    availablePorts: [],
    connectionPort: null,
    lastSerialLine: null,
    demoMode: false,
    currentValues: {},
    appliedValues: {},
    outcomes: {},
    telemetry: [],
    audioInventory: emptyAudioInventory
  });

  return {
    hydrated: false,
    persisted: defaultPersistedState,
    audioInventory: emptyAudioInventory,
    currentValues: {},
    appliedValues: {},
    outcomes: {},
    availablePorts: [],
    lastSerialLine: null,
    telemetry: [],
    tick: 0,
    connectionMode: "idle",
    errorMessage: null,
    configDraft: serializeActiveProfile(defaultPersistedState),
    snapshot: initialSnapshot,
    hydrate: (persisted, audioInventory) => {
      const nextConnectionMode = persisted.demoMode ? "demo" : "idle";
      set({
        hydrated: true,
        persisted,
        audioInventory,
        configDraft: serializeActiveProfile(persisted),
        connectionMode: nextConnectionMode,
        snapshot: buildRuntimeSnapshot({
          profile: resolveActiveProfile(persisted),
          status: persisted.demoMode ? "demo" : "ready",
          statusText: persisted.demoMode
            ? "Modo demo preparado"
            : "Pronto para conectar",
          availablePorts: [],
          connectionPort: null,
          lastSerialLine: null,
          demoMode: persisted.demoMode,
          currentValues: {},
          appliedValues: {},
          outcomes: {},
          telemetry: [],
          audioInventory
        })
      });
    },
    refreshInventory: (audioInventory) => {
      const state = get();
      set({
        audioInventory,
        snapshot: createSnapshot({
          ...state,
          audioInventory,
          connectionMode: state.connectionMode,
          status: state.snapshot.status,
          statusText: state.snapshot.statusText,
          connectionPort: state.snapshot.connectionPort
        })
      });
    },
    setAvailablePorts: (ports) => {
      const state = get();
      set({
        availablePorts: ports,
        snapshot: createSnapshot({
          ...state,
          availablePorts: ports,
          connectionMode: state.connectionMode,
          status: state.snapshot.status,
          statusText: state.snapshot.statusText,
          connectionPort: state.snapshot.connectionPort
        })
      });
    },
    setStatus: (status, statusText, connectionPort) => {
      const state = get();
      set({
        snapshot: createSnapshot({
          ...state,
          status,
          statusText,
          connectionPort:
            connectionPort === undefined
              ? state.snapshot.connectionPort
              : connectionPort,
          connectionMode: state.connectionMode
        })
      });
    },
    requestConnect: () => {
      const state = get();
      set({
        connectionMode: "serial",
        persisted: {
          ...state.persisted,
          demoMode: false
        },
        snapshot: createSnapshot({
          ...state,
          connectionMode: "serial",
          status: "searching",
          statusText: "Procurando uma porta serial do Arduino",
          connectionPort: null
        })
      });
    },
    disconnect: (reason = "Monitor serial desligado") => {
      const state = get();
      set({
        connectionMode: "idle",
        snapshot: createSnapshot({
          ...state,
          connectionMode: "idle",
          status: "ready",
          statusText: reason,
          connectionPort: null
        })
      });
    },
    setDemoMode: (enabled) => {
      const state = get();
      const persisted = {
        ...state.persisted,
        demoMode: enabled
      };
      set({
        persisted,
        connectionMode: enabled ? "demo" : "idle",
        currentValues: enabled ? state.currentValues : {},
        appliedValues: enabled ? state.appliedValues : {},
        outcomes: enabled ? state.outcomes : {},
        telemetry: enabled ? state.telemetry : [],
        snapshot: createSnapshot({
          ...state,
          persisted,
          connectionMode: enabled ? "demo" : "idle",
          currentValues: enabled ? state.currentValues : {},
          appliedValues: enabled ? state.appliedValues : {},
          outcomes: enabled ? state.outcomes : {},
          telemetry: enabled ? state.telemetry : [],
          status: enabled ? "demo" : "ready",
          statusText: enabled ? "Modo demo ativo" : "Modo demo desativado",
          connectionPort: enabled ? null : state.snapshot.connectionPort
        })
      });
    },
    setPreferredPort: (port) => {
      const state = get();
      const persisted = updateActiveProfile(state.persisted, (profile) => ({
        ...profile,
        serial: {
          ...profile.serial,
          preferredPort: port
        }
      }));
      set({
        persisted: {
          ...persisted,
          lastPort: port
        },
        configDraft: serializeActiveProfile(persisted)
      });
    },
    setConfigDraft: (draft) => set({ configDraft: draft }),
    applyConfigDraft: () => {
      const state = get();
      const candidate = JSON.parse(state.configDraft) as PersistedState["profiles"][number];
      if (!candidate.id || !candidate.name || !Array.isArray(candidate.sliders)) {
        throw new Error("JSON de perfil inválido");
      }

      const persisted = updateActiveProfile(state.persisted, () => candidate);
      set({
        persisted,
        configDraft: serializeActiveProfile(persisted),
        snapshot: createSnapshot({
          ...state,
          persisted,
          status: state.snapshot.status,
          statusText: "Perfil atualizado",
          connectionMode: state.connectionMode,
          connectionPort: state.snapshot.connectionPort
        })
      });
    },
    resetProfile: () => {
      const state = get();
      set({
        persisted: defaultPersistedState,
        configDraft: serializeActiveProfile(defaultPersistedState),
        currentValues: {},
        appliedValues: {},
        outcomes: {},
        telemetry: [],
        snapshot: buildRuntimeSnapshot({
          profile: resolveActiveProfile(defaultPersistedState),
          status: "ready",
          statusText: "Perfil padrão restaurado",
          availablePorts: state.availablePorts,
          connectionPort: null,
          lastSerialLine: null,
          demoMode: false,
          currentValues: {},
          appliedValues: {},
          outcomes: {},
          telemetry: [],
          audioInventory: state.audioInventory
        })
      });
    },
    processSerialLine: (rawLine) => {
      const state = get();
      const packet = parseSliderPacket(rawLine);
      const activeProfile = resolveActiveProfile(state.persisted);
      const nextCurrentValues =
        packet.kind === "state"
          ? mergeSliderPacket(
              state.currentValues,
              packet.values,
              activeProfile.sliders.length
            )
          : {
              ...state.currentValues,
              [packet.sliderId]: packet.value
            };

      const updates = resolveFilteredUpdates(
        activeProfile,
        nextCurrentValues,
        state.appliedValues
      );

      const telemetryPoints = updates.map((update) => ({
        tick: state.tick + 1,
        knobId: update.sliderId,
        rawValue: nextCurrentValues[update.sliderId] ?? 0,
        appliedValue: update.rawValue,
        percent: Math.round((update.rawValue / 1023) * 100)
      }));

      const telemetry = pushTelemetry(
        state.telemetry,
        telemetryPoints,
        activeProfile.ui.telemetryWindow
      );

      set({
        currentValues: nextCurrentValues,
        telemetry,
        tick: state.tick + 1,
        lastSerialLine: rawLine,
        snapshot: createSnapshot({
          ...state,
          currentValues: nextCurrentValues,
          telemetry,
          lastSerialLine: rawLine,
          status: "connected",
          statusText: `Recebendo dados | ${rawLine.trim()}`,
          connectionPort: state.snapshot.connectionPort,
          connectionMode: state.connectionMode
        })
      });

      return updates;
    },
    commitAppliedResults: (updates, nextOutcomes) => {
      const state = get();
      const appliedValues = { ...state.appliedValues };
      const outcomes = { ...state.outcomes };

      for (const update of updates) {
        appliedValues[update.sliderId] = update.rawValue;
        outcomes[update.sliderId] =
          nextOutcomes[update.sliderId] ?? "target updated";
      }

      set({
        appliedValues,
        outcomes,
        snapshot: createSnapshot({
          ...state,
          appliedValues,
          outcomes,
          status: state.snapshot.status,
          statusText: state.snapshot.statusText,
          connectionPort: state.snapshot.connectionPort,
          connectionMode: state.connectionMode
        })
      });
    },
    runDemoStep: () => {
      const state = get();
      const activeProfile = resolveActiveProfile(state.persisted);
      const tick = state.tick + 1;
      const currentValues = buildDemoFrame(tick, activeProfile.sliders.length);
      const telemetryPoints = activeProfile.sliders.map((slider) => {
        const rawValue = currentValues[slider.id] ?? 0;
        return {
          tick,
          knobId: slider.id,
          rawValue,
          appliedValue: rawValue,
          percent: Math.round((rawValue / 1023) * 100)
        };
      });
      const telemetry = pushTelemetry(
        state.telemetry,
        telemetryPoints,
        activeProfile.ui.telemetryWindow
      );
      const appliedValues = { ...currentValues };
      const outcomes = activeProfile.sliders.reduce<Record<number, string>>(
        (accumulator, slider) => {
          accumulator[slider.id] = `demo -> ${slider.name}`;
          return accumulator;
        },
        {}
      );

      set({
        tick,
        currentValues,
        appliedValues,
        outcomes,
        telemetry,
        lastSerialLine: `demo:${tick}`,
        snapshot: createSnapshot({
          ...state,
          currentValues,
          appliedValues,
          outcomes,
          telemetry,
          lastSerialLine: `demo:${tick}`,
          status: "demo",
          statusText: "Fluxo sintético em execução",
          connectionPort: null,
          connectionMode: "demo"
        })
      });
    }
  };
});
