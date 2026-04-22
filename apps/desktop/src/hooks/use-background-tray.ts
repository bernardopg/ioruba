import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useIorubaStore } from "@/store/ioruba-store";

/**
 * Registra um listener redundante para eventos de fechamento da janela.
 *
 * A interceptacao real de "close -> minimize to tray" vive no backend Rust
 * (`on_window_event` em `src-tauri/src/lib.rs`), porque em compositores
 * Wayland como o Hyprland o sinal `xdg_toplevel.close` precisa ser tratado
 * antes do webview encerrar. Este hook existe apenas para registrar o evento
 * no watch log do lado do frontend, facilitando a depuracao.
 */
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
      unlisten = await appWindow.onCloseRequested(() => {
        // Nao chamamos preventDefault aqui: o handler nativo ja cancela o
        // fechamento e esconde a janela. Apenas registramos para observabilidade.
        appendWatchLog({
          scope: "app",
          level: "info",
          message: "Solicitacao de fechamento recebida; redirecionando para o tray"
        });
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
