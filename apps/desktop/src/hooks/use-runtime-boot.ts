import { useEffect, useRef } from "react";
import { SerialPort } from "tauri-plugin-serialplugin-api";

import { listAudioInventory, loadPersistedState } from "@/lib/backend";
import { useIorubaStore } from "@/store/ioruba-store";

function normalizePortPaths(candidate: unknown): string[] {
  if (Array.isArray(candidate)) {
    return candidate
      .map((value) => {
        if (typeof value === "string") {
          return value;
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "port_name" in value &&
          typeof value.port_name === "string"
        ) {
          return value.port_name;
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "path" in value &&
          typeof value.path === "string"
        ) {
          return value.path;
        }
        return null;
      })
      .filter((value): value is string => value !== null);
  }

  if (candidate && typeof candidate === "object") {
    return Object.keys(candidate);
  }

  return [];
}

export function useRuntimeBoot() {
  const hydrate = useIorubaStore((state) => state.hydrate);
  const refreshInventory = useIorubaStore((state) => state.refreshInventory);
  const setAvailablePorts = useIorubaStore((state) => state.setAvailablePorts);
  const requestConnect = useIorubaStore((state) => state.requestConnect);
  const setDemoMode = useIorubaStore((state) => state.setDemoMode);
  const hydrated = useIorubaStore((state) => state.hydrated);
  const autoConnected = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const [persisted, inventory] = await Promise.all([
        loadPersistedState(),
        listAudioInventory()
      ]);

      if (cancelled) {
        return;
      }

      hydrate(persisted, inventory);

      if (persisted.demoMode) {
        setDemoMode(true);
      } else if (persisted.profiles[0]?.serial.autoConnect) {
        requestConnect();
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [hydrate, requestConnect, setDemoMode]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;

    async function syncPortsAndInventory() {
      try {
        const [ports, inventory] = await Promise.all([
          SerialPort.available_ports(),
          listAudioInventory()
        ]);

        if (cancelled) {
          return;
        }

        setAvailablePorts(normalizePortPaths(ports));
        refreshInventory(inventory);
      } catch (_error) {
        if (!cancelled) {
          setAvailablePorts([]);
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
  }, [hydrated, refreshInventory, setAvailablePorts]);
}
