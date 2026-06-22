import { create } from "zustand";
import {
  adcMaxForBits,
  buildDemoFrame,
  buildRuntimeSnapshot,
  clampSliderValue,
  createSessionStats,
  createWaitingOutcome,
  DEFAULT_ADC_BITS,
  defaultPersistedState,
  emptyAudioInventory,
  findPreset,
  mergeSliderPacket,
  parseSerialPacket,
  pushTelemetry,
  resolveActiveProfile,
  resolveFilteredUpdates,
  sliderToAppliedPercent,
  sliderValueToPercent,
  SUPPORTED_PROTOCOL_VERSION,
  updateSessionStats,
  type AudioInventory,
  type ControlActionDispatch,
  type ControlEventPacket,
  type FirmwareInfo,
  type OutcomeMap,
  type PersistedState,
  type MixerProfile,
  type RuntimeStatus,
  type SessionTelemetryStats,
  type SliderOutcome,
  type SliderStateMap,
  type SliderUpdate,
  type TelemetryPoint,
} from "@ioruba/shared";

import {
  cloneProfile,
  createProfileFromDefault,
  createProfileFromPreset,
  duplicateProfileConfig,
  parseProfileDraft,
  prepareImportedProfile,
  removeProfileById,
  replaceActiveProfile,
  selectProfileById,
  serializeProfileDraft,
} from "@/lib/profile-config";
import {
  appendWatchLogEntry,
  clearWatchLogEntries,
  exportProfile,
  importProfile,
} from "@/lib/backend";
import { sameSerialPorts } from "@/lib/serial";
import { type WatchLogEntry, type WatchLogInput } from "@/lib/watch";

type ConnectionMode = "idle" | "serial" | "demo";

const WATCH_LOG_LIMIT = 300;

interface SerialProcessingResult {
  sliderUpdates: SliderUpdate[];
  controlActions: ControlActionDispatch[];
}

interface IorubaState {
  hydrated: boolean;
  persisted: PersistedState;
  audioInventory: AudioInventory;
  firmwareInfo: FirmwareInfo | null;
  currentValues: SliderStateMap;
  appliedValues: SliderStateMap;
  outcomes: OutcomeMap;
  availablePorts: string[];
  lastSerialLine: string | null;
  /**
   * Epoch (ms) do último frame de knobs recebido (serial ou demo). `null` quando
   * nenhum frame chegou na sessão atual. O indicador de saúde da conexão deriva
   * a "frescura"/latência a partir deste valor; é zerado ao desconectar.
   */
  lastFrameAt: number | null;
  telemetry: TelemetryPoint[];
  sessionStats: SessionTelemetryStats;
  watchLog: WatchLogEntry[];
  watchLogPersistenceReady: boolean;
  tick: number;
  watchSeq: number;
  connectionMode: ConnectionMode;
  errorMessage: string | null;
  configDraft: string;
  snapshot: ReturnType<typeof buildRuntimeSnapshot>;
  hydrate: (persisted: PersistedState, audioInventory: AudioInventory) => void;
  hydrateWatchLog: (watchLog: WatchLogEntry[]) => void;
  setWatchLogPersistenceReady: (ready: boolean) => void;
  refreshInventory: (audioInventory: AudioInventory) => void;
  setAvailablePorts: (ports: string[]) => void;
  appendWatchLog: (entry: WatchLogInput) => void;
  clearWatchLog: () => void;
  resetSessionStats: () => void;
  setStatus: (
    status: RuntimeStatus,
    statusText: string,
    connectionPort?: string | null,
  ) => void;
  requestConnect: () => void;
  disconnect: (reason?: string) => void;
  setDemoMode: (enabled: boolean) => void;
  setLaunchOnLogin: (enabled: boolean) => void;
  selectProfile: (profileId: string) => void;
  createProfile: () => void;
  applyPreset: (presetKey: string) => void;
  exportActiveProfile: () => Promise<void>;
  importProfileFromFile: () => Promise<void>;
  dismissOnboarding: () => void;
  duplicateActiveProfile: () => void;
  removeActiveProfile: () => void;
  updateActiveProfileConfig: (profile: MixerProfile) => void;
  setPreferredPort: (port: string | null) => void;
  setThemeMode: (theme: MixerProfile["ui"]["theme"]) => void;
  setConfigDraft: (draft: string) => void;
  applyConfigDraft: () => void;
  resetProfile: () => void;
  processSerialLine: (rawLine: string) => SerialProcessingResult;
  commitAppliedResults: (updates: SliderUpdate[], outcomes: OutcomeMap) => void;
  runDemoStep: () => void;
}

