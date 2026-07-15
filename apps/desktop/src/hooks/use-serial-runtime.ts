import { useEffect, useRef } from "react";
import { SerialPort, type WatchHandle } from "tauri-plugin-serialplugin-api";

import { applySliderTargetsBatch, dispatchControlAction } from "@/lib/backend";
import { classifySerialOpenError, resolveSerialPort } from "@/lib/serial";
import { useIorubaStore } from "@/store/ioruba-store";
import {
  encodeFirmwareConfigCommand,
  firmwareConfigMatchesProfile,
  resolveActiveProfile,
  type SliderUpdate,
} from "@ioruba/shared";

function normalizeIncomingData(data: string | Uint8Array): string {
  if (typeof data === "string") {
    return data;
  }
  return new TextDecoder().decode(data);
}

/**
 * Acima deste tempo (ms) a aplicação de um lote knob→áudio é considerada lenta
 * e registrada no watch log. Aplicar a cada frame logaria demais; só o que passa
 * do orçamento vira evento, dando visibilidade da latência sem inundar o log.
 */
const AUDIO_APPLY_SLOW_MS = 80;

/**
 * Intervalo mínimo (ms) entre lotes knob→áudio. Sob movimento rápido cada
 * rajada de frames (~30-60 Hz) viraria um exec de `pactl`; o throttle aplica o
 * primeiro lote imediatamente (sem lag perceptível) e coalesce os seguintes num
 * flush trailing com o valor mais recente. Com `smoothTransitions` o intervalo
 * efetivo é o `transitionDurationMs` do perfil (o antigo debounce puro
 * segurava o áudio enquanto o knob estivesse em movimento contínuo).
 */
const AUDIO_APPLY_MIN_INTERVAL_MS = 40;

/**
 * Intervalo (ms) entre re-tentativas de handshake e teto de tentativas. Cobre o
 * caso em que o `HELLO?` inicial se perde (reset DTR / ruído de boot) sem ficar
 * re-solicitando para sempre — o stream de frames funciona mesmo sem handshake.
 */
