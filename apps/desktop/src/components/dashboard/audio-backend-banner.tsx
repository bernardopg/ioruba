import { AlertTriangle } from "lucide-react";

import { translateText } from "@/lib/i18n";
import type { UiLanguage } from "@ioruba/shared";

/**
 * Shown when the audio backend is unavailable (pactl not found on PATH).
 * inventory.backend === "unsupported" is the signal — set by audio/linux.rs
 * when `pactl --version` exits non-zero or is not on PATH.
 */
export function AudioBackendBanner({
  backend,
  diagnostics,
  language = "pt-BR"
}: {
  backend: string;
  diagnostics: string[];
  language?: UiLanguage;
}) {
  if (backend !== "unsupported") {
    return null;
  }

  const lt = (text: string) => translateText(language, text);

  return (
    <div
      aria-atomic="true"
      aria-label={lt("Backend de áudio indisponível")}
      aria-live="assertive"
      className="flex gap-4 rounded-[22px] border border-[color-mix(in_oklab,var(--accent-rose)_40%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-rose)_8%,var(--color-panel))] px-5 py-4"
      role="alert"
    >
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[color-mix(in_oklab,var(--accent-rose)_32%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-rose)_14%,var(--color-panel))]">
        <AlertTriangle className="h-4 w-4 text-(--accent-rose)" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-(--color-ink)">
          {lt("Backend de áudio indisponível")}
        </p>
        <p className="mt-1 text-sm leading-5 text-(--color-copy)">
          {lt(
            "O Ioruba não encontrou o pactl no PATH. O controle de volume está desativado até que o backend seja instalado."
          )}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-(--color-muted)">
          {lt("Como instalar")}
        </p>
        <ul className="mt-1 space-y-1">
          <li className="font-mono text-xs text-(--color-copy)">
            <span className="text-(--color-muted)">Arch / Manjaro: </span>
            sudo pacman -S pipewire-pulse
          </li>
          <li className="font-mono text-xs text-(--color-copy)">
            <span className="text-(--color-muted)">Debian / Ubuntu: </span>
            sudo apt install pulseaudio-utils
          </li>
          <li className="font-mono text-xs text-(--color-copy)">
            <span className="text-(--color-muted)">Fedora: </span>
            sudo dnf install pulseaudio-utils
          </li>
        </ul>
        {diagnostics.length > 0 ? (
          <p className="mt-3 font-mono text-xs leading-5 text-(--color-muted)">
            {diagnostics[0]}
          </p>
        ) : null}
      </div>
    </div>
  );
}
