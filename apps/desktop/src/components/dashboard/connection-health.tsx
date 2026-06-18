import { useEffect, useState } from "react";

import { translateText } from "@/lib/i18n";
import type { RuntimeStatus, UiLanguage } from "@ioruba/shared";

type HealthTone = "online" | "demo" | "linking" | "boot" | "offline" | "error";

const STATUS_TONE: Record<RuntimeStatus, HealthTone> = {
  booting: "boot",
  ready: "offline",
  searching: "linking",
  connecting: "linking",
  connected: "online",
  demo: "demo",
  disconnected: "offline",
  error: "error"
};

const STATUS_LABEL: Record<RuntimeStatus, string> = {
  booting: "Iniciando",
  ready: "Pronto",
  searching: "Procurando",
  connecting: "Conectando",
  connected: "Conectado",
  demo: "Demo",
  disconnected: "Desconectado",
  error: "Erro"
};

/**
 * Indicador de saúde da conexão sempre visível no topo do sidebar (alinhado ao
 * `.impeccable.md`, princípio "o estado da conexão não pode passar despercebido").
 * Mostra o estado do runtime e a frescura do sinal serial — o tempo desde o
 * último frame, atualizado a cada segundo, como proxy de latência/atividade.
 */
export function ConnectionHealthIndicator({
  status,
  statusText,
  lastFrameAt,
  language = "pt-BR"
}: {
  status: RuntimeStatus;
  statusText: string;
  lastFrameAt: number | null;
  language?: UiLanguage;
}) {
  const lt = (text: string) => translateText(language, text);
  const tone = STATUS_TONE[status];
  const live = status === "connected" || status === "demo";

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (lastFrameAt === null) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lastFrameAt]);

  const ageMs = lastFrameAt === null ? null : Math.max(0, now - lastFrameAt);
  const signalLabel =
    ageMs === null
      ? lt("sem sinal")
      : ageMs < 1500
        ? lt("ao vivo")
        : `${Math.round(ageMs / 1000)}s ${lt("atrás")}`;
  const signalStale = ageMs !== null && ageMs >= 3000;

  return (
    <div
      aria-label={`${lt("Saúde da conexão")}: ${lt(STATUS_LABEL[status])}. ${lt("Sinal")}: ${signalLabel}.`}
      className="connection-health"
      data-health={tone}
      role="status"
    >
      <span
        aria-hidden="true"
        className="connection-health-dot"
        data-live={live && !signalStale}
      />
      <div className="min-w-0">
        <p className="connection-health-status">{lt(STATUS_LABEL[status])}</p>
        <p className="connection-health-signal" data-stale={signalStale}>
          {lt("Sinal")}: {signalLabel}
        </p>
      </div>
    </div>
  );
}
