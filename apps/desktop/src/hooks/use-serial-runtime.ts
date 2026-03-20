import { useEffect, useRef } from "react";
import { SerialPort } from "tauri-plugin-serialplugin-api";

import { applySliderTargetsBatch } from "@/lib/backend";
import { resolveSerialPort } from "@/lib/serial";
import { useIorubaStore } from "@/store/ioruba-store";
import { resolveActiveProfile } from "@ioruba/shared";

function normalizeIncomingData(data: string | Uint8Array): string {
  if (typeof data === "string") {
    return data;
  }
  return new TextDecoder().decode(data);
}

export function useSerialRuntime() {
  const hydrated = useIorubaStore((state) => state.hydrated);
  const persisted = useIorubaStore((state) => state.persisted);
  const availablePorts = useIorubaStore((state) => state.availablePorts);
  const connectionMode = useIorubaStore((state) => state.connectionMode);
  const setStatus = useIorubaStore((state) => state.setStatus);
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);
  const processSerialLine = useIorubaStore((state) => state.processSerialLine);
  const commitAppliedResults = useIorubaStore(
    (state) => state.commitAppliedResults
  );
  const runDemoStep = useIorubaStore((state) => state.runDemoStep);

  const portRef = useRef<SerialPort | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const demoTimerRef = useRef<number | null>(null);
  const queueRef = useRef(Promise.resolve());
  const heartbeatWarningRef = useRef(false);
  const serialBufferRef = useRef("");

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const profile = resolveActiveProfile(persisted);

    const stopDemo = () => {
      if (demoTimerRef.current !== null) {
        window.clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
      }
    };

    const stopSerial = async () => {
      heartbeatWarningRef.current = false;
      serialBufferRef.current = "";

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (portRef.current) {
        const portPath = portRef.current.options.path;
        try {
          await portRef.current.cancelListen();
        } catch (error) {
          appendWatchLog({
            scope: "serial",
            level: "warning",
            message: "Falha ao cancelar leitura serial",
            detail: error instanceof Error ? error.message : String(error)
          });
        }
        try {
          await portRef.current.close();
        } catch (error) {
          appendWatchLog({
            scope: "serial",
            level: "warning",
            message: "Falha ao fechar porta serial",
            detail: error instanceof Error ? error.message : String(error)
          });
        }
        appendWatchLog({
          scope: "serial",
          level: "warning",
          message: "Porta serial encerrada",
          detail: portPath
        });
        portRef.current = null;
      }
    };

    if (connectionMode === "demo") {
      void stopSerial();
      if (demoTimerRef.current === null) {
        demoTimerRef.current = window.setInterval(() => {
          runDemoStep();
        }, 120);
      }
      return () => {
        stopDemo();
      };
    }

    stopDemo();

    if (connectionMode !== "serial") {
      void stopSerial();
      return;
    }

    const resolvedPort = resolveSerialPort(persisted, availablePorts);

    if (!resolvedPort) {
      appendWatchLog({
        scope: "serial",
        level: "warning",
        message: "Nenhuma porta serial detectada"
      });
      setStatus("searching", "Nenhuma porta serial detectada", null);
      return;
    }

    const portPath = resolvedPort;

    let cancelled = false;
    let lastPacketAt = Date.now();

    async function connect() {
      appendWatchLog({
        scope: "serial",
        level: "info",
        message: "Iniciando conexao serial",
        detail: portPath
      });
      await stopSerial();
      setStatus("connecting", `Abrindo ${portPath}...`, portPath);

      try {
        const port = new SerialPort({
          path: portPath,
          baudRate: profile.serial.baudRate
        });

        await port.open();
        appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Porta serial aberta",
          detail: portPath
        });
        await port.startListening();
        await port.enableAutoReconnect({
          interval: 3000,
          maxAttempts: null
        });
        appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Escuta serial ativa",
          detail: portPath
        });

        const unsubscribe = await port.listen((data) => {
          const chunk = normalizeIncomingData(data);
          lastPacketAt = Date.now();
          heartbeatWarningRef.current = false;
          serialBufferRef.current += chunk;

          const lines = serialBufferRef.current.split(/\r?\n/);
          serialBufferRef.current = lines.pop() ?? "";
          const completeLines = lines
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

          if (completeLines.length === 0) {
            return;
          }

          queueRef.current = queueRef.current
            .then(async () => {
              for (const rawLine of completeLines) {
                const updates = processSerialLine(rawLine);
                const outcomes = await applySliderTargetsBatch(profile, updates);
                commitAppliedResults(updates, outcomes);
              }
            })
            .catch((error: unknown) => {
              appendWatchLog({
                scope: "serial",
                level: "error",
                message: "Falha ao processar frame serial",
                detail: error instanceof Error ? error.message : String(error)
              });
              setStatus(
                "error",
                error instanceof Error ? error.message : String(error),
                portPath
              );
            });
        });

        if (cancelled) {
          unsubscribe();
          await port.close();
          return;
        }

        portRef.current = port;
        unsubscribeRef.current = unsubscribe;
        setStatus("connected", "Aguardando leituras do firmware", portPath);
        appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Conexao serial estabelecida",
          detail: portPath
        });
      } catch (error) {
        appendWatchLog({
          scope: "serial",
          level: "error",
          message: "Falha ao abrir porta serial",
          detail: error instanceof Error ? error.message : String(error)
        });
        setStatus(
          "disconnected",
          error instanceof Error ? error.message : String(error),
          null
        );
      }
    }

    const heartbeatTimer = window.setInterval(() => {
      if (Date.now() - lastPacketAt > profile.serial.heartbeatTimeoutMs) {
        if (heartbeatWarningRef.current) {
          return;
        }

        heartbeatWarningRef.current = true;
        appendWatchLog({
          scope: "serial",
          level: "warning",
          message: "Sem leituras seriais recentes",
          detail: portPath
        });
        if (!cancelled) {
          setStatus(
            "connected",
            "Porta aberta, aguardando nova leitura do firmware",
            portPath
          );
        }
      }
    }, 1000);

    void connect();

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatTimer);
      void stopSerial();
    };
  }, [
    appendWatchLog,
    availablePorts,
    commitAppliedResults,
    connectionMode,
    hydrated,
    persisted,
    processSerialLine,
    runDemoStep,
    setStatus
  ]);
}
