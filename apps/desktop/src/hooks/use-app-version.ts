import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function useAppVersion(): string {
  const [version, setVersion] = useState(__APP_VERSION__);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let active = true;
    void getVersion()
      .then((runtimeVersion) => {
        if (active) {
          setVersion(runtimeVersion);
        }
      })
      .catch(() => {
        // The build-time version remains a useful fallback if the app API fails.
      });

    return () => {
      active = false;
    };
  }, []);

  return version;
}
