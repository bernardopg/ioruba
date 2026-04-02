import {
  AudioLines,
  Binary,
  CircleDotDashed,
  Gauge,
  PlugZap
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuntimeKnobSnapshot, RuntimeSnapshot } from "@ioruba/shared";

function toneForStatus(status: string): "neutral" | "positive" | "warning" | "critical" {
  switch (status) {
    case "connected":
    case "demo":
      return "positive";
    case "searching":
    case "connecting":
    case "disconnected":
      return "warning";
    case "error":
      return "critical";
    default:
      return "neutral";
  }
}

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

export function OverviewSignalPanel({
  activeProfileName,
  snapshot
}: {
  activeProfileName: string;
  snapshot: RuntimeSnapshot;
}) {
  const latestTick = snapshot.telemetry.at(-1)?.tick ?? 0;
  const targetCount = snapshot.knobs.reduce(
    (total, knob) => total + knob.targets.length,
    0
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-(--color-border) pb-5">
        <div>
          <CardTitle>Sessao viva</CardTitle>
          <CardDescription>
            Estado atual do link serial, perfil carregado e resposta dos knobs.
          </CardDescription>
        </div>
        <Badge className="self-start" tone={toneForStatus(snapshot.status)}>
          {snapshot.status}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 pt-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <SignalStat
            icon={PlugZap}
            label="Serial"
            value={snapshot.connectionPort ?? "Aguardando porta"}
            hint={snapshot.statusText}
          />
          <SignalStat
            icon={AudioLines}
            label="Perfil"
            value={activeProfileName}
            hint={`${targetCount} destino(s) mapeado(s)`}
          />
          <SignalStat
            icon={Binary}
            label="Ultimo frame"
            value={snapshot.diagnostics.lastSerialLine ?? "Aguardando leitura"}
            hint={`tick ${latestTick || "inicial"}`}
            mono
          />
          <SignalStat
            icon={CircleDotDashed}
            label="Buffer"
            value={`${snapshot.telemetry.length} amostra(s)`}
            hint={snapshot.diagnostics.audioSummary}
          />
        </div>

        <div className="rounded-3xl border border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_92%,var(--color-shell)_8%)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                Leitura atual
              </p>
              <p className="mt-1 text-sm text-(--color-copy)">
                Todos os canais espelhados como instrumentos vivos.
              </p>
            </div>
            <Gauge className="h-4 w-4 text-(--accent-copper)" />
          </div>

          <div className="mt-4 grid gap-3">
            {snapshot.knobs.map((knob) => (
              <KnobLiveRow key={knob.id} knob={knob} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SignalStat({
  icon: Icon,
  label,
  value,
  hint,
  mono = false
}: {
  icon: typeof PlugZap;
  label: string;
  value: string;
  hint: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_94%,var(--color-shell)_6%)] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-(--color-border) bg-(--color-shell)">
          <Icon className="h-4 w-4 text-(--accent-teal)" />
        </div>
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-(--color-muted)">
            {label}
          </p>
          <p
            className={`mt-1 wrap-break-word text-sm font-semibold text-(--color-ink) ${
              mono ? "font-mono text-[13px]" : ""
            }`}
          >
            {value}
          </p>
          <p className="mt-1 text-sm leading-5 text-(--color-muted)">
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
}

function KnobLiveRow({ knob }: { knob: RuntimeKnobSnapshot }) {
  const accent = accentColor(knob.accent);

  return (
    <div className="rounded-[20px] border border-(--color-border) bg-(--color-panel) px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-(--color-ink)">
            {knob.name}
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-(--color-muted)">
            aplicada {knob.appliedRawValue}
          </p>
        </div>
        <div
          className="rounded-full px-3 py-1 text-sm font-semibold"
          style={{
            background: `color-mix(in oklab, ${accent} 16%, var(--color-panel))`,
            color: accent
          }}
        >
          {knob.percent}%
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-border)_60%,transparent)]">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${knob.percent}%`,
            background: `linear-gradient(90deg, ${accent}, color-mix(in oklab, ${accent} 68%, var(--color-glow)))`
          }}
        />
      </div>
    </div>
  );
}
