// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";
import { ProfileWorkbench } from "@/components/config/profile-workbench";
import { KnobPanel } from "@/components/dashboard/knob-panel";
import { WatchLogPanel } from "@/components/dashboard/watch-log-panel";
import { parseProfileDraft, serializeProfileDraft } from "@/lib/profile-config";
import { useIorubaStore } from "@/store/ioruba-store";
import {
  defaultPersistedState,
  defaultProfile,
  emptyAudioInventory,
  resolveActiveProfile
} from "@ioruba/shared";

vi.mock("@/hooks/use-background-tray", () => ({
  useBackgroundTray: () => undefined
}));

vi.mock("@/hooks/use-persistence", () => ({
  usePersistence: () => undefined
}));

vi.mock("@/hooks/use-runtime-boot", () => ({
  useRuntimeBoot: () => undefined
}));

vi.mock("@/hooks/use-serial-runtime", () => ({
  useSerialRuntime: () => undefined
}));

vi.mock("@/hooks/use-theme-sync", () => ({
  useThemeSync: () => undefined
}));

vi.mock("@/hooks/use-watch-bridge", () => ({
  useWatchBridge: () => undefined
}));

vi.mock("@/lib/backend", async () => {
  const actual = await vi.importActual<typeof import("@/lib/backend")>("@/lib/backend");

  return {
    ...actual,
    listAudioInventory: vi.fn(async () => emptyAudioInventory),
    setLaunchOnLoginEnabled: vi.fn(async (enabled: boolean) => enabled),
    appendWatchLogEntry: vi.fn(async () => undefined),
    clearWatchLogEntries: vi.fn(async () => undefined)
  };
});

vi.mock("@/components/dashboard/telemetry-chart", () => ({
  TelemetryChart: () => <div data-testid="telemetry-chart" />
}));

function buildPersistedState(language: "pt-BR" | "en" = "pt-BR") {
  const baseProfile = {
    ...structuredClone(defaultProfile),
    ui: {
      ...structuredClone(defaultProfile.ui),
      language
    }
  };

  const alternateProfile = {
    ...baseProfile,
    id: "streaming-profile",
    name: "Streaming Desk",
    serial: {
      ...structuredClone(defaultProfile.serial),
      autoConnect: false
    }
  };

  return {
    ...structuredClone(defaultPersistedState),
    selectedProfileId: alternateProfile.id,
    profiles: [baseProfile, alternateProfile]
  };
}

