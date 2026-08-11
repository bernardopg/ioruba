import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useRef, useState } from "react";

import { useIorubaStore } from "@/store/ioruba-store";

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface SignedUpdateState {
  available: boolean;
  version: string | null;
  installing: boolean;
  error: string | null;
  dismiss: () => void;
  install: () => Promise<void>;
}

const EMPTY_STATE: SignedUpdateState = {
  available: false,
  version: null,
  installing: false,
  error: null,
  dismiss: () => undefined,
  install: async () => undefined,
};

/**
 * Checks Tauri's signed `latest.json` endpoint and installs only an artifact
 * verified by the public key embedded in `tauri.conf.json`.
 *
 * This deliberately does not run in Vite/browser development. The previous
 * GitHub-release check remains the browser fallback; a native build must use
 * the updater plugin so a URL alone can never be mistaken for an update.
 */
export function useSignedUpdater(enabled: boolean): SignedUpdateState {
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);
  const [candidate, setCandidate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const candidateRef = useRef<Update | null>(null);
  const loggedFailure = useRef(false);

  useEffect(() => {
    candidateRef.current = candidate;
  }, [candidate]);

  useEffect(() => {
    if (!enabled || !isTauri()) {
      return;
    }

    let disposed = false;

    async function checkForUpdate() {
      if (candidateRef.current) {
        return;
      }

      try {
        const update = await check();
        if (disposed) {
          await update?.close();
          return;
        }
        setCandidate(update);
        setError(null);
      } catch (cause) {
        if (disposed || loggedFailure.current) {
          return;
        }
        loggedFailure.current = true;
        appendWatchLog({
          scope: "app",
          level: "warning",
          message: "Checagem de atualização assinada indisponível",
          detail: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }

    void checkForUpdate();
    const interval = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      const update = candidateRef.current;
      candidateRef.current = null;
      void update?.close();
    };
  }, [appendWatchLog, enabled]);

  const dismiss = useCallback(() => {
    const update = candidateRef.current;
    candidateRef.current = null;
    setCandidate(null);
    setError(null);
    void update?.close();
  }, []);

  const install = useCallback(async () => {
    const update = candidateRef.current;
    if (!update || installing) {
      return;
    }

    setInstalling(true);
    setError(null);
    try {
      await update.downloadAndInstall();
      // The installer has replaced the bundle only after the updater verified
      // its detached signature. Relaunch hands control to that new bundle.
      await relaunch();
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      setError(detail);
      setInstalling(false);
      appendWatchLog({
        scope: "app",
        level: "error",
        message: "Falha ao baixar atualização assinada",
        detail,
      });
    }
  }, [appendWatchLog, installing]);

  if (!isTauri()) {
    return EMPTY_STATE;
  }

  return {
    available: candidate !== null,
    version: candidate?.version ?? null,
    installing,
    error,
    dismiss,
    install,
  };
}
