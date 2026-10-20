import { useEffect } from "react";

import { savePersistedState } from "@/lib/backend";
import { useIorubaStore } from "@/store/ioruba-store";

export function usePersistence() {
  const hydrated = useIorubaStore((state) => state.hydrated);
  const persisted = useIorubaStore((state) => state.persisted);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void savePersistedState(persisted).catch((error: unknown) => {
        useIorubaStore.getState().appendWatchLog({
          scope: "backend",
          level: "error",
          message: "Falha ao salvar configuracoes",
          detail: error instanceof Error ? error.message : String(error),
        });
      });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hydrated, persisted]);
}