describe("desktop accessibility shell", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      }
    );
    HTMLElement.prototype.scrollIntoView = vi.fn();
    useIorubaStore.setState(useIorubaStore.getInitialState());
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("renders a skip link that targets the primary tabs container", () => {
    render(<App />);

    const skipLink = screen.getByRole("link", {
      name: /pular para o conteúdo principal/i
    });
    expect(skipLink.getAttribute("href")).toBe("#app-content");

    const tablist = screen.getByRole("tablist", {
      name: /navegação principal do ioruba/i
    });
    expect(tablist.getAttribute("id")).toBe("app-content");
    expect(tablist.getAttribute("tabindex")).toBe("-1");
  });

  it("renders key session and diagnostics copy in English when the active profile language is en", () => {
    const persisted = buildPersistedState("en");
    const store = useIorubaStore.getState();
    store.hydrate(persisted, store.audioInventory);

    render(<App />);

    expect(screen.getByRole("heading", { name: /connection and session/i })).not.toBeNull();
    expect(screen.getByText(/preferred port/i)).not.toBeNull();
    expect(screen.getByRole("option", { name: /detect automatically/i })).not.toBeNull();
    expect(screen.getByRole("tab", { name: /diagnostics/i })).not.toBeNull();
    expect(screen.getAllByRole("status").some((region) => region.textContent?.includes("Ready to connect"))).toBe(true);
  });

  it("exposes descriptive labels and live status regions in the main session card", () => {
    render(<App />);

    expect(screen.getByRole("switch", { name: /modo demo/i }).getAttribute("aria-describedby")).toBe(
      "demo-mode-description"
    );
    expect(
      screen.getByRole("switch", { name: /iniciar com a sessão/i }).getAttribute("aria-describedby")
    ).toBe("launch-on-login-description");

    const statusRegions = screen.getAllByRole("status");
    expect(statusRegions.length).toBeGreaterThanOrEqual(2);
    expect(statusRegions.some((region) => region.textContent?.includes("Sessão ready"))).toBe(true);
    expect(statusRegions.some((region) => region.textContent?.includes("Pronto para conectar"))).toBe(true);
  });

  it("marks the selected profile card as pressed for keyboard users", () => {
    const persisted = buildPersistedState();
    const activeProfile = resolveActiveProfile(persisted);
    const configDraft = serializeProfileDraft(activeProfile);
    const draftValidation = parseProfileDraft(configDraft);

    if (!draftValidation.ok) {
      throw new Error("expected valid draft for accessibility test");
    }

    render(
      <ProfileWorkbench
        activeProfile={activeProfile}
        appendWatchLog={vi.fn()}
        applyConfigDraft={vi.fn()}
        audioInventory={emptyAudioInventory}
        availablePorts={[]}
        configDraft={configDraft}
        createProfile={vi.fn()}
        draftIsDirty={false}
        draftStatusHint="Perfil salvo"
        draftStatusLabel="Perfil salvo"
        draftStatusTone="positive"
        draftValidation={draftValidation}
        duplicateActiveProfile={vi.fn()}
        language="pt-BR"
        persisted={persisted}
        removeActiveProfile={vi.fn()}
        resetProfile={vi.fn()}
        selectProfile={vi.fn()}
        setConfigDraft={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /streaming desk/i }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(screen.getByRole("button", { name: /linux mixer/i }).getAttribute("aria-pressed")).toBe(
      "false"
    );
  });

  it("announces the latest knob outcome through an accessible status region", () => {
    const knob = useIorubaStore.getState().snapshot.knobs[0];

    if (!knob) {
      throw new Error("expected default knob snapshot for accessibility test");
    }

    render(<KnobPanel knob={knob} />);

    const outcomeStatus = screen.getByRole("status");
    expect(outcomeStatus.textContent?.includes("Ultimo resultado")).toBe(true);
    expect(outcomeStatus.textContent?.includes(knob.outcome.summary)).toBe(true);
  });

  it("renders the watch panel copy in English when requested", () => {
    const store = useIorubaStore.getState();
    const snapshot = store.snapshot;

    render(
      <WatchLogPanel
        activeProfileName="Linux Mixer"
        language="en"
        onClear={vi.fn()}
        snapshot={snapshot}
        watchLog={[]}
      />
    );

    expect(screen.getByText(/live watch/i)).not.toBeNull();
    expect(screen.getByRole("button", { name: /clear/i })).not.toBeNull();
    expect(screen.getByText(/no events for the current filter/i)).not.toBeNull();
  });

  it("keeps the watch log viewport keyboard-focusable for scrolling", () => {
    const store = useIorubaStore.getState();
    const snapshot = store.snapshot;

    render(
      <WatchLogPanel
        activeProfileName="Linux Mixer"
        language="pt-BR"
        onClear={vi.fn()}
        snapshot={snapshot}
        watchLog={[
          {
            seq: 1,
            timestampMs: 1,
            scope: "app",
            level: "info",
            message: "Sessão iniciada"
          }
        ]}
      />
    );

    const logEntry = screen.getByText("Sessão iniciada");
    const scrollViewport = logEntry.closest("article")?.parentElement;

    expect(scrollViewport?.getAttribute("tabindex")).toBe("0");
    expect(scrollViewport?.getAttribute("role")).toBe("log");
    expect(scrollViewport?.getAttribute("aria-live")).toBe("polite");
    expect(scrollViewport?.getAttribute("aria-label")).toBe("Watch ao vivo");
  });
});