function createSnapshot(
  state: Pick<
    IorubaState,
    | "persisted"
    | "audioInventory"
    | "firmwareInfo"
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
  },
) {
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
    audioInventory: state.audioInventory,
    firmwareInfo: state.firmwareInfo,
  });
}

function serializeActiveProfile(persisted: PersistedState) {
  return serializeProfileDraft(resolveActiveProfile(persisted));
}

function createPersistedSnapshotUpdate(
  state: IorubaState,
  persisted: PersistedState,
  overrides?: Partial<
    Pick<
      IorubaState,
      | "currentValues"
      | "appliedValues"
      | "outcomes"
      | "telemetry"
      | "lastSerialLine"
      | "firmwareInfo"
    >
  >,
) {
  const nextState = {
    ...state,
    ...overrides,
    persisted,
  };

  return {
    persisted,
    configDraft: serializeActiveProfile(persisted),
    ...(overrides ?? {}),
    snapshot: createSnapshot({
      ...nextState,
      connectionMode: state.connectionMode,
      status: state.snapshot.status,
      statusText: state.snapshot.statusText,
      connectionPort: state.snapshot.connectionPort,
    }),
  };
}

function sliderNameForId(profile: MixerProfile, sliderId: number): string {
  return (
    profile.sliders.find((candidate) => candidate.id === sliderId)?.name ??
    `slider ${sliderId}`
  );
}

function formatFirmwareLabel(firmwareInfo: FirmwareInfo): string {
  const base = `${firmwareInfo.boardName} v${firmwareInfo.firmwareVersion} · protocolo ${firmwareInfo.protocolVersion}`;
  return firmwareInfo.protocolSupported ? base : `${base} (incompatível)`;
}

function normalizeWatchEntries(entries: WatchLogEntry[]): WatchLogEntry[] {
  return entries.map((entry, index) => ({
    ...entry,
    seq: index + 1,
  }));
}

function createFallbackOutcome(summary = "target updated"): SliderOutcome {
  return {
    summary,
    severity: "success",
    targets: [],
  };
}

function outcomeSummary(outcome: SliderOutcome | undefined): string {
  return outcome?.summary ?? "target updated";
}

function resolveControlActions(
  profile: MixerProfile,
  packet: ControlEventPacket,
): ControlActionDispatch[] {
  return (profile.controls ?? [])
    .filter((control) => {
      if (control.input !== packet.input || control.id !== packet.controlId) {
        return false;
      }

      if (control.input === "button" && packet.input === "button") {
        return control.event === packet.event;
      }

      if (control.input === "encoder" && packet.input === "encoder") {
        const direction = packet.delta > 0 ? "clockwise" : "counterclockwise";
        return control.direction === direction;
      }

      return false;
    })
    .map((control) => ({
      action: control.action,
      controlId: control.id,
      controlName: control.name,
      input: control.input,
      detail:
        control.input === "button"
          ? `${control.event} -> ${control.action}`
          : `${control.direction} -> ${control.action}`,
    }));
}

function appendWatchEntry(
  state: IorubaState,
  entry: WatchLogInput,
): {
  nextEntry: WatchLogEntry;
  watchLog: WatchLogEntry[];
  watchSeq: number;
} {
  const seq = state.watchSeq + 1;
  const nextEntry: WatchLogEntry = {
    seq,
    timestampMs: entry.timestampMs ?? Date.now(),
    scope: entry.scope,
    level: entry.level,
    message: entry.message,
    detail: entry.detail,
  };

  return {
    watchSeq: seq,
    nextEntry,
    watchLog: [...state.watchLog, nextEntry].slice(-WATCH_LOG_LIMIT),
  };
}

