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
      void savePersistedState(persisted);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hydrated, persisted]);
}
