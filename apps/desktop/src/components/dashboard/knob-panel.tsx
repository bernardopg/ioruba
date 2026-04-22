import type { HTMLAttributes } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { translateText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { RuntimeKnobSnapshot, RuntimeTargetOutcome, SliderOutcome, UiLanguage } from "@ioruba/shared";

function accentColor(accent: string): string {
  switch (accent) {
    case "amber":
      return "var(--accent-copper)";
    case "teal":
      return "var(--accent-teal)";
    case "rose":
      return "var(--accent-rose)";
    case "lime":
      return "var(--accent-lime)";
    default:
      return "var(--accent-sky)";
  }
}

function toneForOutcome(
  severity: SliderOutcome["severity"]
): "neutral" | "positive" | "warning" | "critical" {
  switch (severity) {
    case "success":
      return "positive";
    case "warning":
      return "warning";
    case "error":
      return "critical";
    default:
      return "neutral";
  }
}

function labelForTargetStatus(
  status: RuntimeTargetOutcome["status"],
  lt: (text: string) => string
) {
  switch (status) {
    case "updated":
      return lt("atualizado");
    case "idle":
      return lt("ocioso");
    case "unavailable":
      return lt("indisponível");
    case "skipped":
      return lt("ignorado");
    case "error":
      return lt("erro");
  }
}

function toneForTargetStatus(
  status: RuntimeTargetOutcome["status"]
): "neutral" | "positive" | "warning" | "critical" {
  switch (status) {
    case "updated":
      return "positive";
    case "error":
      return "critical";
    case "idle":
    case "unavailable":
      return "warning";
    default:
      return "neutral";
  }
}

export function KnobPanel({
  className,
  knob,
  language = "pt-BR"
}: {
  className?: HTMLAttributes<HTMLDivElement>["className"];
  knob: RuntimeKnobSnapshot;
  language?: UiLanguage;
}) {
  const lt = (text: string) => translateText(language, text);
  const accent = accentColor(knob.accent);

  return (
    <Card
      className={cn(
        "relative min-w-0 overflow-hidden bg-[linear-gradient(155deg,color-mix(in_oklab,var(--color-panel)_92%,transparent)_0%,color-mix(in_oklab,var(--color-shell)_90%,transparent)_100%)]",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-70"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${accent} 18%, transparent) 0%, transparent 100%)`
        }}
      />
      <CardHeader className="relative flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <CardTitle className="min-w-0 break-words text-[clamp(1rem,0.6vw+0.9rem,1.35rem)] leading-tight">
              {knob.name}
            </CardTitle>
          </div>
          <CardDescription className="break-words">
            {lt("Leitura bruta")} {knob.rawValue} | {lt("aplicada")} {knob.appliedRawValue}
          </CardDescription>
        </div>
        <Badge className="shrink-0 self-start" tone="neutral">
          {knob.targets.length} {lt("alvo(s)")}
        </Badge>
      </CardHeader>
      <CardContent className="relative grid min-w-0 gap-5 pt-2">
        <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div
            className="relative mx-auto h-28 w-28 rounded-full border border-(--color-border) [box-shadow:inset_0_1px_0_var(--edge-highlight)] sm:mx-0 sm:h-32 sm:w-32"
            style={{
              background: `conic-gradient(${accent} 0deg ${knob.percent * 3.6
                }deg, color-mix(in oklab, var(--color-border) 44%, transparent) ${knob.percent * 3.6}deg 360deg)`
            }}
          >
            <div className="absolute inset-3 rounded-full border border-[color-mix(in_oklab,var(--color-border)_75%,transparent)] bg-[color-mix(in_oklab,var(--color-shell)_95%,var(--color-panel)_5%)]" />
            <div className="absolute inset-[26%] grid place-items-center rounded-full border border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_95%,var(--color-shell)_5%)]">
              <div className="text-center">
                <span className="font-display text-base font-semibold text-(--color-ink) sm:text-lg">
                  {knob.percent}%
                </span>
                <p className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-(--color-muted)">
                  {lt("nível")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3">
            <DialStat accent={accent} label={lt("Entrada")} value={String(knob.rawValue)} />
            <DialStat accent={accent} label={lt("Saida")} value={String(knob.appliedRawValue)} />
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="rounded-[22px] border border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_94%,var(--color-shell)_6%)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                {lt("Resposta do canal")}
              </p>
              <span className="text-sm font-semibold text-(--color-ink)">
                {knob.percent}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-border)_55%,transparent)]">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${knob.percent}%`,
                  background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 68%, var(--color-glow)))`
                }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-(--color-copy)">
              {lt("Valor aplicado pronto para audio backend e telemetria.")}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
              {lt("Destinos ativos")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {knob.targets.map((target) => (
                <span
                  key={target}
                  className="inline-flex min-h-9 max-w-full items-center rounded-full border border-(--color-border) bg-(--color-panel) px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-(--color-copy) break-all"
                >
                  {target}
                </span>
              ))}
            </div>
          </div>

          <div
            aria-atomic="true"
            aria-live="polite"
            className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-4"
            role="status"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                {lt("Ultimo resultado")}
              </p>
              <Badge tone={toneForOutcome(knob.outcome.severity)}>
                {knob.outcome.severity}
              </Badge>
            </div>
            <p className="mt-3 break-words text-sm leading-6 text-(--color-copy)">
              {knob.outcome.summary}
            </p>

            {knob.outcome.targets.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {knob.outcome.targets.map((targetOutcome) => (
                  <div
                    className="rounded-[18px] border border-(--color-border) bg-[color-mix(in_oklab,var(--color-shell)_75%,var(--color-panel)_25%)] px-3 py-3"
                    key={`${targetOutcome.target}-${targetOutcome.status}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-ink)">
                        {targetOutcome.target}
                      </p>
                      <Badge tone={toneForTargetStatus(targetOutcome.status)}>
                        {labelForTargetStatus(targetOutcome.status, lt)}
                      </Badge>
                    </div>
                    <p className="mt-2 break-words text-sm leading-6 text-(--color-copy)">
                      {targetOutcome.detail}
                    </p>

                    {targetOutcome.matched.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {targetOutcome.matched.map((matched) => (
                          <span
                            className="inline-flex max-w-full items-center rounded-full border border-(--color-border) bg-(--color-panel) px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--color-muted) break-all"
                            key={matched}
                          >
                            {matched}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DialStat({
  accent,
  label,
  value
}: {
  accent: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-(--color-border) bg-(--color-panel) px-3 py-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-(--color-ink)">{value}</p>
      <div
        className="mt-3 h-1.5 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 32%, transparent))`
        }}
      />
    </div>
  );
}
