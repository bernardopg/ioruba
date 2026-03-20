import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { type WatchLogInput } from "@/lib/watch";
import { useIorubaStore } from "@/store/ioruba-store";

export function useWatchBridge() {
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let unlisten: (() => void) | null = null;

    void listen<WatchLogInput>("ioruba:watch-log", ({ payload }) => {
      appendWatchLog(payload);
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }

      unlisten = cleanup;
      appendWatchLog({
        scope: "app",
        level: "info",
        message: "Watch bridge ativo"
      });
    }).catch((error: unknown) => {
      appendWatchLog({
        scope: "backend",
        level: "error",
        message: "Watch bridge indisponivel",
        detail: error instanceof Error ? error.message : String(error)
      });
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [appendWatchLog]);
}
