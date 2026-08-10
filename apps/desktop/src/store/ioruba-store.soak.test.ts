import { beforeEach, describe, expect, it } from "vitest";

import { useIorubaStore } from "./ioruba-store";

/**
 * Long-session soak.
 *
 * A control deck is left running for days: the serial stream never stops, and
 * every frame touches the telemetry window, the session aggregates and the
 * watch log. Anything in the store that grows per frame instead of per knob is
 * a leak that only shows up after hours, which is exactly the kind of bug that
 * never surfaces in a normal test run.
 *
 * These tests drive tens of thousands of frames and assert that the retained
 * state stops growing. The final one is deliberately generic — it measures the
 * whole serialized store rather than named fields, so a future collection that
 * forgets its cap fails here without anyone remembering to extend the test.
 */

const WATCH_LOG_LIMIT = 300;

function bootConnectedSession() {
  useIorubaStore.setState(useIorubaStore.getInitialState());

  const initial = useIorubaStore.getState();
  initial.hydrate(initial.persisted, initial.audioInventory);
  useIorubaStore.getState().requestConnect();
  useIorubaStore.getState().setStatus("connected", "Conectado", "/dev/ttyUSB0");
}

/** Feeds `frames` serial frames with values that keep moving. */
function runFrames(frames: number) {
  const store = useIorubaStore.getState();
  for (let index = 0; index < frames; index++) {
    // Values sweep so no code path can dedupe its way out of doing the work.
    const a = index % 1024;
    const b = (index * 7) % 1024;
    const c = (index * 13) % 1024;
    store.processSerialLine(`${a}|${b}|${c}`);
  }
}

/**
 * Proxy for retained size. Not bytes-in-heap, but it moves with the number and
 * size of retained objects, which is what a leak changes.
 */
function retainedSize(): number {
  // Actions are dropped by the replacer, leaving only retained data.
  return JSON.stringify(useIorubaStore.getState(), (_key, value) =>
    typeof value === "function" ? undefined : value
  ).length;
}

describe("ioruba store — long session", () => {
  beforeEach(() => {
    bootConnectedSession();
  });

  it("keeps the telemetry window at its configured size", () => {
    const windowSize =
      useIorubaStore.getState().snapshot.knobs.length > 0
        ? useIorubaStore.getState().persisted.profiles[0].ui.telemetryWindow
        : 0;

    runFrames(20_000);

    expect(useIorubaStore.getState().telemetry.length).toBeLessThanOrEqual(
      windowSize
    );
  });

  it("keeps the watch log at its cap", () => {
    runFrames(20_000);

    expect(useIorubaStore.getState().watchLog.length).toBeLessThanOrEqual(
      WATCH_LOG_LIMIT
    );
  });

  it("aggregates session stats per knob, not per sample", () => {
    runFrames(20_000);

    const { sessionStats, snapshot } = useIorubaStore.getState();

    expect(Object.keys(sessionStats.perKnob)).toHaveLength(
      snapshot.knobs.length
    );
    expect(sessionStats.sampleCount).toBeGreaterThan(0);
  });

  it("does not grow the outcome map beyond the slider count", () => {
    runFrames(20_000);

    const { outcomes, snapshot } = useIorubaStore.getState();

    expect(Object.keys(outcomes).length).toBeLessThanOrEqual(
      snapshot.knobs.length
    );
  });

  it("bounds notifications even when every one is unique", () => {
    // The release check only fires every few hours, so this never bites in
    // practice — which is precisely why an unbounded list here would go
    // unnoticed until someone left the app open for a week.
    for (let index = 0; index < 5_000; index++) {
      useIorubaStore.getState().pushNotification({
        id: `release-${index}`,
        kind: "release",
        title: `v1.${index}.0`,
        read: false,
        createdAt: index
      });
    }

    expect(
      useIorubaStore.getState().notifications.length
    ).toBeLessThanOrEqual(100);
  });

  it("stops growing once the caps are reached", () => {
    // Warm up past every window and cap, measure, then run 4x more frames.
    // A store with no per-frame retention lands on the same size.
    runFrames(5_000);
    const warm = retainedSize();

    runFrames(20_000);
    const soaked = retainedSize();

    expect(soaked).toBeLessThanOrEqual(warm * 1.05);
  });
});