const HANDSHAKE_RETRY_MS = 2000;
const HANDSHAKE_MAX_RETRIES = 5;

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
    (state) => state.commitAppliedResults,
  );
  const runDemoStep = useIorubaStore((state) => state.runDemoStep);

  const portRef = useRef<SerialPort | null>(null);
  const watchHandleRef = useRef<WatchHandle | null>(null);
  const demoTimerRef = useRef<number | null>(null);
  const applyTimerRef = useRef<number | null>(null);
  const lastFlushEnqueuedAtRef = useRef(0);
  const pendingUpdatesRef = useRef<Map<number, SliderUpdate>>(new Map());
  const inFlightUpdatesRef = useRef<Map<number, number>>(new Map());
  const queueRef = useRef(Promise.resolve());
  /**
   * Fila de operações de porta (open/close). O cleanup do effect e o corpo do
   * effect seguinte disparam stop/connect quase simultaneamente; sem
   * serialização o open corre contra o close ainda em andamento e o plugin
   * responde "Serial port open/close already in progress", deixando a porta
   * aberta porém sem thread de leitura (conectado, sem sinal).
   */
  const serialOpsRef = useRef(Promise.resolve());
  const heartbeatWarningRef = useRef(false);
  const serialBufferRef = useRef("");
  const lastFirmwareConfigRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const profile = resolveActiveProfile(persisted);
    const applyIntervalMs = profile.audio.smoothTransitions
      ? Math.max(AUDIO_APPLY_MIN_INTERVAL_MS, profile.audio.transitionDurationMs)
      : AUDIO_APPLY_MIN_INTERVAL_MS;

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
        if (
          inFlightUpdatesRef.current.get(update.sliderId) === update.rawValue
        ) {
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
        const startedAt = performance.now();
        const outcomes = await applySliderTargetsBatch(profile, updates);
        const latencyMs = Math.round(performance.now() - startedAt);
        commitAppliedResults(updates, outcomes);

        if (latencyMs > AUDIO_APPLY_SLOW_MS) {
          appendWatchLog({
            scope: "serial",
            level: "warning",
            message: "Latência alta ao aplicar áudio",
            detail: `${latencyMs}ms · ${updates.length} alvo(s)`,
          });
        }
      } catch (error) {
        appendWatchLog({
          scope: "serial",
          level: "error",
          message: "Falha ao aplicar lote de áudio",
          detail: error instanceof Error ? error.message : String(error),
        });

        if (!cancelled) {
          setStatus(
            "error",
            error instanceof Error ? error.message : String(error),
            portPath,
          );
        }
      } finally {
        for (const update of updates) {
          if (
            inFlightUpdatesRef.current.get(update.sliderId) === update.rawValue
          ) {
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

      // Throttle leading+trailing: um timer pendente já vai drenar o mapa de
      // pendências com o valor mais recente — não reiniciar (reiniciar seria
      // debounce, que segura o áudio enquanto o knob se move continuamente).
      if (applyTimerRef.current !== null) {
        return;
      }

      const elapsedMs = Date.now() - lastFlushEnqueuedAtRef.current;
      if (elapsedMs >= applyIntervalMs) {
        lastFlushEnqueuedAtRef.current = Date.now();
        enqueueAudioFlush();
        return;
      }

      applyTimerRef.current = window.setTimeout(() => {
        applyTimerRef.current = null;
        lastFlushEnqueuedAtRef.current = Date.now();
        enqueueAudioFlush();
      }, applyIntervalMs - elapsedMs);
    };

    const dispatchControlActions = async (
      actions: ReturnType<typeof processSerialLine>["controlActions"],
    ) => {
      for (const action of actions) {
        try {
          const outcome = await dispatchControlAction(action.action);
          appendWatchLog({
            scope: "serial",
            level: outcome.supported ? "info" : "warning",
            message: outcome.supported
              ? "Acao de controle aplicada"
              : "Acao de controle indisponivel",
            detail: `${action.controlName} (${action.detail}) | ${outcome.detail}`,
          });
        } catch (error) {
          appendWatchLog({
            scope: "serial",
            level: "error",
            message: "Falha ao aplicar acao de controle",
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    const stopDemo = () => {
      if (demoTimerRef.current !== null) {
        window.clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
      }
    };

    const requestFirmwareHandshake = async (
      port: SerialPort,
      reason: string,
    ) => {
      try {
        await port.write("HELLO?\n");
        appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Handshake do firmware solicitado",
          detail: `${port.options.path} | ${reason}`,
        });
      } catch (error) {
        appendWatchLog({
          scope: "serial",
          level: "warning",
          message: "Falha ao solicitar handshake do firmware",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    };

    const enableControlEvents = async (port: SerialPort, reason: string) => {
      try {
        await port.write("EVENTS ON\n");
        appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Eventos de controle habilitados",
          detail: `${port.options.path} | ${reason}`,
        });
      } catch (error) {
        appendWatchLog({
          scope: "serial",
          level: "warning",
          message: "Falha ao habilitar eventos de controle",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    };

    const runSerialOp = (task: () => Promise<void>) => {
      const run = serialOpsRef.current.then(task, task);
      serialOpsRef.current = run.catch(() => {});
      return run;
    };

    const stopSerial = async () => {
      heartbeatWarningRef.current = false;
      serialBufferRef.current = "";
      lastFirmwareConfigRef.current = null;
      resetPendingAudioUpdates();

      if (watchHandleRef.current) {
        const handle = watchHandleRef.current;
        watchHandleRef.current = null;
        try {
          await handle.unwatch();
        } catch (error) {
          appendWatchLog({
            scope: "serial",
            level: "warning",
            message: "Falha ao cancelar leitura serial",
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Toma a porta de forma atômica: chamadas concorrentes de stopSerial
      // (cleanup do effect + branch de modo do effect novo) viram no-op em vez
      // de fechar a mesma porta duas vezes.
      const port = portRef.current;
      portRef.current = null;
      if (!port) {
        return;
      }

      const closedPortPath = port.options.path;

      // close() do plugin v3 já limpa o timer de reconexão internamente, mas
      // desabilitamos aqui também: evita uma reconexão agendada disparar no
      // instante entre o unwatch acima e o close() abaixo.
      try {
        port.disableAutoReconnect();
      } catch (error) {
        appendWatchLog({
          scope: "serial",
          level: "warning",
          message: "Falha ao desabilitar auto-reconexao serial",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
      try {
        await port.close();
      } catch (error) {
        appendWatchLog({
          scope: "serial",
          level: "warning",
          message: "Falha ao fechar porta serial",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
      appendWatchLog({
        scope: "serial",
        level: "warning",
        message: "Porta serial encerrada",
        detail: closedPortPath,
      });
    };

    if (connectionMode === "demo") {
      void runSerialOp(stopSerial);
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
      void runSerialOp(stopSerial);
      return;
    }

    const resolvedPort = resolveSerialPort(persisted, availablePorts);

    if (!resolvedPort) {
      appendWatchLog({
        scope: "serial",
        level: "warning",
        message: "Nenhuma porta serial detectada",
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
        detail: portPath,
      });
      await stopSerial();
      setStatus("connecting", `Abrindo ${portPath}...`, portPath);

      const connectStartedAt = performance.now();
      try {
        const port = new SerialPort({
          path: portPath,
          baudRate: profile.serial.baudRate,
        });

        await port.open();
        appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Porta serial aberta",
          detail: portPath,
        });
        port.enableAutoReconnect({
          interval: 3000,
          maxAttempts: null,
          onReconnect: (success, attempt) => {
            appendWatchLog({
              scope: "serial",
              level: success ? "info" : "warning",
              message: success
                ? "Reconexao serial concluida"
                : "Tentativa de reconexao serial",
              detail: `${portPath} | tentativa ${attempt}`,
            });

            if (success) {
              void requestFirmwareHandshake(port, `reconnect-${attempt}`);
              void enableControlEvents(port, `reconnect-${attempt}`);
            }
          },
        });
        appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Escuta serial ativa",
          detail: `${portPath} | conexao em ${Math.round(performance.now() - connectStartedAt)}ms`,
        });

        const watchHandle = await port.watch({
          onData: (data) => {
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
                const controlActions: ReturnType<
                  typeof processSerialLine
                >["controlActions"] = [];

                for (const rawLine of completeLines) {
                  const result = processSerialLine(rawLine);
                  hasPendingAudioChanges =
                    stageAudioUpdates(result.sliderUpdates) ||
                    hasPendingAudioChanges;
                  if (result.controlActions.length > 0) {
                    controlActions.push(...result.controlActions);
                  }
                }

                if (hasPendingAudioChanges) {
                  scheduleAudioFlush();
                }
                if (controlActions.length > 0) {
                  void dispatchControlActions(controlActions);
                }
              })
              .catch((error: unknown) => {
                appendWatchLog({
                  scope: "serial",
                  level: "error",
                  message: "Falha ao processar frame serial",
                  detail: error instanceof Error ? error.message : String(error),
                });
                setStatus(
                  "error",
                  error instanceof Error ? error.message : String(error),
                  portPath,
                );
              });
          },
        });

        if (cancelled) {
          try {
            await watchHandle.unwatch();
          } catch {
            // porta já invalidada; o close abaixo é o que importa
          }
          // Mesmo cuidado do stopSerial: desabilita auto-reconexao antes de
          // fechar para não deixar o manager reagendado em segundo plano.
          try {
            port.disableAutoReconnect();
          } catch {
            // porta já invalidada; o close abaixo é o que importa
          }
          await port.close();
          return;
        }

        portRef.current = port;
        watchHandleRef.current = watchHandle;
        await requestFirmwareHandshake(port, "connect");
        await enableControlEvents(port, "connect");
        setStatus("connected", "Aguardando handshake do firmware", portPath);
        appendWatchLog({
          scope: "serial",
          level: "info",
          message: "Conexao serial estabelecida",
          detail: portPath,
        });
      } catch (error) {
        const classified = classifySerialOpenError(error, portPath);
        appendWatchLog({
          scope: "serial",
          level: "error",
          message: classified.message,
          detail: classified.detail,
        });
        setStatus("disconnected", classified.message, null);
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
          detail: portPath,
        });
        if (!cancelled) {
          setStatus(
            "connected",
            "Porta aberta, aguardando nova leitura do firmware",
            portPath,
          );
        }
      }
    }, 1000);

    // Re-solicita o handshake enquanto o firmware não tiver respondido. O
    // `HELLO?` inicial pode se perder: ao abrir a porta o DTR reseta a placa e o
    // ruído de boot do bootloader pode corromper a linha HELLO, deixando o app
    // preso em "Aguardando handshake" mesmo recebendo frames normalmente.
    // O retry é limitado — frames continuam funcionando sem o handshake.
    let handshakeAttempts = 0;
    const handshakeRetryTimer = window.setInterval(() => {
      const port = portRef.current;
      if (cancelled || !port) {
        return;
      }
      if (useIorubaStore.getState().firmwareInfo !== null) {
        return;
      }
      if (handshakeAttempts >= HANDSHAKE_MAX_RETRIES) {
        return;
      }
      handshakeAttempts += 1;
      void requestFirmwareHandshake(port, `retry-${handshakeAttempts}`);
    }, HANDSHAKE_RETRY_MS);

    void runSerialOp(connect);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatTimer);
      window.clearInterval(handshakeRetryTimer);
      resetPendingAudioUpdates();
      void runSerialOp(stopSerial);
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
    setStatus,
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
          detail: nextCommand,
        });
      })
      .catch((error) => {
        lastFirmwareConfigRef.current = null;
        appendWatchLog({
          scope: "serial",
          level: "error",
          message: "Falha ao enviar configuracao do firmware",
          detail: error instanceof Error ? error.message : String(error),
        });
      });
  }, [appendWatchLog, connectionMode, firmwareInfo, persisted]);
}
