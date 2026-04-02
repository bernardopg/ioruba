import { defaultProfile, resolveActiveProfile } from "@ioruba/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { useIorubaStore } from "./ioruba-store";

describe("ioruba store", () => {
  beforeEach(() => {
    useIorubaStore.setState(useIorubaStore.getInitialState());
  });

  it("covers boot and serial status transitions in the snapshot", () => {
    const portPath = "/dev/ttyUSB0";

    expect(useIorubaStore.getState().snapshot.status).toBe("booting");
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Inicializando Ioruba Desktop"
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Inicializando serviços"
    );

    const initialState = useIorubaStore.getState();
    initialState.hydrate(initialState.persisted, initialState.audioInventory);

    expect(useIorubaStore.getState().snapshot.status).toBe("ready");
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Pronto para conectar"
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Pronto para conectar"
    );

    useIorubaStore.getState().requestConnect();

    expect(useIorubaStore.getState().snapshot.status).toBe("searching");
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Procurando uma porta serial do Arduino"
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Procurando um Arduino serial"
    );

    useIorubaStore
      .getState()
      .setStatus("connecting", `Abrindo ${portPath}...`, portPath);

    expect(useIorubaStore.getState().snapshot.status).toBe("connecting");
    expect(useIorubaStore.getState().snapshot.connectionPort).toBe(portPath);
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      `Abrindo ${portPath}...`
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Abrindo porta serial e aguardando firmware"
    );

    const updates = useIorubaStore.getState().processSerialLine("512|768|1023");

    expect(updates).toHaveLength(3);
    expect(useIorubaStore.getState().snapshot.status).toBe("connected");
    expect(useIorubaStore.getState().snapshot.connectionPort).toBe(portPath);
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Recebendo dados | 512|768|1023"
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Recebendo dados | 512|768|1023"
    );

    useIorubaStore
      .getState()
      .setStatus("error", "Falha ao processar frame serial", portPath);

    expect(useIorubaStore.getState().snapshot.status).toBe("error");
    expect(useIorubaStore.getState().snapshot.connectionPort).toBe(portPath);
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Falha ao processar frame serial"
    );
    expect(useIorubaStore.getState().snapshot.diagnostics.hint).toBe(
      "Falha ao processar frame serial"
    );
  });

  it("processes full frame packets", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);
    const updates = useIorubaStore.getState().processSerialLine("512|768|1023");

    expect(updates).toHaveLength(3);
    expect(useIorubaStore.getState().snapshot.knobs[0]?.rawValue).toBe(512);
  });

  it("enables demo mode and generates telemetry", () => {
    useIorubaStore.getState().setDemoMode(true);
    useIorubaStore.getState().runDemoStep();

    expect(useIorubaStore.getState().snapshot.status).toBe("demo");
    expect(useIorubaStore.getState().snapshot.telemetry.length).toBeGreaterThan(0);
  });

  it("updates the persisted theme preference and keeps the draft in sync", () => {
    const store = useIorubaStore.getState();
    store.hydrate(store.persisted, store.audioInventory);

    useIorubaStore.getState().setThemeMode("dark");

    const nextState = useIorubaStore.getState();

    expect(resolveActiveProfile(nextState.persisted).ui.theme).toBe("dark");
    expect(JSON.parse(nextState.configDraft).ui.theme).toBe("dark");
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
    expect(nextState.persisted.profiles.some((profile) => profile.id === defaultProfile.id)).toBe(
      false
    );
  });

  it("merges loaded watch logs with the current session and resequences them", () => {
    useIorubaStore.getState().appendWatchLog({
      scope: "app",
      level: "info",
      message: "startup log"
    });

    useIorubaStore.getState().hydrateWatchLog([
      {
        seq: 42,
        timestampMs: 1,
        scope: "backend",
        level: "warning",
        message: "persisted log",
        detail: "from disk"
      }
    ]);

    const watchLog = useIorubaStore.getState().watchLog;

    expect(watchLog.map((entry) => entry.message)).toEqual([
      "persisted log",
      "startup log"
    ]);
    expect(watchLog.map((entry) => entry.seq)).toEqual([1, 2]);
    expect(useIorubaStore.getState().watchSeq).toBe(2);
  });
});
