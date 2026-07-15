// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIorubaStore } from "@/store/ioruba-store";

const { mockApplySliderTargetsBatch, serialPortInstances, MockSerialPort } = vi.hoisted(
  () => {
    const serialPortInstances: Array<{
      options: { path: string; baudRate: number };
      writes: string[];
      calls: string[];
      emit: (payload: string) => void;
      reconnect: (success: boolean, attempt: number) => void;
    }> = [];

    class MockSerialPort {
      options: { path: string; baudRate: number };
      writes: string[] = [];
      /** Ordem das operações de ciclo de vida, para asserção de sequência. */
      calls: string[] = [];
      private dataHandler: ((data: string) => void) | null = null;
      private reconnectHandler:
        | ((success: boolean, attempt: number) => void)
        | null = null;

      constructor(options: { path: string; baudRate: number }) {
        this.options = options;
        serialPortInstances.push(this);
      }

      async open() {
        this.calls.push("open");
      }
      async close() {
        this.calls.push("close");
      }
      disableAutoReconnect() {
        this.calls.push("disableAutoReconnect");
        this.reconnectHandler = null;
      }

      async write(payload: string) {
        this.writes.push(payload);
      }

      enableAutoReconnect(options: {
        interval: number;
        maxAttempts: number | null;
        onReconnect: (success: boolean, attempt: number) => void;
      }) {
        this.reconnectHandler = options.onReconnect;
      }

      async watch(handlers: { onData: (data: string) => void }) {
        this.dataHandler = handlers.onData;
        const self = this;
        return {
          channelId: 0,
          async unwatch() {
            self.dataHandler = null;
          },
        };
      }

      emit(payload: string) {
        this.dataHandler?.(payload);
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

  it("coalesces rapid slider frames into a leading apply plus one trailing apply", async () => {
    setupSerialRuntime();
    await flushRuntime();

    const port = serialPortInstances[0];

    await act(async () => {
      port?.emit("100|100|100\n");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockApplySliderTargetsBatch).toHaveBeenCalledTimes(1);

    // Rajada dentro da janela do throttle: nenhum apply extra imediato,
    // um único flush trailing com o valor mais recente.
    await act(async () => {
      port?.emit("200|200|200\n");
      await Promise.resolve();
      port?.emit("300|300|300\n");
      await Promise.resolve();
      port?.emit("400|400|400\n");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockApplySliderTargetsBatch).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockApplySliderTargetsBatch).toHaveBeenCalledTimes(2);
    const lastBatch = mockApplySliderTargetsBatch.mock.calls.at(-1) as unknown[];
    const updates = lastBatch?.[1] as Array<{ rawValue: number }>;
    expect(updates.every((update) => update.rawValue === 400)).toBe(true);
  });

  it("keeps applying audio while the knob moves continuously (throttle, not debounce)", async () => {
    setupSerialRuntime();
    await flushRuntime();

    const port = serialPortInstances[0];
    let raw = 100;

    // 10 frames espaçados de 20ms (janela do perfil default = 50ms). Um
    // debounce puro reiniciaria o timer a cada frame e aplicaria só no final;
    // o throttle precisa continuar drenando durante o movimento.
    for (let step = 0; step < 10; step += 1) {
      await act(async () => {
        raw += 50;
        port?.emit(`${raw}|${raw}|${raw}\n`);
        await Promise.resolve();
        await Promise.resolve();
        vi.advanceTimersByTime(20);
        await Promise.resolve();
        await Promise.resolve();
      });
    }

    expect(mockApplySliderTargetsBatch.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("disables auto-reconnect before closing the port on disconnect", async () => {
    setupSerialRuntime();
    await flushRuntime();

    const port = serialPortInstances[0];
    expect(port?.calls).toEqual(["open"]);

    await act(async () => {
      useIorubaStore.getState().disconnect();
      await Promise.resolve();
    });
    await flushRuntime();

    // Defesa em profundidade: desabilita o auto-reconnect antes do close para
    // não deixar uma reconexão agendada disparar entre o unwatch e o close.
    const disableIndex = port.calls.indexOf("disableAutoReconnect");
    const closeIndex = port.calls.indexOf("close");
    expect(disableIndex).toBeGreaterThan(-1);
    expect(closeIndex).toBeGreaterThan(disableIndex);
    // stopSerial concorrente (cleanup + branch de modo) não pode fechar duas vezes.
    expect(port.calls.filter((call) => call === "close")).toHaveLength(1);
  });

  it("reconnects cleanly after a disconnect/connect cycle and keeps receiving frames", async () => {
    setupSerialRuntime();
    await flushRuntime();

    await act(async () => {
      useIorubaStore.getState().disconnect();
      await Promise.resolve();
    });
    await flushRuntime();

    await act(async () => {
      useIorubaStore.getState().requestConnect();
      await Promise.resolve();
    });
    await flushRuntime();

    // Segunda conexão usa uma instância nova, aberta depois do close da antiga.
    expect(serialPortInstances).toHaveLength(2);
    const oldPort = serialPortInstances[0];
    const newPort = serialPortInstances[1];
    expect(oldPort.calls).toContain("close");
    expect(newPort.calls).toContain("open");
    expect(newPort.calls).not.toContain("close");
    expect(newPort.writes).toContain("HELLO?\n");

    await act(async () => {
      newPort.emit("300|300|300\n");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockApplySliderTargetsBatch).toHaveBeenCalledTimes(1);
    expect(useIorubaStore.getState().snapshot.status).toBe("connected");
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
