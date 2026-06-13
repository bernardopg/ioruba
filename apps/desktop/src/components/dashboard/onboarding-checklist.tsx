import { CheckCircle2, Circle, Rocket, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { translateText } from "@/lib/i18n";
import type { AudioInventory, RuntimeSnapshot, UiLanguage } from "@ioruba/shared";

interface ChecklistItem {
  done: boolean;
  title: string;
  hint: string;
}

export function OnboardingChecklist({
  snapshot,
  audioInventory,
  language,
  onDismiss
}: {
  snapshot: RuntimeSnapshot;
  audioInventory: AudioInventory;
  language: UiLanguage;
  onDismiss: () => void;
}) {
  const lt = (text: string) => translateText(language, text);

  const firmwareReady = snapshot.diagnostics.firmware !== null;
  const portReady =
    snapshot.connectionPort !== null || snapshot.availablePorts.length > 0;
  const audioReady = audioInventory.backend === "pactl";

  const items: ChecklistItem[] = [
    {
      done: firmwareReady,
      title: lt("Conecte o controlador"),
      hint: firmwareReady
        ? lt("Handshake do firmware recebido.")
        : lt("Ligue o Arduino e aguarde o handshake do firmware.")
    },
    {
      done: portReady,
      title: lt("Encontre a porta serial"),
      hint: portReady
        ? lt("Porta serial detectada.")
        : lt("Nenhuma porta serial disponível ainda. Verifique o cabo USB.")
    },
    {
      done: audioReady,
      title: lt("Verifique o áudio do sistema"),
      hint: audioReady
        ? lt("Backend de áudio pactl disponível.")
        : lt("Backend de áudio indisponível. Instale o pipewire-pulse ou pulseaudio-utils.")
    }
  ];

  const completed = items.filter((item) => item.done).length;

  return (
    <section
      aria-label={lt("Primeiros passos")}
      className="rounded-[var(--radius-card)] border border-(--color-border) bg-[linear-gradient(150deg,color-mix(in_oklab,var(--accent-teal)_10%,var(--color-panel))_0%,var(--color-panel)_60%)] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--accent-teal)_45%,var(--color-border))] bg-(--color-panel)">
            <Rocket className="h-5 w-5 text-(--accent-teal)" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-(--color-ink)">
              {lt("Primeiros passos")}
            </h2>
            <p className="text-sm text-(--color-muted)">
              {completed}/{items.length} {lt("concluídos")}
            </p>
          </div>
        </div>
        <Button
          aria-label={lt("Dispensar primeiros passos")}
          className="px-2"
          onClick={onDismiss}
          size="small"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ul className="mt-4 grid gap-2">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex items-start gap-3 rounded-[16px] border border-(--color-border) bg-(--color-panel) px-4 py-3"
          >
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-(--accent-teal)" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-(--color-muted)" />
            )}
            <div className="min-w-0">
              <p
                className={
                  item.done
                    ? "text-sm font-semibold text-(--color-muted) line-through"
                    : "text-sm font-semibold text-(--color-ink)"
                }
              >
                {item.title}
              </p>
              <p className="text-xs leading-5 text-(--color-muted)">{item.hint}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
