import { beforeEach, describe, expect, it } from "vitest";

import { useIorubaStore } from "./ioruba-store";

describe("ioruba store", () => {
  beforeEach(() => {
    useIorubaStore.setState(useIorubaStore.getInitialState());
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
