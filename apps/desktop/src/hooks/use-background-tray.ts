import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useIorubaStore } from "@/store/ioruba-store";

export function useBackgroundTray() {
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const appWindow = getCurrentWindow();
    let unlisten: VoidFunction | null = null;
    let disposed = false;

    async function bindCloseHandler() {
      unlisten = await appWindow.onCloseRequested(async (event) => {
        event.preventDefault();

        try {
          await appWindow.hide();
          appendWatchLog({
            scope: "app",
            level: "info",
            message: "Janela ocultada; runtime continua ativo no tray"
          });
        } catch (error) {
          appendWatchLog({
            scope: "app",
            level: "error",
            message: "Falha ao ocultar janela no fechamento",
            detail: error instanceof Error ? error.message : String(error)
          });
        }
      });

      if (disposed && unlisten) {
        unlisten();
        unlisten = null;
      }
    }

    void bindCloseHandler();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [appendWatchLog]);
}