export const useIorubaStore = create<IorubaState>((rawSet, get) => {
  // Session telemetry aggregates accumulate across the sliding window. Any
  // action that clears telemetry (new connection, demo toggle, profile reset,
  // disconnect, ...) ends the session, so reset the aggregates in the same
  // update. Centralised here so individual set() call sites don't each have to
  // remember — the only exception is the live-append path, which sets
  // sessionStats explicitly and is left untouched by the guard below.
  const set: typeof rawSet = (partial, replace) => {
    if (
      partial &&
      typeof partial === "object" &&
      "telemetry" in partial &&
      Array.isArray((partial as Partial<IorubaState>).telemetry) &&
      (partial as Partial<IorubaState>).telemetry!.length === 0 &&
      !("sessionStats" in partial)
    ) {
      (partial as Partial<IorubaState>).sessionStats = createSessionStats();
    }
    return rawSet(partial as Parameters<typeof rawSet>[0], replace as never);
  };

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
    audioInventory: emptyAudioInventory,
    firmwareInfo: null,
  });

  return {
    hydrated: false,
    persisted: defaultPersistedState,
    audioInventory: emptyAudioInventory,
    firmwareInfo: null,
    currentValues: {},
    appliedValues: {},
    outcomes: {},
    availablePorts: [],
    lastSerialLine: null,
    lastFrameAt: null,
    telemetry: [],
    sessionStats: createSessionStats(),
    watchLog: [],
    watchLogPersistenceReady: false,
    tick: 0,
    watchSeq: 0,
    connectionMode: "idle",
    errorMessage: null,
    configDraft: serializeActiveProfile(defaultPersistedState),
    snapshot: initialSnapshot,
    appendWatchLog: (entry) => {
      const state = get();
      const nextWatchEntry = appendWatchEntry(state, entry);
      set({
        watchLog: nextWatchEntry.watchLog,
        watchSeq: nextWatchEntry.watchSeq,
      });

      if (state.watchLogPersistenceReady) {
        void appendWatchLogEntry(nextWatchEntry.nextEntry).catch(() => {});
      }
    },
    clearWatchLog: () => {
      const state = get();
      set({
        watchLog: [],
        watchSeq: 0,
      });

      if (state.watchLogPersistenceReady) {
        void clearWatchLogEntries().catch(() => {});
      }
    },
    resetSessionStats: () => {
      set({ sessionStats: createSessionStats() });
    },
    hydrateWatchLog: (watchLog) => {
      const state = get();
      const mergedWatchLog = normalizeWatchEntries(
        [...watchLog, ...state.watchLog].slice(-WATCH_LOG_LIMIT),
      );

      set({
        watchLog: mergedWatchLog,
        watchSeq: mergedWatchLog.at(-1)?.seq ?? 0,
      });
    },
    setWatchLogPersistenceReady: (ready) => {
      set({ watchLogPersistenceReady: ready });
    },
    hydrate: (persisted, audioInventory) => {
      const nextConnectionMode = persisted.demoMode ? "demo" : "idle";
      set({
        hydrated: true,
        persisted,
        audioInventory,
        firmwareInfo: null,
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
          audioInventory,
          firmwareInfo: null,
        }),
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
          connectionPort: state.snapshot.connectionPort,
        }),
      });
    },
    setAvailablePorts: (ports) => {
      const state = get();
      if (sameSerialPorts(state.availablePorts, ports)) {
        return;
      }

      set({
        availablePorts: ports,
        snapshot: createSnapshot({
          ...state,
          availablePorts: ports,
          connectionMode: state.connectionMode,
          status: state.snapshot.status,
          statusText: state.snapshot.statusText,
          connectionPort: state.snapshot.connectionPort,
        }),
      });

      get().appendWatchLog({
        scope: "serial",
        level: "info",
        message: "Portas seriais atualizadas",
        detail: ports.length > 0 ? ports.join(", ") : "nenhuma porta detectada",
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
          connectionMode: state.connectionMode,
        }),
      });
    },
    requestConnect: () => {
      const state = get();
      get().appendWatchLog({
        scope: "app",
        level: "info",
        message: "Conexao serial solicitada",
      });
      set({
        connectionMode: "serial",
        firmwareInfo: null,
        persisted: {
          ...state.persisted,
          demoMode: false,
        },
        snapshot: createSnapshot({
          ...state,
          firmwareInfo: null,
          connectionMode: "serial",
          status: "searching",
          statusText: "Procurando uma porta serial do Arduino",
          connectionPort: null,
        }),
      });
    },
    disconnect: (reason = "Monitor serial desligado") => {
      const state = get();
      get().appendWatchLog({
        scope: "app",
        level: "warning",
        message: "Monitor serial desligado",
        detail: reason,
      });
      set({
        connectionMode: "idle",
        firmwareInfo: null,
        lastFrameAt: null,
        snapshot: createSnapshot({
          ...state,
          firmwareInfo: null,
          connectionMode: "idle",
          status: "ready",
          statusText: reason,
          connectionPort: null,
        }),
      });
    },
    setDemoMode: (enabled) => {
      const state = get();
      const persisted = {
        ...state.persisted,
        demoMode: enabled,
      };
      get().appendWatchLog({
        scope: "app",
        level: enabled ? "warning" : "info",
        message: enabled ? "Modo demo ativado" : "Modo demo desativado",
      });
      set({
        persisted,
        connectionMode: enabled ? "demo" : "idle",
        firmwareInfo: null,
        currentValues: enabled ? state.currentValues : {},
        appliedValues: enabled ? state.appliedValues : {},
        outcomes: enabled ? state.outcomes : {},
        telemetry: enabled ? state.telemetry : [],
        snapshot: createSnapshot({
          ...state,
          persisted,
          firmwareInfo: null,
          connectionMode: enabled ? "demo" : "idle",
          currentValues: enabled ? state.currentValues : {},
          appliedValues: enabled ? state.appliedValues : {},
          outcomes: enabled ? state.outcomes : {},
          telemetry: enabled ? state.telemetry : [],
          status: enabled ? "demo" : "ready",
          statusText: enabled ? "Modo demo ativo" : "Modo demo desativado",
          connectionPort: enabled ? null : state.snapshot.connectionPort,
        }),
      });
    },
    setLaunchOnLogin: (enabled) => {
      const state = get();
      set({
        persisted: {
          ...state.persisted,
          launchOnLogin: enabled,
        },
      });
      get().appendWatchLog({
        scope: "app",
        level: enabled ? "info" : "warning",
        message: enabled
          ? "Inicializacao com a sessao ativada"
          : "Inicializacao com a sessao desativada",
      });
    },
    dismissOnboarding: () => {
      const state = get();
      if (state.persisted.onboardingDismissed) {
        return;
      }
      set({
        persisted: {
          ...state.persisted,
          onboardingDismissed: true,
        },
      });
      get().appendWatchLog({
        scope: "app",
        level: "info",
        message: "Onboarding inicial dispensado",
      });
    },
    selectProfile: (profileId) => {
      const state = get();
      const persisted = selectProfileById(state.persisted, profileId);

      if (persisted.selectedProfileId === state.persisted.selectedProfileId) {
        return;
      }

      set(
        createPersistedSnapshotUpdate(state, persisted, {
          currentValues: {},
          appliedValues: {},
          outcomes: {},
          telemetry: [],
          firmwareInfo: null,
        }),
      );
      get().appendWatchLog({
        scope: "app",
        level: "info",
        message: "Perfil ativo selecionado",
        detail: resolveActiveProfile(persisted).name,
      });
    },
    createProfile: () => {
      const state = get();
      const nextProfile = createProfileFromDefault(state.persisted.profiles);
      const persisted = {
        ...state.persisted,
        selectedProfileId: nextProfile.id,
        profiles: [...state.persisted.profiles, nextProfile],
      };

      set(
        createPersistedSnapshotUpdate(state, persisted, {
          currentValues: {},
          appliedValues: {},
          outcomes: {},
          telemetry: [],
          lastSerialLine: null,
          firmwareInfo: null,
        }),
      );
      get().appendWatchLog({
        scope: "app",
        level: "info",
        message: "Novo perfil criado",
        detail: nextProfile.name,
      });
    },
    applyPreset: (presetKey) => {
      const preset = findPreset(presetKey);
      if (!preset) {
        get().appendWatchLog({
          scope: "app",
          level: "warning",
          message: "Preset desconhecido ignorado",
          detail: presetKey,
        });
        return;
      }

      const state = get();
      const nextProfile = createProfileFromPreset(
        preset,
        state.persisted.profiles,
      );
      const persisted = {
        ...state.persisted,
        selectedProfileId: nextProfile.id,
        profiles: [...state.persisted.profiles, nextProfile],
      };

      set(
        createPersistedSnapshotUpdate(state, persisted, {
          currentValues: {},
          appliedValues: {},
          outcomes: {},
          telemetry: [],
          lastSerialLine: null,
          firmwareInfo: null,
        }),
      );
      get().appendWatchLog({
        scope: "app",
        level: "info",
        message: "Perfil criado a partir de preset",
        detail: `${preset.name} (${nextProfile.name})`,
      });
    },
    exportActiveProfile: async () => {
      const state = get();
      const profile = resolveActiveProfile(state.persisted);
      const safeName = profile.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const fileName = `ioruba-perfil-${safeName || "perfil"}.json`;

      try {
        const path = await exportProfile(
          fileName,
          serializeProfileDraft(profile),
        );
        get().appendWatchLog({
          scope: "app",
          level: path ? "info" : "warning",
          message: path ? "Perfil exportado" : "Exportacao de perfil cancelada",
          detail: path ?? undefined,
        });
      } catch (error) {
        get().appendWatchLog({
          scope: "backend",
          level: "error",
          message: "Falha ao exportar perfil",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    },
    importProfileFromFile: async () => {
      let raw: string | null;
      try {
        raw = await importProfile();
      } catch (error) {
        get().appendWatchLog({
          scope: "backend",
          level: "error",
          message: "Falha ao importar perfil",
          detail: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      if (raw === null) {
        return;
      }

      const parsed = parseProfileDraft(raw);
      if (!parsed.ok) {
        get().appendWatchLog({
          scope: "app",
          level: "error",
          message: "Perfil importado invalido",
          detail: parsed.error,
        });
        return;
      }

      const state = get();
      const nextProfile = prepareImportedProfile(
        parsed.value,
        state.persisted.profiles,
      );
      const persisted = {
        ...state.persisted,
        selectedProfileId: nextProfile.id,
        profiles: [...state.persisted.profiles, nextProfile],
      };

      set(
        createPersistedSnapshotUpdate(state, persisted, {
          currentValues: {},
          appliedValues: {},
          outcomes: {},
          telemetry: [],
          lastSerialLine: null,
          firmwareInfo: null,
        }),
      );
      get().appendWatchLog({
        scope: "app",
        level: "info",
        message: "Perfil importado",
        detail: nextProfile.name,
      });
    },
    duplicateActiveProfile: () => {
      const state = get();
      const nextProfile = duplicateProfileConfig(
        resolveActiveProfile(state.persisted),
        state.persisted.profiles,
      );
      const persisted = {
        ...state.persisted,
        selectedProfileId: nextProfile.id,
        profiles: [...state.persisted.profiles, nextProfile],
      };

      set(
        createPersistedSnapshotUpdate(state, persisted, {
          currentValues: {},
          appliedValues: {},
          outcomes: {},
          telemetry: [],
          lastSerialLine: null,
          firmwareInfo: null,
        }),
      );
      get().appendWatchLog({
        scope: "app",
        level: "info",
        message: "Perfil duplicado",
        detail: nextProfile.name,
      });
    },
    removeActiveProfile: () => {
      const state = get();
      const activeProfile = resolveActiveProfile(state.persisted);
      const persisted = removeProfileById(state.persisted, activeProfile.id);

      if (persisted.profiles.length === state.persisted.profiles.length) {
        get().appendWatchLog({
          scope: "app",
          level: "warning",
          message: "Remocao ignorada",
          detail: "O ultimo perfil nao pode ser removido",
        });
        return;
      }

      set(
        createPersistedSnapshotUpdate(state, persisted, {
          currentValues: {},
          appliedValues: {},
          outcomes: {},
          telemetry: [],
          lastSerialLine: null,
          firmwareInfo: null,
        }),
      );
      get().appendWatchLog({
        scope: "app",
        level: "warning",
        message: "Perfil removido",
        detail: activeProfile.name,
      });
    },
    updateActiveProfileConfig: (profile) => {
      const state = get();
      const persisted = replaceActiveProfile(state.persisted, profile);
      set(createPersistedSnapshotUpdate(state, persisted));
    },
    setPreferredPort: (port) => {
      const state = get();
      const persisted = replaceActiveProfile(state.persisted, {
        ...resolveActiveProfile(state.persisted),
        serial: {
          ...resolveActiveProfile(state.persisted).serial,
          preferredPort: port,
        },
      });
      set({
        persisted: {
          ...persisted,
          lastPort: port,
        },
        configDraft: serializeActiveProfile(persisted),
      });
      get().appendWatchLog({
        scope: "app",
        level: "info",
        message: "Porta preferida atualizada",
        detail: port ?? "detectar automaticamente",
      });
    },
    setThemeMode: (theme) => {
      const state = get();
      const persisted = replaceActiveProfile(state.persisted, {
        ...resolveActiveProfile(state.persisted),
        ui: {
          ...resolveActiveProfile(state.persisted).ui,
          theme,
        },
      });

      set({
        persisted,
        configDraft: serializeActiveProfile(persisted),
      });

      get().appendWatchLog({
        scope: "app",
        level: "info",
        message: "Tema da interface atualizado",
        detail: theme,
      });
    },
    setConfigDraft: (draft) => set({ configDraft: draft }),
    applyConfigDraft: () => {
      const state = get();
      const validation = parseProfileDraft(state.configDraft);

      if (!validation.ok) {
        get().appendWatchLog({
          scope: "app",
          level: "error",
          message: "Falha ao salvar perfil",
          detail: validation.error,
        });
        throw new Error(validation.error);
      }

      const persisted = replaceActiveProfile(state.persisted, validation.value);
      set({
        persisted,
        configDraft: serializeActiveProfile(persisted),
        snapshot: createSnapshot({
          ...state,
          persisted,
          status: state.snapshot.status,
          statusText: "Perfil atualizado",
          connectionMode: state.connectionMode,
          connectionPort: state.snapshot.connectionPort,
        }),
      });
      get().appendWatchLog({
        scope: "app",
        level: "info",
        message: "Perfil ativo atualizado",
        detail: validation.value.name,
      });
    },
    resetProfile: () => {
      const state = get();
      const activeProfile = resolveActiveProfile(state.persisted);
      const restoredProfile = {
        ...cloneProfile(defaultPersistedState.profiles[0]),
        id: activeProfile.id,
        name: activeProfile.name,
      };
      const persisted = replaceActiveProfile(state.persisted, restoredProfile);

      set({
        ...createPersistedSnapshotUpdate(state, persisted, {
          currentValues: {},
          appliedValues: {},
          outcomes: {},
          telemetry: [],
          lastSerialLine: null,
        }),
        currentValues: {},
        appliedValues: {},
        outcomes: {},
        telemetry: [],
        snapshot: buildRuntimeSnapshot({
          profile: resolveActiveProfile(persisted),
          status: state.snapshot.status,
          statusText: "Perfil padrão restaurado",
          availablePorts: state.availablePorts,
          connectionPort: state.snapshot.connectionPort,
          lastSerialLine: null,
          demoMode: state.connectionMode === "demo",
          currentValues: {},
          appliedValues: {},
          outcomes: {},
          telemetry: [],
          audioInventory: state.audioInventory,
          firmwareInfo: state.firmwareInfo,
        }),
      });
      get().appendWatchLog({
        scope: "app",
        level: "warning",
        message: "Perfil restaurado para o padrao",
        detail: activeProfile.name,
      });
    },
    processSerialLine: (rawLine) => {
      const state = get();
      const packet = parseSerialPacket(rawLine);
      const activeProfile = resolveActiveProfile(state.persisted);

      if (packet.kind === "handshake") {
        const trimmedLine = rawLine.trim();
        const firmwareInfo = packet.info;

        get().appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Handshake do firmware recebido",
          detail: formatFirmwareLabel(firmwareInfo),
        });

        if (!firmwareInfo.protocolSupported) {
          get().appendWatchLog({
            scope: "serial",
            level: "warning",
            message: "Protocolo do firmware incompativel com o esperado",
            detail: `firmware protocolo ${firmwareInfo.protocolVersion} | esperado ${SUPPORTED_PROTOCOL_VERSION}`,
          });
        }

        if (
          firmwareInfo.knobCount !== null &&
          firmwareInfo.knobCount !== activeProfile.sliders.length
        ) {
          get().appendWatchLog({
            scope: "serial",
            level: "warning",
            message: "Quantidade de knobs do firmware difere do perfil ativo",
            detail: `firmware ${firmwareInfo.knobCount} | perfil ${activeProfile.sliders.length}`,
          });
        }

        set({
          firmwareInfo,
          lastSerialLine: rawLine,
          snapshot: createSnapshot({
            ...state,
            firmwareInfo,
            lastSerialLine: rawLine,
            status: "connected",
            statusText: `Handshake OK | ${formatFirmwareLabel(firmwareInfo)}`,
            connectionPort: state.snapshot.connectionPort,
            connectionMode: state.connectionMode,
          }),
        });

        if (trimmedLine) {
          get().appendWatchLog({
            scope: "serial",
            level: "info",
            message: "Payload bruto do handshake",
            detail: trimmedLine,
          });
        }

        return { sliderUpdates: [], controlActions: [] };
      }

      if (packet.kind === "control") {
        const controlActions = resolveControlActions(activeProfile, packet);
        const detail =
          packet.input === "button"
            ? `button:${packet.controlId} ${packet.event}`
            : `encoder:${packet.controlId} delta=${packet.delta}`;

        get().appendWatchLog({
          scope: "serial",
          level: controlActions.length > 0 ? "info" : "warning",
          message:
            controlActions.length > 0
              ? "Evento de controle recebido"
              : "Evento de controle sem binding no perfil",
          detail,
        });

        set({
          lastSerialLine: rawLine,
          lastFrameAt: Date.now(),
          snapshot: createSnapshot({
            ...state,
            lastSerialLine: rawLine,
            status: "connected",
            statusText: `Controle recebido | ${detail}`,
            connectionPort: state.snapshot.connectionPort,
            connectionMode: state.connectionMode,
          }),
        });

        return { sliderUpdates: [], controlActions };
      }

      // Resolução do ADC reportada pela placa (handshake `adcBits`); 10-bit por
      // padrão quando o firmware não informa. Determina clamp e normalização.
      const adcMax = adcMaxForBits(state.firmwareInfo?.adcBits ?? DEFAULT_ADC_BITS);

      const nextCurrentValues =
        packet.kind === "state"
          ? mergeSliderPacket(
              state.currentValues,
              packet.values,
              activeProfile.sliders.length,
              adcMax,
            )
          : {
              ...state.currentValues,
              [packet.sliderId]: clampSliderValue(packet.value, adcMax),
            };

      const updates = resolveFilteredUpdates(
        activeProfile,
        nextCurrentValues,
        state.appliedValues,
      );

      const telemetryPoints = updates.map((update) => {
        const slider = activeProfile.sliders.find(
          (candidate) => candidate.id === update.sliderId,
        );
        const rawValue = nextCurrentValues[update.sliderId] ?? 0;

        return {
          tick: state.tick + 1,
          knobId: update.sliderId,
          rawValue,
          appliedValue: update.rawValue,
          percent: slider
            ? sliderToAppliedPercent(slider, rawValue, adcMax)
            : sliderValueToPercent(rawValue, adcMax),
        };
      });

      const telemetry = pushTelemetry(
        state.telemetry,
        telemetryPoints,
        activeProfile.ui.telemetryWindow,
      );
      // Session aggregates track every point, independent of the display
      // window (so they hold even when telemetryWindow is 0).
      const sessionStats = updateSessionStats(
        state.sessionStats,
        telemetryPoints,
      );
      const trimmedLine = rawLine.trim();

      get().appendWatchLog({
        scope: "serial",
        level: "info",
        message: "Frame serial recebido",
        detail: trimmedLine || rawLine,
      });

      set({
        currentValues: nextCurrentValues,
        telemetry,
        sessionStats,
        tick: state.tick + 1,
        lastSerialLine: rawLine,
        lastFrameAt: Date.now(),
        snapshot: createSnapshot({
          ...state,
          currentValues: nextCurrentValues,
          telemetry,
          lastSerialLine: rawLine,
          status: "connected",
          statusText: `Recebendo dados | ${rawLine.trim()}`,
          connectionPort: state.snapshot.connectionPort,
          connectionMode: state.connectionMode,
        }),
      });

      if (updates.length > 0) {
        get().appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Slideres elegiveis para aplicacao",
          detail: updates
            .map(
              (update) =>
                `${sliderNameForId(activeProfile, update.sliderId)}:${update.rawValue}`,
            )
            .join(" | "),
        });
      }

      return { sliderUpdates: updates, controlActions: [] };
    },
    commitAppliedResults: (updates, nextOutcomes) => {
      const state = get();
      const appliedValues = { ...state.appliedValues };
      const outcomes = { ...state.outcomes };

      for (const update of updates) {
        appliedValues[update.sliderId] = update.rawValue;
        outcomes[update.sliderId] =
          nextOutcomes[update.sliderId] ?? createFallbackOutcome();
      }

      if (updates.length > 0) {
        const activeProfile = resolveActiveProfile(state.persisted);
        get().appendWatchLog({
          scope: "app",
          level: "info",
          message: "Resultados aplicados no estado local",
          detail: updates
            .map(
              (update) =>
                `${sliderNameForId(activeProfile, update.sliderId)} -> ${outcomeSummary(outcomes[update.sliderId])}`,
            )
            .join(" | "),
        });
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
          connectionMode: state.connectionMode,
        }),
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
          percent: sliderToAppliedPercent(slider, rawValue),
        };
      });
      const telemetry = pushTelemetry(
        state.telemetry,
        telemetryPoints,
        activeProfile.ui.telemetryWindow,
      );
      const appliedValues = { ...currentValues };
      const outcomes = activeProfile.sliders.reduce<
        Record<number, SliderOutcome>
      >((accumulator, slider) => {
        accumulator[slider.id] = {
          summary: `demo -> ${slider.name}`,
          severity: "success",
          targets: slider.targets.map((target) => ({
            target:
              target.kind === "master"
                ? "master"
                : `${target.kind}:${target.name}`,
            status: "updated",
            detail: "Simulado localmente sem backend de áudio real.",
            matched: [],
          })),
        };
        return accumulator;
      }, {});

      get().appendWatchLog({
        scope: "serial",
        level: "info",
        message: "Passo de demo gerado",
        detail: `tick ${tick}`,
      });

      set({
        tick,
        currentValues,
        appliedValues,
        outcomes,
        telemetry,
        lastSerialLine: `demo:${tick}`,
        lastFrameAt: Date.now(),
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
          connectionMode: "demo",
        }),
      });
    },
  };
});
