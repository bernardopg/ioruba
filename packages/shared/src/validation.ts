import { defaultPersistedState } from "./defaults";
import type {
  AudioTarget,
  MixerProfile,
  PersistedState,
  SliderConfig
} from "./types";

type PersistedStateCandidate = Partial<Omit<PersistedState, "profiles">> & {
  profiles?: Array<Partial<MixerProfile>> | null;
};

export function normalizePersistedState(
  candidate: PersistedStateCandidate | null | undefined
): PersistedState {
  if (!candidate) {
    return clonePersistedState(defaultPersistedState);
  }

  const fallbackProfiles = defaultPersistedState.profiles.map(cloneProfile);
  const normalizedProfiles = Array.isArray(candidate.profiles)
    ? candidate.profiles
        .map(normalizeProfile)
        .filter((profile): profile is MixerProfile => profile !== null)
    : fallbackProfiles;
  const profiles = normalizedProfiles.length > 0 ? normalizedProfiles : fallbackProfiles;

  const fallbackProfile = profiles[0] ?? defaultPersistedState.profiles[0];
  const selectedProfileId =
    typeof candidate.selectedProfileId === "string" &&
    profiles.some((profile) => profile.id === candidate.selectedProfileId)
      ? candidate.selectedProfileId
      : fallbackProfile.id;

  return {
    selectedProfileId,
    profiles,
    lastWindow: {
      width:
        typeof candidate.lastWindow?.width === "number"
          ? candidate.lastWindow.width
          : defaultPersistedState.lastWindow.width,
      height:
        typeof candidate.lastWindow?.height === "number"
          ? candidate.lastWindow.height
          : defaultPersistedState.lastWindow.height
    },
    demoMode: Boolean(candidate.demoMode),
    launchOnLogin:
      typeof candidate.launchOnLogin === "boolean"
        ? candidate.launchOnLogin
        : defaultPersistedState.launchOnLogin,
    lastPort:
      typeof candidate.lastPort === "string" ? candidate.lastPort : null
  };
}

function normalizeProfile(candidate: Partial<MixerProfile>): MixerProfile | null {
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return null;
  }

  const sliders = Array.isArray(candidate.sliders)
    ? candidate.sliders
        .map(normalizeSlider)
        .filter((slider): slider is SliderConfig => slider !== null)
    : [];

  if (sliders.length === 0) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    serial: {
      preferredPort:
        typeof candidate.serial?.preferredPort === "string"
          ? candidate.serial.preferredPort
          : null,
      baudRate:
        typeof candidate.serial?.baudRate === "number"
          ? candidate.serial.baudRate
          : 9600,
      autoConnect: candidate.serial?.autoConnect ?? true,
      heartbeatTimeoutMs:
        typeof candidate.serial?.heartbeatTimeoutMs === "number"
          ? candidate.serial.heartbeatTimeoutMs
          : 3000
    },
    audio: {
      noiseReduction: candidate.audio?.noiseReduction ?? "default",
      smoothTransitions: candidate.audio?.smoothTransitions ?? true,
      transitionDurationMs:
        typeof candidate.audio?.transitionDurationMs === "number"
          ? candidate.audio.transitionDurationMs
          : 50
    },
    firmware: {
      changeThreshold:
        typeof candidate.firmware?.changeThreshold === "number"
          ? candidate.firmware.changeThreshold
          : defaultPersistedState.profiles[0]?.firmware.changeThreshold ?? 4,
      edgeDeadzone:
        typeof candidate.firmware?.edgeDeadzone === "number"
          ? candidate.firmware.edgeDeadzone
          : defaultPersistedState.profiles[0]?.firmware.edgeDeadzone ?? 7,
      smoothingStrength:
        typeof candidate.firmware?.smoothingStrength === "number"
          ? candidate.firmware.smoothingStrength
          : defaultPersistedState.profiles[0]?.firmware.smoothingStrength ?? 75
    },
    ui: {
      language: candidate.ui?.language ?? "pt-BR",
      theme: candidate.ui?.theme ?? "system",
      showVisualizers: candidate.ui?.showVisualizers ?? true,
      telemetryWindow:
        typeof candidate.ui?.telemetryWindow === "number"
          ? candidate.ui.telemetryWindow
          : 120
    },
    sliders
  };
}

function normalizeSlider(candidate: Partial<SliderConfig>): SliderConfig | null {
  if (
    typeof candidate.id !== "number" ||
    typeof candidate.name !== "string" ||
    !Array.isArray(candidate.targets) ||
    candidate.targets.length === 0
  ) {
    return null;
  }

  const targets = candidate.targets
    .map(normalizeTarget)
    .filter((target): target is AudioTarget => target !== null);

  if (targets.length === 0) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    targets,
    inverted: candidate.inverted ?? false,
    calibration: {
      minRaw:
        typeof candidate.calibration?.minRaw === "number"
          ? candidate.calibration.minRaw
          : 0,
      maxRaw:
        typeof candidate.calibration?.maxRaw === "number"
          ? candidate.calibration.maxRaw
          : 1023
    }
  };
}

function normalizeTarget(candidate: Partial<AudioTarget>): AudioTarget | null {
  switch (candidate.kind) {
    case "master":
      return { kind: "master" };
    case "application":
      return typeof candidate.name === "string"
        ? { kind: "application", name: candidate.name }
        : null;
    case "source":
      return typeof candidate.name === "string"
        ? { kind: "source", name: candidate.name }
        : null;
    case "sink":
      return typeof candidate.name === "string"
        ? { kind: "sink", name: candidate.name }
        : null;
    default:
      return null;
  }
}

function clonePersistedState(state: PersistedState): PersistedState {
  return {
    ...state,
    profiles: state.profiles.map(cloneProfile),
    lastWindow: {
      ...state.lastWindow
    }
  };
}

function cloneProfile(profile: MixerProfile): MixerProfile {
  return {
    ...profile,
    serial: {
      ...profile.serial
    },
    audio: {
      ...profile.audio
    },
    firmware: {
      ...profile.firmware
    },
    ui: {
      ...profile.ui
    },
    sliders: profile.sliders.map((slider) => ({
      ...slider,
      calibration: slider.calibration
        ? {
            ...slider.calibration
          }
        : undefined,
      targets: slider.targets.map((target) => ({ ...target }))
    }))
  };
}
