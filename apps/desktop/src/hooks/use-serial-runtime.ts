import { useEffect, useRef } from "react";
import { SerialPort } from "tauri-plugin-serialplugin-api";

import { applySliderTargetsBatch } from "@/lib/backend";
import { useIorubaStore } from "@/store/ioruba-store";

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
  const disconnect = useIorubaStore((state) => state.disconnect);
  const processSerialLine = useIorubaStore((state) => state.processSerialLine);
  const commitAppliedResults = useIorubaStore(
    (state) => state.commitAppliedResults
  );
  const runDemoStep = useIorubaStore((state) => state.runDemoStep);

  const portRef = useRef<SerialPort | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const demoTimerRef = useRef<number | null>(null);
  const queueRef = useRef(Promise.resolve());

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const profile =
      persisted.profiles.find(
        (candidate) => candidate.id === persisted.selectedProfileId
      ) ?? persisted.profiles[0];

    const stopDemo = () => {
      if (demoTimerRef.current !== null) {
        window.clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
      }
    };

    const stopSerial = async () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (portRef.current) {
        try {
          await portRef.current.cancelListen();
        } catch (_error) {
          // ignored on shutdown
        }
        try {
          await portRef.current.close();
        } catch (_error) {
          // ignored on shutdown
        }
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

    const resolvedPort =
      profile.serial.preferredPort && availablePorts.includes(profile.serial.preferredPort)
        ? profile.serial.preferredPort
        : persisted.lastPort && availablePorts.includes(persisted.lastPort)
          ? persisted.lastPort
          : availablePorts[0];

    if (!resolvedPort) {
      setStatus("searching", "Nenhuma porta serial detectada", null);
      return;
    }

    let cancelled = false;
    let lastPacketAt = Date.now();

    async function connect() {
      await stopSerial();
      setStatus("connecting", `Abrindo ${resolvedPort}...`, resolvedPort);

      try {
        const port = new SerialPort({
          path: resolvedPort,
          baudRate: profile.serial.baudRate
        });

        await port.open();
        await port.startListening();
        await port.enableAutoReconnect({
          interval: 3000,
          maxAttempts: null
        });

        const unsubscribe = await port.listen((data) => {
          const rawLine = normalizeIncomingData(data);
          lastPacketAt = Date.now();

          queueRef.current = queueRef.current
            .then(async () => {
              const updates = processSerialLine(rawLine);
              const outcomes = await applySliderTargetsBatch(profile, updates);
              commitAppliedResults(updates, outcomes);
            })
            .catch((error: unknown) => {
              setStatus(
                "error",
                error instanceof Error ? error.message : String(error),
                resolvedPort
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
        setStatus("connected", "Aguardando leituras do firmware", resolvedPort);
      } catch (error) {
        setStatus(
          "disconnected",
          error instanceof Error ? error.message : String(error),
          null
        );
      }
    }

    const heartbeatTimer = window.setInterval(() => {
      if (Date.now() - lastPacketAt > profile.serial.heartbeatTimeoutMs) {
        void stopSerial().then(() => {
          if (!cancelled) {
            setStatus(
              "disconnected",
              "Sem leituras por alguns segundos. Reconectando...",
              null
            );
          }
        });
      }
    }, 1000);

    void connect();

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatTimer);
      void stopSerial();
    };
  }, [
    availablePorts,
    commitAppliedResults,
    connectionMode,
    disconnect,
    hydrated,
    persisted,
    processSerialLine,
    runDemoStep,
    setStatus
  ]);
}
