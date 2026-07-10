import { useEffect, useRef } from "react";

import { useAppVersion } from "@/hooks/use-app-version";
import { useIorubaStore } from "@/store/ioruba-store";

const RELEASE_URL = "https://api.github.com/repos/bernardopg/ioruba/releases/latest";
const RELEASE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

interface GitHubRelease {
  tag_name?: unknown;
  html_url?: unknown;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  const parts = (version: string) =>
    version
      .replace(/^v/i, "")
      .split("-")[0]
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
  const candidateParts = parts(candidate);
  const currentParts = parts(current);

  for (let index = 0; index < Math.max(candidateParts.length, currentParts.length); index += 1) {
    const difference = (candidateParts[index] ?? 0) - (currentParts[index] ?? 0);
    if (difference !== 0) {
      return difference > 0;
    }
  }
  return false;
}

export function useReleaseCheck() {
  const currentVersion = useAppVersion();
  const enabled = useIorubaStore(
    (state) => state.persisted.notificationsEnabled !== false,
  );
  const pushNotification = useIorubaStore((state) => state.pushNotification);
  const setLastNotifiedReleaseVersion = useIorubaStore(
    (state) => state.setLastNotifiedReleaseVersion,
  );
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);
  const loggedFailure = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();

    async function checkLatestRelease() {
      try {
        const response = await fetch(RELEASE_URL, {
          headers: { Accept: "application/vnd.github+json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`GitHub release check returned ${response.status}`);
        }

        const payload = (await response.json()) as GitHubRelease;
        if (typeof payload.tag_name !== "string" || typeof payload.html_url !== "string") {
          throw new Error("GitHub release response is incomplete");
        }

        const releaseVersion = payload.tag_name.replace(/^v/i, "");
        const alreadyNotified =
          useIorubaStore.getState().persisted.lastNotifiedReleaseVersion;
        if (
          !isNewerVersion(releaseVersion, currentVersion) ||
          alreadyNotified === releaseVersion
        ) {
          return;
        }

        pushNotification({
          id: `release-${releaseVersion}`,
          kind: "release",
          title: "Nova versão disponível",
          detail: `v${releaseVersion}`,
          url: payload.html_url,
          read: false,
          createdAt: Date.now(),
        });
        setLastNotifiedReleaseVersion(releaseVersion);
      } catch (error) {
        if (controller.signal.aborted || loggedFailure.current) {
          return;
        }
        loggedFailure.current = true;
        appendWatchLog({
          scope: "app",
          level: "info",
          message: "Checagem de release indisponível",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    void checkLatestRelease();
    const interval = window.setInterval(checkLatestRelease, RELEASE_CHECK_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [
    appendWatchLog,
    currentVersion,
    enabled,
    pushNotification,
    setLastNotifiedReleaseVersion,
  ]);
}
