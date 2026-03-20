import {
  LaptopMinimal,
  Mic2,
  PlugZap,
  Radar,
  RefreshCcw,
  Settings2,
  Waves
} from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnobPanel } from "@/components/dashboard/knob-panel";
import { OverviewSignalPanel } from "@/components/dashboard/overview-signal-panel";
import { WatchLogPanel } from "@/components/dashboard/watch-log-panel";
import { TelemetryChart } from "@/components/dashboard/telemetry-chart";
import { usePersistence } from "@/hooks/use-persistence";
import { useRuntimeBoot } from "@/hooks/use-runtime-boot";
import { useSerialRuntime } from "@/hooks/use-serial-runtime";
import { useWatchBridge } from "@/hooks/use-watch-bridge";
import { listAudioInventory } from "@/lib/backend";
import {
  parseProfileDraft,
  serializeProfileDraft
} from "@/lib/profile-config";
import { cn } from "@/lib/utils";
import { useIorubaStore } from "@/store/ioruba-store";
import { resolveActiveProfile } from "@ioruba/shared";

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

export default function App() {
  useWatchBridge();
  useRuntimeBoot();
  usePersistence();
  useSerialRuntime();

  const persisted = useIorubaStore((state) => state.persisted);
  const snapshot = useIorubaStore((state) => state.snapshot);
  const watchLog = useIorubaStore((state) => state.watchLog);
  const configDraft = useIorubaStore((state) => state.configDraft);
  const setConfigDraft = useIorubaStore((state) => state.setConfigDraft);
  const applyConfigDraft = useIorubaStore((state) => state.applyConfigDraft);
  const resetProfile = useIorubaStore((state) => state.resetProfile);
  const requestConnect = useIorubaStore((state) => state.requestConnect);
  const disconnect = useIorubaStore((state) => state.disconnect);
  const setDemoMode = useIorubaStore((state) => state.setDemoMode);
  const setPreferredPort = useIorubaStore((state) => state.setPreferredPort);
  const refreshInventory = useIorubaStore((state) => state.refreshInventory);
  const clearWatchLog = useIorubaStore((state) => state.clearWatchLog);
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);
  const audioInventory = useIorubaStore((state) => state.audioInventory);
  const activeProfile = resolveActiveProfile(persisted);
  const draftValidation = parseProfileDraft(configDraft);
  const savedConfigDraft = serializeProfileDraft(activeProfile);
  const draftIsDirty = configDraft !== savedConfigDraft;
  const draftStatusTone = draftValidation.ok
    ? draftIsDirty
      ? "warning"
      : "positive"
    : "critical";
  const draftStatusLabel = draftValidation.ok
    ? draftIsDirty
      ? "Alteracoes pendentes"
      : "Perfil salvo"
    : "JSON invalido";
  const draftStatusHint = draftValidation.ok
    ? draftIsDirty
      ? "Salve para persistir o perfil ativo."
      : "O editor esta sincronizado com o perfil salvo."
    : draftValidation.error;
  const draftErrorId = "profile-draft-error";

  return (
    <main className="min-h-screen bg-[var(--color-shell)] text-[var(--color-copy)]">
      <div className="ambient-grid fixed inset-0 opacity-70" />
      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <section className="rounded-[36px] border border-[var(--color-border)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-shell)_84%,var(--accent-copper)_8%)_0%,color-mix(in_oklab,var(--color-shell)_84%,var(--accent-teal)_12%)_100%)] px-7 py-7 shadow-[0_24px_80px_rgba(10,15,25,0.15)]">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={toneForStatus(snapshot.status)}>{snapshot.status}</Badge>
              <Badge tone="neutral">Tauri 2 + React + TS</Badge>
              <Badge tone="neutral">Arduino C++</Badge>
            </div>
            <div className="mt-8 max-w-3xl">
              <p className="eyebrow">Ioruba Control Deck</p>
              <h1 className="mt-3 font-display text-4xl leading-tight text-[var(--color-ink)] md:text-6xl">
                Mixer físico refeito para sobreviver fora do Haskell e do Python.
              </h1>
              <p className="mt-5 max-w-2xl text-base text-[var(--color-copy)] md:text-lg">
                A interface nova foi pensada como um painel instrumental: conexão
                serial, telemetria viva, perfis persistidos em JSON local e
                aplicação de volume desacoplada do frontend.
              </p>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <Metric
                icon={PlugZap}
                label="Porta ativa"
                value={snapshot.connectionPort ?? "nenhuma"}
              />
              <Metric
                icon={Waves}
                label="Audio backend"
                value={snapshot.diagnostics.backend}
              />
              <Metric
                icon={Radar}
                label="Última serial"
                value={snapshot.diagnostics.lastSerialLine ?? "aguardando"}
              />
            </div>
          </section>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-[var(--color-border)] pb-5">
              <div>
                <CardTitle>Conexão e sessão</CardTitle>
                <CardDescription>
                  Controle de portas, demo mode e persistência do perfil ativo.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={requestConnect}>Conectar</Button>
                <Button onClick={() => disconnect("Conexão serial encerrada")} variant="secondary">
                  Desconectar
                </Button>
                <Button
                  onClick={async () => {
                    appendWatchLog({
                      scope: "app",
                      level: "info",
                      message: "Inventario de audio solicitado"
                    });
                    const inventory = await listAudioInventory();
                    refreshInventory(inventory);
                  }}
                  variant="ghost"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Atualizar áudio
                </Button>
              </div>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  Porta preferida
                </span>
                <select
                  className="field"
                  onChange={(event) =>
                    setPreferredPort(event.currentTarget.value || null)
                  }
                  value={activeProfile.serial.preferredPort ?? ""}
                >
                  <option value="">Detectar automaticamente</option>
                  {snapshot.availablePorts.map((port) => (
                    <option key={port} value={port}>
                      {port}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center justify-between rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    Modo demo
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    Simula leituras sem tocar no áudio do sistema.
                  </p>
                </div>
                <Switch
                  checked={persisted.demoMode}
                  onCheckedChange={(checked) => setDemoMode(checked)}
                />
              </div>
              <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  Status atual
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                  {snapshot.statusText}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {snapshot.diagnostics.hint}
                </p>
              </div>
            </CardContent>
          </Card>
        </header>

        <Tabs defaultValue="overview">
          <TabsList className="flex max-w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="watch">Watch</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6 space-y-6" value="overview">
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.85fr)]">
              <TelemetryChart snapshot={snapshot} />
              <OverviewSignalPanel
                activeProfileName={activeProfile.name}
                snapshot={snapshot}
              />
            </section>

            <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {snapshot.knobs.map((knob, index) => (
                <KnobPanel
                  className={index === 0 ? "md:col-span-2 2xl:col-span-1" : undefined}
                  key={knob.id}
                  knob={knob}
                />
              ))}
            </section>
          </TabsContent>

          <TabsContent className="mt-6" value="watch">
            <WatchLogPanel
              activeProfileName={activeProfile.name}
              onClear={clearWatchLog}
              snapshot={snapshot}
              watchLog={watchLog}
            />
          </TabsContent>

          <TabsContent className="mt-6" value="config">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Perfil ativo em JSON</CardTitle>
                  <CardDescription>
                    A configuração nova substitui o YAML antigo por um perfil JSON
                    persistido localmente. Edite, salve e reinicie a sessão.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={draftStatusTone}>{draftStatusLabel}</Badge>
                  <p className="text-sm text-[var(--color-muted)]">
                    {draftStatusHint}
                  </p>
                </div>
                <textarea
                  className={cn(
                    "min-h-[420px] w-full rounded-[28px] border bg-[var(--color-panel)] px-5 py-4 font-mono text-sm text-[var(--color-copy)] outline-none transition",
                    draftValidation.ok
                      ? "border-[var(--color-border)] focus:border-[var(--accent-teal)]"
                      : "border-[color-mix(in_oklab,var(--accent-rose)_42%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-rose)_7%,var(--color-panel))] focus:border-[var(--accent-rose)]"
                  )}
                  aria-describedby={!draftValidation.ok ? draftErrorId : undefined}
                  aria-invalid={!draftValidation.ok}
                  onChange={(event) => setConfigDraft(event.currentTarget.value)}
                  value={configDraft}
                />
                {!draftValidation.ok ? (
                  <p
                    id={draftErrorId}
                    className="rounded-[20px] border border-[color-mix(in_oklab,var(--accent-rose)_42%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-rose)_10%,var(--color-panel))] px-4 py-3 text-sm text-[var(--accent-rose)]"
                  >
                    {draftValidation.error}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={!draftValidation.ok || !draftIsDirty}
                    onClick={applyConfigDraft}
                  >
                    <Settings2 className="h-4 w-4" />
                    {draftIsDirty ? "Salvar perfil" : "Perfil salvo"}
                  </Button>
                  <Button onClick={resetProfile} variant="secondary">
                    Restaurar padrão
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" value="diagnostics">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Inventário de áudio</CardTitle>
                  <CardDescription>
                    Descoberta dinâmica do backend atual com aplicações, sinks e sources.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <InventoryBlock
                  icon={LaptopMinimal}
                  title="Aplicações"
                  values={snapshot.diagnostics.activeApplications}
                />
                <InventoryBlock
                  icon={Waves}
                  title="Saídas"
                  values={audioInventory.sinks.map((sink) => sink.description)}
                />
                <InventoryBlock
                  icon={Mic2}
                  title="Entradas"
                  values={audioInventory.sources.map(
                    (source) => source.description
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Checklist da migração</CardTitle>
                  <CardDescription>
                    Itens essenciais já cobertos pelo novo stack.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ChecklistItem label="Protocolo serial legado e frame completo" />
                <ChecklistItem label="Redução de ruído e aplicação incremental" />
                <ChecklistItem label="Persistência local em JSON" />
                <ChecklistItem label="Telemetria com Recharts" />
                <ChecklistItem label="Backend de áudio em Rust para Linux" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof PlugZap;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[26px] border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-panel)_88%,transparent)] px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-shell)]">
          <Icon className="h-5 w-5 text-[var(--accent-teal)]" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function InventoryBlock({
  icon: Icon,
  title,
  values
}: {
  icon: typeof PlugZap;
  title: string;
  values: string[];
}) {
  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--accent-copper)]" />
        <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.length === 0 ? (
          <Badge tone="neutral">nenhum item detectado</Badge>
        ) : (
          values.map((value) => (
            <Badge key={value} tone="neutral">
              {value}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

function ChecklistItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3">
      <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent-teal)]" />
      <span className="text-sm text-[var(--color-copy)]">{label}</span>
    </div>
  );
}
