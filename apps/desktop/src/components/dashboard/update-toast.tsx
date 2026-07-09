import { RefreshCcw, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { restartApp } from "@/lib/backend";
import { translateText } from "@/lib/i18n";
import { useIorubaStore } from "@/store/ioruba-store";
import type { UiLanguage } from "@ioruba/shared";

export function UpdateToast({ language }: { language: UiLanguage }) {
  const updatePending = useIorubaStore((state) => state.updatePending);
  const setUpdatePending = useIorubaStore((state) => state.setUpdatePending);
  const [restarting, setRestarting] = useState(false);
  const lt = (text: string) => translateText(language, text);

  if (!updatePending) {
    return null;
  }

  async function handleRestart() {
    setRestarting(true);
    await restartApp();
  }

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--accent-copper)_40%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-copper)_14%,var(--color-panel))] px-4 py-3 text-sm text-[var(--color-copy)] [box-shadow:var(--shadow-panel)] backdrop-blur-sm"
    >
      <RefreshCcw
        className={`mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-copper-strong)] ${restarting ? "animate-spin" : ""}`}
      />
      <div className="flex-1">
        <p className="font-semibold text-[var(--color-ink)]">
          {lt("Atualização instalada")}
        </p>
        <p className="mt-0.5 text-[var(--color-muted)]">
          {lt(
            "Reinicie o Ioruba para aplicar. Fechar a janela agora também reinicia automaticamente."
          )}
        </p>
        <div className="mt-2 flex gap-2">
          <Button size="small" onClick={handleRestart} disabled={restarting}>
            {restarting ? lt("Reiniciando...") : lt("Reiniciar agora")}
          </Button>
          <Button
            size="small"
            variant="ghost"
            onClick={() => setUpdatePending(false)}
            disabled={restarting}
          >
            {lt("Depois")}
          </Button>
        </div>
      </div>
      <button
        type="button"
        aria-label={lt("Fechar aviso")}
        onClick={() => setUpdatePending(false)}
        disabled={restarting}
        className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
