import { describe, expect, it } from "vitest";

import {
  CURRENT_PERSISTED_STATE_SCHEMA_VERSION,
  defaultPersistedState,
  defaultProfile,
  normalizePersistedState
} from "../src/index";

describe("persisted state normalization", () => {
  it("falls back to the shipped default state when no candidate is provided", () => {
    const normalized = normalizePersistedState(undefined);

    expect(normalized).toEqual(defaultPersistedState);
    expect(normalized).not.toBe(defaultPersistedState);
    expect(normalized.profiles[0]).not.toBe(defaultPersistedState.profiles[0]);
  });

  it("defaults launch-on-login to false when the persisted payload is stale", () => {
    const normalized = normalizePersistedState({
      selectedProfileId: defaultProfile.id,
      profiles: [defaultProfile]
    });

    expect(normalized.schemaVersion).toBe(CURRENT_PERSISTED_STATE_SCHEMA_VERSION);
    expect(normalized.launchOnLogin).toBe(false);
    expect(normalized.notificationsEnabled).toBe(true);
  });

  it("preserves additive release notification preferences", () => {
    const normalized = normalizePersistedState({
      selectedProfileId: defaultProfile.id,
      profiles: [defaultProfile],
      notificationsEnabled: false,
      lastNotifiedReleaseVersion: "1.6.0"
    });

    expect(normalized.notificationsEnabled).toBe(false);
    expect(normalized.lastNotifiedReleaseVersion).toBe("1.6.0");
  });

  it("fills missing nested profile settings with defaults", () => {
    const normalized = normalizePersistedState({
      selectedProfileId: "custom-profile",
      profiles: [
        {
          id: "custom-profile",
          name: "Custom profile",
          sliders: [
            {
              id: 0,
              name: "Master",
              targets: [{ kind: "master" }]
            }
          ]
        }
      ]
    });

    expect(normalized.selectedProfileId).toBe("custom-profile");
    expect(normalized.profiles[0]?.serial).toEqual(defaultProfile.serial);
    expect(normalized.profiles[0]?.audio).toEqual(defaultProfile.audio);
    expect(normalized.profiles[0]?.firmware).toEqual(defaultProfile.firmware);
    expect(normalized.profiles[0]?.ui).toEqual(defaultProfile.ui);
    expect(normalized.profiles[0]?.sliders[0]?.calibration).toEqual({
      minRaw: 0,
      maxRaw: 1023
    });
  });

  it("recovers from invalid profiles and stale selections", () => {
    const normalized = normalizePersistedState({
      selectedProfileId: "missing-profile",
      profiles: [
        {
          id: "broken-profile",
          name: "Broken",
          sliders: []
        }
      ]
    });

    expect(normalized.profiles).toEqual(defaultPersistedState.profiles);
    expect(normalized.selectedProfileId).toBe(defaultPersistedState.selectedProfileId);
  });

  it("accepts every supported UI language and falls back to pt-BR otherwise", () => {
    const withLanguage = (language: unknown) =>
      normalizePersistedState({
        selectedProfileId: defaultProfile.id,
        profiles: [
          {
            ...defaultProfile,
            ui: { ...defaultProfile.ui, language: language as never }
          }
        ]
      }).profiles[0]?.ui.language;

    expect(withLanguage("pt-BR")).toBe("pt-BR");
    expect(withLanguage("en")).toBe("en");
    expect(withLanguage("es")).toBe("es");
    expect(withLanguage("fr")).toBe("pt-BR");
    expect(withLanguage(42)).toBe("pt-BR");
    expect(withLanguage(undefined)).toBe("pt-BR");
  });

  it("heals profiles saved with the pre-0.5.x default baud rate of 9600", () => {
    const normalized = normalizePersistedState({
      selectedProfileId: defaultProfile.id,
      profiles: [
        {
          ...defaultProfile,
          serial: { ...defaultProfile.serial, baudRate: 9600 }
        }
      ]
    });

    expect(normalized.profiles[0]?.serial.baudRate).toBe(115200);
  });

  it("keeps a non-legacy custom baud rate untouched", () => {
    const normalized = normalizePersistedState({
      selectedProfileId: defaultProfile.id,
      profiles: [
        {
          ...defaultProfile,
          serial: { ...defaultProfile.serial, baudRate: 57600 }
        }
      ]
    });

    expect(normalized.profiles[0]?.serial.baudRate).toBe(57600);
  });

  it("chooses the first valid profile when selection points to a missing id", () => {
    const normalized = normalizePersistedState({
      selectedProfileId: "ghost-profile",
      profiles: [
        {
          ...defaultProfile,
          id: "profile-a",
          name: "Profile A"
        },
        {
          ...defaultProfile,
          id: "profile-b",
          name: "Profile B"
        }
      ]
    });

    expect(normalized.selectedProfileId).toBe("profile-a");
    expect(normalized.profiles).toHaveLength(2);
  });
});
