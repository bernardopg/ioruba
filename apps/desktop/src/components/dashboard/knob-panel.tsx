import type { HTMLAttributes } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RuntimeKnobSnapshot } from "@ioruba/shared";

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

export function KnobPanel({
  className,
  knob
}: {
  className?: HTMLAttributes<HTMLDivElement>["className"];
  knob: RuntimeKnobSnapshot;
}) {
  const accent = accentColor(knob.accent);

  return (
    <Card
      className={cn(
        "relative min-h-[340px] overflow-hidden bg-[linear-gradient(155deg,color-mix(in_oklab,var(--color-panel)_92%,transparent)_0%,color-mix(in_oklab,var(--color-shell)_90%,transparent)_100%)]",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-70"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, ${accent} 18%, transparent) 0%, transparent 100%)`
        }}
      />
      <CardHeader className="relative pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <CardTitle className="truncate text-[clamp(1.1rem,1vw+0.95rem,1.45rem)]">
              {knob.name}
            </CardTitle>
          </div>
          <CardDescription>
            Leitura bruta {knob.rawValue} | aplicada {knob.appliedRawValue}
          </CardDescription>
        </div>
        <Badge className="shrink-0 self-start" tone="neutral">
          {knob.targets.length} alvo(s)
        </Badge>
      </CardHeader>
      <CardContent className="relative grid gap-6 pt-2 xl:grid-cols-[180px_minmax(0,1fr)] xl:items-start">
        <div className="grid gap-4">
          <div
            className="relative mx-auto h-40 w-40 rounded-full border border-[var(--color-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
            style={{
              background: `conic-gradient(${accent} 0deg ${
                knob.percent * 3.6
              }deg, color-mix(in oklab, var(--color-border) 44%, transparent) ${knob.percent * 3.6}deg 360deg)`
            }}
          >
            <div className="absolute inset-[14px] rounded-full border border-[color-mix(in_oklab,var(--color-border)_75%,transparent)] bg-[color-mix(in_oklab,var(--color-shell)_95%,var(--color-panel)_5%)]" />
            <div className="absolute inset-[24%] grid place-items-center rounded-full border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-panel)_95%,var(--color-shell)_5%)]">
              <div className="text-center">
                <span className="font-display text-4xl font-semibold text-[var(--color-ink)]">
                  {knob.percent}%
                </span>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  nivel
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DialStat accent={accent} label="Entrada" value={String(knob.rawValue)} />
            <DialStat accent={accent} label="Saida" value={String(knob.appliedRawValue)} />
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="rounded-[22px] border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-panel)_94%,var(--color-shell)_6%)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                Resposta do canal
              </p>
              <span className="text-sm font-semibold text-[var(--color-ink)]">
                {knob.percent}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-border)_55%,transparent)]">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${knob.percent}%`,
                  background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 68%, white))`
                }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-copy)]">
              Valor aplicado pronto para audio backend e telemetria.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Destinos ativos
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {knob.targets.map((target) => (
                <span
                  key={target}
                  className="inline-flex min-h-9 max-w-full items-center rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-copy)] break-all"
                >
                  {target}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Ultimo resultado
            </p>
            <p className="mt-3 break-words text-sm leading-6 text-[var(--color-copy)]">
              {knob.outcome}
            </p>
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
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{value}</p>
      <div
        className="mt-3 h-1.5 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 32%, transparent))`
        }}
      />
    </div>
  );
}
