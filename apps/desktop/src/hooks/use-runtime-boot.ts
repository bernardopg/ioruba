import { useEffect, useRef } from "react";
import { SerialPort } from "tauri-plugin-serialplugin-api";

import {
  getLaunchOnLoginEnabled,
  listAudioInventory,
  loadPersistedState,
  loadWatchLogEntries,
  saveWatchLogEntries
} from "@/lib/backend";
import { normalizeSerialPorts, shouldAutoConnect } from "@/lib/serial";
import { useIorubaStore } from "@/store/ioruba-store";

export function useRuntimeBoot() {
  const hydrate = useIorubaStore((state) => state.hydrate);
  const hydrateWatchLog = useIorubaStore((state) => state.hydrateWatchLog);
  const setWatchLogPersistenceReady = useIorubaStore(
    (state) => state.setWatchLogPersistenceReady
  );
  const refreshInventory = useIorubaStore((state) => state.refreshInventory);
  const setAvailablePorts = useIorubaStore((state) => state.setAvailablePorts);
  const requestConnect = useIorubaStore((state) => state.requestConnect);
  const setDemoMode = useIorubaStore((state) => state.setDemoMode);
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);
  const hydrated = useIorubaStore((state) => state.hydrated);
  const connectionMode = useIorubaStore((state) => state.connectionMode);
  const autoConnected = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const [persisted, inventory, watchLog, launchOnLogin] = await Promise.all([
          loadPersistedState(),
          listAudioInventory(),
          loadWatchLogEntries(),
          getLaunchOnLoginEnabled()
        ]);

        if (cancelled) {
          return;
        }

        const nextPersisted = {
          ...persisted,
          launchOnLogin
        };

        hydrate(nextPersisted, inventory);
        hydrateWatchLog(watchLog);

        let watchLogPersistenceError: string | null = null;
        try {
          await saveWatchLogEntries(useIorubaStore.getState().watchLog);
        } catch (error) {
          watchLogPersistenceError =
            error instanceof Error ? error.message : String(error);
        } finally {
          setWatchLogPersistenceReady(true);
        }

        if (cancelled) {
          return;
        }

        appendWatchLog({
          scope: "app",
          level: "info",
          message: "Boot do runtime iniciado"
        });

        appendWatchLog({
          scope: "backend",
          level: "info",
          message: "Runtime hidratado",
          detail: `${nextPersisted.profiles.length} perfil(is) | inventario ${inventory.summary} | autostart ${launchOnLogin ? "on" : "off"}`
        });

        if (nextPersisted.demoMode) {
          appendWatchLog({
            scope: "app",
            level: "warning",
            message: "Persistencia restaurou modo demo"
          });
          setDemoMode(true);
        } else if (shouldAutoConnect(nextPersisted)) {
          appendWatchLog({
            scope: "app",
            level: "info",
            message: "Auto-connect habilitado pelo perfil ativo"
          });
          requestConnect();
        }

        if (watchLogPersistenceError) {
          appendWatchLog({
            scope: "backend",
            level: "error",
            message: "Falha ao persistir watch log",
            detail: watchLogPersistenceError
          });
        }
      } catch (error) {
        appendWatchLog({
          scope: "backend",
          level: "error",
          message: "Falha no boot do runtime",
          detail: error instanceof Error ? error.message : String(error)
        });
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [appendWatchLog, hydrate, requestConnect, setDemoMode]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;

    async function syncPortsAndInventory() {
      try {
        const inventoryPromise = listAudioInventory();
        const shouldQueryPorts =
          connectionMode !== "serial" ||
          useIorubaStore.getState().availablePorts.length === 0;
        const portsPromise =
          shouldQueryPorts ? SerialPort.available_ports() : Promise.resolve(null);
        const [ports, inventory] = await Promise.all([portsPromise, inventoryPromise]);

        if (cancelled) {
          return;
        }

        if (ports !== null) {
          setAvailablePorts(normalizeSerialPorts(ports));
        }
        refreshInventory(inventory);
      } catch (_error) {
        if (!cancelled) {
          if (connectionMode !== "serial") {
            setAvailablePorts([]);
          }
          appendWatchLog({
            scope: "serial",
            level: "error",
            message: "Falha ao consultar portas seriais"
          });
        }
      }
    }

    if (!autoConnected.current) {
      autoConnected.current = true;
      void syncPortsAndInventory();
    }

    const portTimer = window.setInterval(() => {
      void syncPortsAndInventory();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(portTimer);
    };
  }, [appendWatchLog, connectionMode, hydrated, refreshInventory, setAvailablePorts]);
}
