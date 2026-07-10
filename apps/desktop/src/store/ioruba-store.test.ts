import { defaultProfile, resolveActiveProfile } from "@ioruba/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIorubaStore } from "./ioruba-store";

describe("ioruba store", () => {
  beforeEach(() => {
    useIorubaStore.setState(useIorubaStore.getInitialState());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("covers boot and serial status transitions in the snapshot", () => {
    const portPath = "/dev/ttyUSB0";

    expect(useIorubaStore.getState().snapshot.status).toBe("booting");
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Inicializando Ioruba Desktop",
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Inicializando serviços",
    );

    const initialState = useIorubaStore.getState();
    initialState.hydrate(initialState.persisted, initialState.audioInventory);

    expect(useIorubaStore.getState().snapshot.status).toBe("ready");
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Pronto para conectar",
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Pronto para conectar",
    );

    useIorubaStore.getState().requestConnect();

    expect(useIorubaStore.getState().snapshot.status).toBe("searching");
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Procurando uma porta serial do Arduino",
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Procurando um Arduino serial",
    );

    useIorubaStore
      .getState()
      .setStatus("connecting", `Abrindo ${portPath}...`, portPath);

    expect(useIorubaStore.getState().snapshot.status).toBe("connecting");
    expect(useIorubaStore.getState().snapshot.connectionPort).toBe(portPath);
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      `Abrindo ${portPath}...`,
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Abrindo porta serial e aguardando firmware",
    );

    const result = useIorubaStore.getState().processSerialLine("512|768|1023");

    expect(result.sliderUpdates).toHaveLength(3);
    expect(result.controlActions).toHaveLength(0);
    expect(useIorubaStore.getState().snapshot.status).toBe("connected");
    expect(useIorubaStore.getState().snapshot.connectionPort).toBe(portPath);
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Recebendo dados | 512|768|1023",
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Recebendo dados | 512|768|1023",
    );

    useIorubaStore
      .getState()
      .setStatus("error", "Falha ao processar frame serial", portPath);

    expect(useIorubaStore.getState().snapshot.status).toBe("error");
    expect(useIorubaStore.getState().snapshot.connectionPort).toBe(portPath);
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Falha ao processar frame serial",
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Falha ao processar frame serial",
    );
  });

  it("processes full frame packets", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);
    const result = useIorubaStore.getState().processSerialLine("512|768|1023");

    expect(result.sliderUpdates).toHaveLength(3);
    expect(useIorubaStore.getState().snapshot.knobs[0]?.rawValue).toBe(512);
  });

  it("throttles repeated frame logs to avoid flooding the watch log", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);

    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);

    const countFrameLogs = () =>
      useIorubaStore
        .getState()
        .watchLog.filter((entry) => entry.message === "Frame serial recebido")
        .length;

    // Drena uma rajada de frames idênticos no mesmo instante (como o buffer
    // serial acumulado ao conectar): apenas o primeiro deve ser logado.
    for (let i = 0; i < 50; i += 1) {
      useIorubaStore.getState().processSerialLine("512|768|1023");
    }
    expect(countFrameLogs()).toBe(1);

    // Dentro da janela de throttle: continua suprimido.
    vi.setSystemTime(1_000_000 + 500);
    useIorubaStore.getState().processSerialLine("512|768|1023");
    expect(countFrameLogs()).toBe(1);

    // Passada a janela: loga de novo (amostra).
    vi.setSystemTime(1_000_000 + 1_100);
    useIorubaStore.getState().processSerialLine("512|768|1023");
    expect(countFrameLogs()).toBe(2);
  });

  it("resolves button control events from the active profile", () => {
    const store = useIorubaStore.getState();
    store.hydrate(
      {
        ...store.persisted,
        profiles: [
          {
            ...defaultProfile,
            controls: [
              {
                input: "button",
                id: 0,
                name: "Mute button",
                event: "press",
                action: "mute",
              },
            ],
          },
        ],
      },
      store.audioInventory,
    );

    const result = useIorubaStore
      .getState()
      .processSerialLine("EV type=button; id=0; event=press");

    expect(result.sliderUpdates).toEqual([]);
    expect(result.controlActions).toEqual([
      {
        action: "mute",
        controlId: 0,
        controlName: "Mute button",
        input: "button",
        detail: "press -> mute",
      },
    ]);
  });

  it("enables demo mode and generates telemetry", () => {
    useIorubaStore.getState().setDemoMode(true);
    useIorubaStore.getState().runDemoStep();

    expect(useIorubaStore.getState().snapshot.status).toBe("demo");
    expect(useIorubaStore.getState().snapshot.telemetry.length).toBeGreaterThan(
      0,
    );
    expect(useIorubaStore.getState().snapshot.knobs[0]?.outcome.severity).toBe(
      "success",
    );
    expect(
      useIorubaStore.getState().snapshot.knobs[0]?.outcome.targets.length,
    ).toBeGreaterThan(0);
  });

  it("accumulates session stats from serial frames beyond the telemetry window", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);

    useIorubaStore.getState().processSerialLine("0|512|1023");
    useIorubaStore.getState().processSerialLine("1023|512|0");

    const stats = useIorubaStore.getState().sessionStats;
    expect(stats.sampleCount).toBeGreaterThan(0);
    expect(stats.firstTick).not.toBeNull();
    expect(stats.lastTick).not.toBeNull();

    const perKnob = Object.values(stats.perKnob);
    expect(perKnob.length).toBeGreaterThan(0);
    for (const knob of perKnob) {
      expect(knob.sampleCount).toBeGreaterThan(0);
      expect(knob.minPercent).toBeLessThanOrEqual(knob.maxPercent);
      expect(knob.lastPercent).toBeGreaterThanOrEqual(0);
      expect(knob.lastPercent).toBeLessThanOrEqual(100);
    }

    const firstKnob = perKnob[0];
    expect(firstKnob?.minPercent).toBe(0);
    expect(firstKnob?.maxPercent).toBe(100);
  });

  it("clears session stats via the explicit reset action", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);
    useIorubaStore.getState().processSerialLine("512|512|512");
    expect(useIorubaStore.getState().sessionStats.sampleCount).toBeGreaterThan(0);

    useIorubaStore.getState().resetSessionStats();

    const stats = useIorubaStore.getState().sessionStats;
    expect(stats.sampleCount).toBe(0);
    expect(stats.firstTick).toBeNull();
    expect(Object.keys(stats.perKnob)).toHaveLength(0);
  });

  it("resets session stats automatically when an action clears telemetry", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);
    useIorubaStore.getState().processSerialLine("0|512|1023");
    expect(useIorubaStore.getState().sessionStats.sampleCount).toBeGreaterThan(0);

    // setDemoMode(false) zera `telemetry` sem mencionar `sessionStats`; o
    // wrapper do `set` no store deve resetar os agregados junto.
    useIorubaStore.getState().setDemoMode(true);
    useIorubaStore.getState().setDemoMode(false);

    const stats = useIorubaStore.getState().sessionStats;
    expect(stats.sampleCount).toBe(0);
    expect(useIorubaStore.getState().telemetry).toHaveLength(0);
  });

  it("stores structured target diagnostics after applying results", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);

    const result = useIorubaStore.getState().processSerialLine("512|768|1023");

    useIorubaStore.getState().commitAppliedResults(result.sliderUpdates, {
      0: {
        summary: "Updated the default output to 50%",
        severity: "success",
        targets: [
          {
            target: "master",
            status: "updated",
            detail: "Updated the default output to 50%",
            matched: ["alsa_output.usb"],
          },
        ],
      },
    });

    const knobOutcome = useIorubaStore.getState().snapshot.knobs[0]?.outcome;

    expect(knobOutcome?.summary).toBe("Updated the default output to 50%");
    expect(knobOutcome?.severity).toBe("success");
    expect(knobOutcome?.targets).toEqual([
      {
        target: "master",
        status: "updated",
        detail: "Updated the default output to 50%",
        matched: ["alsa_output.usb"],
      },
    ]);
  });

  it("stores firmware metadata after receiving a handshake frame", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);

    const result = useIorubaStore
      .getState()
      .processSerialLine(
        "HELLO board=Ioruba Nano; fw=0.5.0; protocol=2; knobs=3; threshold=4; deadzone=7; smooth=75; mins=0,0,0; maxs=1023,1023,1023",
      );

    expect(result).toEqual({ sliderUpdates: [], controlActions: [] });
    expect(useIorubaStore.getState().firmwareInfo).toEqual({
      boardName: "Ioruba Nano",
      firmwareVersion: "0.5.0",
      protocolVersion: 2,
      protocolSupported: true,
      knobCount: 3,
      mcu: null,
      adcBits: null,
      controllerConfig: {
        changeThreshold: 4,
        edgeDeadzone: 7,
        smoothingStrength: 75,
        calibrations: [
          { minRaw: 0, maxRaw: 1023 },
          { minRaw: 0, maxRaw: 1023 },
          { minRaw: 0, maxRaw: 1023 },
        ],
      },
    });
    expect(useIorubaStore.getState().snapshot.status).toBe("connected");
    expect(useIorubaStore.getState().snapshot.statusText).toContain(
      "Handshake OK",
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.firmware).toEqual({
      boardName: "Ioruba Nano",
      firmwareVersion: "0.5.0",
      protocolVersion: 2,
      protocolSupported: true,
      knobCount: 3,
      mcu: null,
      adcBits: null,
      controllerConfig: {
        changeThreshold: 4,
        edgeDeadzone: 7,
        smoothingStrength: 75,
        calibrations: [
          { minRaw: 0, maxRaw: 1023 },
          { minRaw: 0, maxRaw: 1023 },
          { minRaw: 0, maxRaw: 1023 },
        ],
      },
    });
  });

  it("updates the persisted theme preference and keeps the draft in sync", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);

    useIorubaStore.getState().setThemeMode("dark");

    const nextState = useIorubaStore.getState();

    expect(resolveActiveProfile(nextState.persisted).ui.theme).toBe("dark");
    expect(JSON.parse(nextState.configDraft).ui.theme).toBe("dark");
  });

  it("updates the active profile language and keeps the draft in sync", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);

    useIorubaStore.getState().setLanguage("es");

    const nextState = useIorubaStore.getState();
    expect(resolveActiveProfile(nextState.persisted).ui.language).toBe("es");
    expect(JSON.parse(nextState.configDraft).ui.language).toBe("es");
  });

  it("deduplicates notifications and marks unread items as read", () => {
    const notification = {
      id: "release-1.6.0",
      kind: "release" as const,
      title: "Nova versão disponível",
      detail: "v1.6.0",
      read: false,
      createdAt: 1,
    };

    useIorubaStore.getState().pushNotification(notification);
    useIorubaStore.getState().pushNotification(notification);

    expect(useIorubaStore.getState().notifications).toHaveLength(1);
    expect(useIorubaStore.getState().notifications[0]?.read).toBe(false);

    useIorubaStore.getState().markNotificationsRead();
    expect(useIorubaStore.getState().notifications[0]?.read).toBe(true);
  });

  it("persists notification preferences and the last notified release", () => {
    useIorubaStore.getState().setNotificationsEnabled(false);
    useIorubaStore.getState().setLastNotifiedReleaseVersion("1.6.0");

    expect(useIorubaStore.getState().persisted.notificationsEnabled).toBe(false);
    expect(useIorubaStore.getState().persisted.lastNotifiedReleaseVersion).toBe(
      "1.6.0",
    );
  });

  it("stores the launch-on-login preference in persisted state", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);

    useIorubaStore.getState().setLaunchOnLogin(true);

    expect(useIorubaStore.getState().persisted.launchOnLogin).toBe(true);
  });

  it("creates, duplicates, selects and removes profiles while keeping the draft synchronized", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);

    useIorubaStore.getState().createProfile();

    let nextState = useIorubaStore.getState();
    const createdProfileId = nextState.persisted.selectedProfileId;

    expect(nextState.persisted.profiles).toHaveLength(2);
    expect(JSON.parse(nextState.configDraft).id).toBe(createdProfileId);

    useIorubaStore.getState().duplicateActiveProfile();

    nextState = useIorubaStore.getState();
    const duplicatedProfileId = nextState.persisted.selectedProfileId;

    expect(nextState.persisted.profiles).toHaveLength(3);
    expect(duplicatedProfileId).not.toBe(createdProfileId);

    useIorubaStore.getState().selectProfile(defaultProfile.id);

    nextState = useIorubaStore.getState();
    expect(nextState.persisted.selectedProfileId).toBe(defaultProfile.id);
    expect(JSON.parse(nextState.configDraft).id).toBe(defaultProfile.id);

    useIorubaStore.getState().removeActiveProfile();

    nextState = useIorubaStore.getState();
    expect(nextState.persisted.profiles).toHaveLength(2);
    expect(
      nextState.persisted.profiles.some(
        (profile) => profile.id === defaultProfile.id,
      ),
    ).toBe(false);
  });

  it("merges loaded watch logs with the current session and resequences them", () => {
    useIorubaStore.getState().appendWatchLog({
      scope: "app",
      level: "info",
      message: "startup log",
    });

    useIorubaStore.getState().hydrateWatchLog([
      {
        seq: 42,
        timestampMs: 1,
        scope: "backend",
        level: "warning",
        message: "persisted log",
        detail: "from disk",
      },
    ]);

    const watchLog = useIorubaStore.getState().watchLog;

    expect(watchLog.map((entry) => entry.message)).toEqual([
      "persisted log",
      "startup log",
    ]);
    expect(watchLog.map((entry) => entry.seq)).toEqual([1, 2]);
    expect(useIorubaStore.getState().watchSeq).toBe(2);
  });
});
