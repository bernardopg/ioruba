import type { AudioInventory, MixerProfile, PersistedState } from "./types";

export const DEFAULT_PROFILE_ID = "default-linux-profile";

export const defaultProfile: MixerProfile = {
  id: DEFAULT_PROFILE_ID,
  name: "Linux Mixer",
  serial: {
    preferredPort: null,
    baudRate: 9600,
    autoConnect: true,
    heartbeatTimeoutMs: 3000
  },
  sliders: [
    {
      id: 0,
      name: "Master Volume",
      targets: [{ kind: "master" }]
    },
    {
      id: 1,
      name: "Applications",
      targets: [
        { kind: "application", name: "Spotify" },
        { kind: "application", name: "Google Chrome" },
        { kind: "application", name: "Firefox" }
      ]
    },
    {
      id: 2,
      name: "Microphone",
      targets: [{ kind: "source", name: "default_microphone" }]
    }
  ],
  audio: {
    noiseReduction: "default",
    smoothTransitions: true,
    transitionDurationMs: 50
  },
  ui: {
    language: "pt-BR",
    theme: "system",
    showVisualizers: true,
    telemetryWindow: 120
  }
};

export const defaultPersistedState: PersistedState = {
  selectedProfileId: DEFAULT_PROFILE_ID,
  profiles: [defaultProfile],
  lastWindow: {
    width: 1440,
    height: 920
  },
  demoMode: false,
  lastPort: null
};

export const emptyAudioInventory: AudioInventory = {
  backend: "unsupported",
  applications: [],
  sinks: [],
  sources: [],
  defaultSink: null,
  defaultSource: null,
  summary: "Audio backend unavailable",
  diagnostics: ["No supported audio backend detected"]
};
