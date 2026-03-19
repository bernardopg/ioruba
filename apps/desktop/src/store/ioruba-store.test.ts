import { describe, expect, it } from "vitest";

import { useIorubaStore } from "./ioruba-store";

describe("ioruba store", () => {
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
});
