import { useEffect, useRef } from "react";
import { SerialPort } from "tauri-plugin-serialplugin-api";

import { applySliderTargetsBatch } from "@/lib/backend";
import { resolveSerialPort } from "@/lib/serial";
import { useIorubaStore } from "@/store/ioruba-store";
import {
  encodeFirmwareConfigCommand,
  firmwareConfigMatchesProfile,
  resolveActiveProfile,
  type SliderUpdate
} from "@ioruba/shared";

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
  const firmwareInfo = useIorubaStore((state) => state.firmwareInfo);
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
  const applyTimerRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef<Map<number, SliderUpdate>>(new Map());
  const inFlightUpdatesRef = useRef<Map<number, number>>(new Map());
  const queueRef = useRef(Promise.resolve());
  const heartbeatWarningRef = useRef(false);
  const serialBufferRef = useRef("");
  const lastFirmwareConfigRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const profile = resolveActiveProfile(persisted);
    const applyDebounceMs = profile.audio.smoothTransitions
      ? Math.max(0, profile.audio.transitionDurationMs)
      : 0;

    const clearApplyTimer = () => {
      if (applyTimerRef.current !== null) {
        window.clearTimeout(applyTimerRef.current);
        applyTimerRef.current = null;
      }
    };

    const resetPendingAudioUpdates = () => {
      clearApplyTimer();
      pendingUpdatesRef.current.clear();
      inFlightUpdatesRef.current.clear();
    };

    const stageAudioUpdates = (updates: SliderUpdate[]) => {
      let changed = false;

      for (const update of updates) {
        if (inFlightUpdatesRef.current.get(update.sliderId) === update.rawValue) {
          continue;
        }

        const pending = pendingUpdatesRef.current.get(update.sliderId);
        if (pending?.rawValue === update.rawValue) {
          continue;
        }

        pendingUpdatesRef.current.set(update.sliderId, update);
        changed = true;
      }

      return changed;
    };

    const flushPendingAudioUpdates = async () => {
      const updates = [...pendingUpdatesRef.current.values()];
      if (updates.length === 0) {
        return;
      }

      pendingUpdatesRef.current.clear();
      for (const update of updates) {
        inFlightUpdatesRef.current.set(update.sliderId, update.rawValue);
      }

      try {
        const outcomes = await applySliderTargetsBatch(profile, updates);
        commitAppliedResults(updates, outcomes);
      } catch (error) {
        appendWatchLog({
          scope: "serial",
          level: "error",
          message: "Falha ao aplicar lote de áudio",
          detail: error instanceof Error ? error.message : String(error)
        });

        if (!cancelled) {
          setStatus(
            "error",
            error instanceof Error ? error.message : String(error),
            portPath
          );
        }
      } finally {
        for (const update of updates) {
          if (inFlightUpdatesRef.current.get(update.sliderId) === update.rawValue) {
            inFlightUpdatesRef.current.delete(update.sliderId);
          }
        }
      }
    };

    const enqueueAudioFlush = () => {
      clearApplyTimer();
      queueRef.current = queueRef.current.then(async () => {
        await flushPendingAudioUpdates();
      });
    };

    const scheduleAudioFlush = () => {
      if (pendingUpdatesRef.current.size === 0) {
        return;
      }

      if (applyDebounceMs <= 0) {
        enqueueAudioFlush();
        return;
      }

      clearApplyTimer();
      applyTimerRef.current = window.setTimeout(() => {
        applyTimerRef.current = null;
        enqueueAudioFlush();
      }, applyDebounceMs);
    };

    const stopDemo = () => {
      if (demoTimerRef.current !== null) {
        window.clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
      }
    };

    const requestFirmwareHandshake = async (
      port: SerialPort,
      reason: string
    ) => {
      try {
        await port.write("HELLO?\n");
        appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Handshake do firmware solicitado",
          detail: `${port.options.path} | ${reason}`
        });
      } catch (error) {
        appendWatchLog({
          scope: "serial",
          level: "warning",
          message: "Falha ao solicitar handshake do firmware",
          detail: error instanceof Error ? error.message : String(error)
        });
      }
    };

    const stopSerial = async () => {
      heartbeatWarningRef.current = false;
      serialBufferRef.current = "";
      lastFirmwareConfigRef.current = null;
      resetPendingAudioUpdates();

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
          maxAttempts: null,
          onReconnect: (success, attempt) => {
            appendWatchLog({
              scope: "serial",
              level: success ? "info" : "warning",
              message: success
                ? "Reconexao serial concluida"
                : "Tentativa de reconexao serial",
              detail: `${portPath} | tentativa ${attempt}`
            });

            if (success) {
              void requestFirmwareHandshake(port, `reconnect-${attempt}`);
            }
          }
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
              let hasPendingAudioChanges = false;

              for (const rawLine of completeLines) {
                const updates = processSerialLine(rawLine);
                hasPendingAudioChanges =
                  stageAudioUpdates(updates) || hasPendingAudioChanges;
              }

              if (hasPendingAudioChanges) {
                scheduleAudioFlush();
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
        await requestFirmwareHandshake(port, "connect");
        setStatus("connected", "Aguardando handshake do firmware", portPath);
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
      resetPendingAudioUpdates();
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

  useEffect(() => {
    if (connectionMode !== "serial" || !portRef.current || !firmwareInfo) {
      return;
    }

    const profile = resolveActiveProfile(persisted);
    if (firmwareConfigMatchesProfile(profile, firmwareInfo)) {
      lastFirmwareConfigRef.current = null;
      return;
    }

    const nextCommand = encodeFirmwareConfigCommand(profile);
    if (lastFirmwareConfigRef.current === nextCommand) {
      return;
    }

    lastFirmwareConfigRef.current = nextCommand;
    void portRef.current
      .write(`${nextCommand}\n`)
      .then(() => {
        appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Configuracao do firmware enviada",
          detail: nextCommand
        });
      })
      .catch((error) => {
        lastFirmwareConfigRef.current = null;
        appendWatchLog({
          scope: "serial",
          level: "error",
          message: "Falha ao enviar configuracao do firmware",
          detail: error instanceof Error ? error.message : String(error)
        });
      });
  }, [appendWatchLog, connectionMode, firmwareInfo, persisted]);
}
