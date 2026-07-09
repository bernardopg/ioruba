import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { useIorubaStore } from "@/store/ioruba-store";

const UPDATE_PENDING_EVENT = "ioruba:update-pending";

/**
 * Escuta o evento emitido pelo backend quando o binário do Ioruba foi
 * trocado em disco (ex.: full-upgrade) enquanto este processo continua
 * rodando. Fechar a janela nesse estado reinicia automaticamente em vez de
 * esconder para o tray (ver `binary_replaced_on_disk` em `src-tauri/src/lib.rs`).
 */
export function useUpdateWatch() {
  const setUpdatePending = useIorubaStore((state) => state.setUpdatePending);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let unlisten: (() => void) | null = null;

    void listen(UPDATE_PENDING_EVENT, () => {
      setUpdatePending(true);
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unlisten = cleanup;
      })
      .catch(() => {
        // Sem esse listener o usuário só descobre a atualização pendente
        // pelo watch log; não é uma falha que precise de tratamento extra.
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [setUpdatePending]);
}
