// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIorubaStore } from "@/store/ioruba-store";

const { mockApplySliderTargetsBatch, serialPortInstances, MockSerialPort } = vi.hoisted(
  () => {
    const serialPortInstances: Array<{
      options: { path: string; baudRate: number };
      writes: string[];
      emit: (payload: string) => void;
      reconnect: (success: boolean, attempt: number) => void;
    }> = [];

    class MockSerialPort {
      options: { path: string; baudRate: number };
      writes: string[] = [];
      private listenHandler: ((data: string) => void) | null = null;
      private reconnectHandler:
        | ((success: boolean, attempt: number) => void)
        | null = null;

      constructor(options: { path: string; baudRate: number }) {
        this.options = options;
        serialPortInstances.push(this);
      }

      async open() {}
      async startListening() {}
      async cancelListen() {}
      async close() {}

      async write(payload: string) {
        this.writes.push(payload);
      }

      async enableAutoReconnect(options: {
        interval: number;
        maxAttempts: number | null;
        onReconnect: (success: boolean, attempt: number) => void;
      }) {
        this.reconnectHandler = options.onReconnect;
      }

      async listen(handler: (data: string) => void) {
        this.listenHandler = handler;
        return () => {
          this.listenHandler = null;
        };
      }

      emit(payload: string) {
        this.listenHandler?.(payload);
      }

      reconnect(success: boolean, attempt: number) {
        this.reconnectHandler?.(success, attempt);
      }
    }

    return {
      mockApplySliderTargetsBatch: vi.fn(async () => ({})),
      serialPortInstances,
      MockSerialPort
    };
  }
);

vi.mock("tauri-plugin-serialplugin-api", () => ({
  SerialPort: MockSerialPort
}));

vi.mock("@/lib/backend", async () => {
  const actual = await vi.importActual<typeof import("@/lib/backend")>(
    "@/lib/backend"
  );

  return {
    ...actual,
    applySliderTargetsBatch: mockApplySliderTargetsBatch
  };
});

import { useSerialRuntime } from "./use-serial-runtime";

function SerialRuntimeHarness() {
  useSerialRuntime();
  return null;
}

async function flushRuntime() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setupSerialRuntime() {
  const store = useIorubaStore.getState();
  store.hydrate(store.persisted, store.audioInventory);
  store.setAvailablePorts(["/dev/ttyUSB0"]);
  store.requestConnect();
  return render(<SerialRuntimeHarness />);
}

describe("useSerialRuntime", () => {
  beforeEach(() => {
    serialPortInstances.length = 0;
    mockApplySliderTargetsBatch.mockClear();
    useIorubaStore.setState(useIorubaStore.getInitialState());
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("requests a new handshake after a successful reconnect from the serial simulator", async () => {
    setupSerialRuntime();
    await flushRuntime();

    const port = serialPortInstances[0];
    expect(port).toBeDefined();
    expect(port.writes).toContain("HELLO?\n");

    await act(async () => {
      port?.reconnect(true, 2);
      await Promise.resolve();
    });

    expect(port?.writes.filter((entry) => entry === "HELLO?\n")).toHaveLength(2);
    expect(
      useIorubaStore
        .getState()
        .watchLog.some((entry) => entry.message === "Reconexao serial concluida")
    ).toBe(true);
  });

  it("marks the session as stalled when the heartbeat window expires without frames", async () => {
    setupSerialRuntime();
    await flushRuntime();

    await act(async () => {
      vi.advanceTimersByTime(4000);
      await Promise.resolve();
    });

    expect(useIorubaStore.getState().snapshot.status).toBe("connected");
    expect(useIorubaStore.getState().snapshot.statusText).toBe(
      "Porta aberta, aguardando nova leitura do firmware"
    );
    expect(
      useIorubaStore
        .getState()
        .watchLog.some((entry) => entry.message === "Sem leituras seriais recentes")
    ).toBe(true);
  });

  it("turns an invalid frame from the serial simulator into an error status", async () => {
    setupSerialRuntime();
    await flushRuntime();

    await act(async () => {
      serialPortInstances[0]?.emit("quebrado\n");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useIorubaStore.getState().snapshot.status).toBe("error");
    expect(
      useIorubaStore.getState().snapshot.statusText
    ).toContain("Invalid slider value");
    expect(
      useIorubaStore
        .getState()
        .watchLog.some((entry) => entry.message === "Falha ao processar frame serial")
    ).toBe(true);
  });
});
