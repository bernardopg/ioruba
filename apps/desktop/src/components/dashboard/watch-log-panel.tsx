import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { translateText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  formatWatchTimestamp,
  type WatchLevel,
  type WatchLogEntry,
  type WatchScope
} from "@/lib/watch";
import type { RuntimeSnapshot, UiLanguage } from "@ioruba/shared";

type WatchFilter = "all" | WatchScope;

function toneForScope(scope: WatchScope): "neutral" | "positive" | "warning" {
  switch (scope) {
    case "serial":
      return "warning";
    case "backend":
      return "positive";
    default:
      return "neutral";
  }
}

function toneForLevel(level: WatchLevel): "neutral" | "positive" | "warning" | "critical" {
  switch (level) {
    case "warning":
      return "warning";
    case "error":
      return "critical";
    default:
      return "neutral";
  }
}

function labelForScope(scope: WatchScope, lt: (text: string) => string): string {
  switch (scope) {
    case "serial":
      return lt("Serial");
    case "backend":
      return lt("Backend");
    default:
      return lt("App");
  }
}

function labelForLevel(level: WatchLevel, lt: (text: string) => string): string {
  switch (level) {
    case "warning":
      return lt("Warning");
    case "error":
      return lt("Error");
    default:
      return lt("Info");
  }
}

export function WatchLogPanel({
  watchLog,
  snapshot,
  activeProfileName,
  language = "pt-BR",
  onClear
}: {
  watchLog: WatchLogEntry[];
  snapshot: RuntimeSnapshot;
  activeProfileName: string;
  language?: UiLanguage;
  onClear: () => void;
}) {
  const lt = (text: string) => translateText(language, text);
  const [filter, setFilter] = useState<WatchFilter>("all");
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const visibleLogs =
    filter === "all"
      ? watchLog
      : watchLog.filter((entry) => entry.scope === filter);

  useEffect(() => {
    const root = scrollRef.current;
    const target = endRef.current;

    if (!root || !target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtBottom(entry.isIntersecting);
      },
      {
        root,
        threshold: 1
      }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (autoScrollEnabled && isAtBottom) {
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [autoScrollEnabled, isAtBottom, visibleLogs.length]);

  function scrollToLatest() {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  const counts = watchLog.reduce<Record<WatchScope, number>>(
    (accumulator, entry) => {
      accumulator[entry.scope] = (accumulator[entry.scope] ?? 0) + 1;
      return accumulator;
    },
    {
      app: 0,
      backend: 0,
      serial: 0
    }
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-(--color-border) pb-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{lt("Watch ao vivo")}</CardTitle>
              <Badge tone={watchLog.length > 0 ? "positive" : "neutral"}>
                {watchLog.length} {lt("evento(s)")}
              </Badge>
            </div>
            <CardDescription>
              {lt(
                "Espelha os eventos emitidos pela serial, pelo frontend e pelo backend Rust. Quando você girar um knob, o fluxo aparece aqui e no terminal do `tauri dev`."
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setFilter("all")}
              size="small"
              variant={filter === "all" ? "secondary" : "ghost"}
            >
              {lt("Todos")}
            </Button>
            <Button
              onClick={() => setFilter("serial")}
              size="small"
              variant={filter === "serial" ? "secondary" : "ghost"}
            >
              {lt("Serial")}
            </Button>
            <Button
              onClick={() => setFilter("backend")}
              size="small"
              variant={filter === "backend" ? "secondary" : "ghost"}
            >
              {lt("Backend")}
            </Button>
            <Button
              onClick={() => setFilter("app")}
              size="small"
              variant={filter === "app" ? "secondary" : "ghost"}
            >
              {lt("App")}
            </Button>
            <Button onClick={onClear} size="small" variant="ghost">
              {lt("Limpar")}
            </Button>
            <label className="ml-auto flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-panel) px-3 py-2 focus-within:border-[color-mix(in_oklab,var(--accent-teal)_42%,var(--color-border))] focus-within:[box-shadow:0_0_0_3px_color-mix(in_oklab,var(--accent-teal)_18%,transparent)]">
              <span className="text-[11px] uppercase tracking-[0.22em] text-(--color-muted)">
                {lt("Seguir fim")}
              </span>
              <Switch
                checked={autoScrollEnabled}
                onCheckedChange={setAutoScrollEnabled}
              />
            </label>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <StatChip label={lt("Serial")} value={String(counts.serial)} />
            <StatChip label={lt("Backend")} value={String(counts.backend)} />
            <StatChip label={lt("App")} value={String(counts.app)} />
          </div>

          <div className="relative">
            <div
              aria-atomic="false"
              aria-label={lt("Watch ao vivo")}
              aria-live="polite"
              aria-relevant="additions text"
              ref={scrollRef}
              className="max-h-155 space-y-3 overflow-auto pr-1 pb-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-teal) focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              role="log"
              tabIndex={0}
            >
              {visibleLogs.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-(--color-border) bg-(--color-panel) px-5 py-8 text-sm text-(--color-muted)">
                  {lt("Nenhum evento no filtro atual.")}
                </div>
              ) : (
                visibleLogs.map((entry) => (
                  <article
                    key={entry.seq}
                    className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={toneForScope(entry.scope)}>
                        {labelForScope(entry.scope, lt)}
                      </Badge>
                      <Badge tone={toneForLevel(entry.level)}>
                        {labelForLevel(entry.level, lt)}
                      </Badge>
                      <span className="text-xs uppercase tracking-[0.22em] text-(--color-muted)">
                        {formatWatchTimestamp(entry.timestampMs)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-(--color-ink)">
                      {lt(entry.message)}
                    </p>
                    {entry.detail ? (
                      <p className="mt-1 wrap-break-word font-mono text-xs leading-5 text-(--color-copy)">
                        {entry.detail}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
              <div ref={endRef} aria-hidden className="h-px w-full" />
            </div>

            {!isAtBottom ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-end pr-3">
                <Button
                  className="pointer-events-auto [box-shadow:var(--shadow-float)]"
                  onClick={scrollToLatest}
                  size="small"
                  variant="secondary"
                >
                  <ArrowDown className="h-4 w-4" />
                  {lt("Última linha")}
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-(--color-border) pb-5">
          <div>
            <CardTitle>{lt("Contexto ao vivo")}</CardTitle>
            <CardDescription>
              {lt("Resumo da sessão atual e do estado observado pelo watch.")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <KeyValue label={lt("Status")} value={lt(snapshot.statusText)} />
          <KeyValue
            label={lt("Porta ativa")}
            value={snapshot.connectionPort ?? lt("nenhuma")}
          />
          <KeyValue
            label={lt("Última serial")}
            value={snapshot.diagnostics.lastSerialLine ?? lt("aguardando")}
          />
          <KeyValue label={lt("Backend áudio")} value={snapshot.diagnostics.backend} />
          <KeyValue label={lt("Perfil ativo")} value={activeProfileName} />

          <div className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-4 text-sm text-(--color-muted)">
            {lt(
              "O terminal do Tauri mostra os `println!` do backend. Este painel espelha os eventos estruturados emitidos pela app, pela serial e pelo Rust."
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-(--color-border) bg-(--color-panel) px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-(--color-muted)">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-(--color-ink)">{value}</p>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-(--color-muted)">
        {label}
      </p>
      <p className={cn("mt-1 text-sm font-semibold text-(--color-ink)", {
        "break-all font-mono text-xs font-medium text-(--color-copy)":
          value.length > 32
      })}>
        {value}
      </p>
    </div>
  );
}
