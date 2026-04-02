import { useEffect } from "react";

import type { ThemeMode } from "@ioruba/shared";

export function useThemeSync(themeMode: ThemeMode) {
  useEffect(() => {
    const root = document.documentElement;

    if (themeMode === "system") {
      delete root.dataset.theme;
      root.dataset.themeSource = "system";
      return;
    }

    root.dataset.theme = themeMode;
    root.dataset.themeSource = themeMode;

    return () => {
      delete root.dataset.theme;
      delete root.dataset.themeSource;
    };
  }, [themeMode]);
}