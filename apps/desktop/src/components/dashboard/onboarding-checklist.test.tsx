// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildRuntimeSnapshot,
  defaultProfile,
  emptyAudioInventory,
  type AudioInventory,
  type FirmwareInfo,
  type RuntimeSnapshot
} from "@ioruba/shared";

import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

afterEach(() => {
  cleanup();
});

function snapshot(firmware: FirmwareInfo | null = null): RuntimeSnapshot {
  return buildRuntimeSnapshot({
    profile: defaultProfile,
    status: "disconnected",
    statusText: "",
    availablePorts: [],
    connectionPort: null,
    lastSerialLine: null,
    demoMode: false,
    currentValues: {},
    appliedValues: {},
    outcomes: {},
    telemetry: [],
    firmwareInfo: firmware
  });
}

function inventory(backend: AudioInventory["backend"]): AudioInventory {
  return { ...emptyAudioInventory, backend };
}

function renderChecklist(backend: AudioInventory["backend"]) {
  return render(
    <OnboardingChecklist
      snapshot={snapshot()}
      audioInventory={inventory(backend)}
      language="pt-BR"
      onDismiss={() => { }}
    />
  );
}

describe("OnboardingChecklist", () => {
  it.each(["pactl", "windows", "macos"] as const)(
    "marks the audio step ready for the %s backend",
    (backend) => {
      renderChecklist(backend);

      expect(
        screen.getByText(new RegExp(`backend de áudio disponível\\. \\(${backend}\\)`, "i"))
      ).not.toBeNull();
    }
  );

  it("leaves the audio step pending with Linux guidance when unsupported", () => {
    renderChecklist("unsupported");

    expect(
      screen.getByText(/controle de áudio do sistema indisponível/i)
    ).not.toBeNull();
    expect(screen.getByText(/0\/3/)).not.toBeNull();
  });
});
