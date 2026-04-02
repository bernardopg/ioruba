import {
  LaptopMinimal,
  Mic2,
  PlugZap,
  Radar,
  RefreshCcw,
  Waves
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileWorkbench } from "@/components/config/profile-workbench";
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
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useWatchBridge } from "@/hooks/use-watch-bridge";
import { listAudioInventory } from "@/lib/backend";
import {
  parseProfileDraft,
  serializeProfileDraft
} from "@/lib/profile-config";
import { useIorubaStore } from "@/store/ioruba-store";
import { resolveActiveProfile, type ThemeMode } from "@ioruba/shared";

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
  const selectProfile = useIorubaStore((state) => state.selectProfile);
  const createProfile = useIorubaStore((state) => state.createProfile);
  const duplicateActiveProfile = useIorubaStore(
    (state) => state.duplicateActiveProfile
  );
  const removeActiveProfile = useIorubaStore((state) => state.removeActiveProfile);
  const setPreferredPort = useIorubaStore((state) => state.setPreferredPort);
  const setThemeMode = useIorubaStore((state) => state.setThemeMode);
  const refreshInventory = useIorubaStore((state) => state.refreshInventory);
  const clearWatchLog = useIorubaStore((state) => state.clearWatchLog);
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);
  const audioInventory = useIorubaStore((state) => state.audioInventory);
  const activeProfile = resolveActiveProfile(persisted);

  useThemeSync(activeProfile.ui.theme);

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

  return (
    <main className="min-h-screen bg-(--color-shell) text-(--color-copy)">
      <div className="ambient-grid fixed inset-0 opacity-70" />
        <div className="relative mx-auto flex min-h-screen max-w-400 flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <section className="rounded-[36px] border border-(--color-border) bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-shell)_84%,var(--accent-copper)_8%)_0%,color-mix(in_oklab,var(--color-shell)_84%,var(--accent-teal)_12%)_100%)] px-7 py-7 [box-shadow:var(--shadow-hero)]">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={toneForStatus(snapshot.status)}>{snapshot.status}</Badge>
              <Badge tone="neutral">Tauri 2 + React + TS</Badge>
              <Badge tone="neutral">Arduino C++</Badge>
            </div>
            <div className="mt-8 max-w-3xl">
              <p className="eyebrow">Ioruba Control Deck</p>
              <h1 className="mt-3 font-display text-4xl leading-tight text-(--color-ink) md:text-6xl">
                Mixer físico refeito para sobreviver fora do Haskell e do Python.
              </h1>
              <p className="mt-5 max-w-2xl text-base text-(--color-copy) md:text-lg">
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
            <CardHeader className="border-b border-(--color-border) pb-5">
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
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
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

                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                    Tema da interface
                  </span>
                  <select
                    className="field"
                    onChange={(event) =>
                      setThemeMode(event.currentTarget.value as ThemeMode)
                    }
                    value={activeProfile.ui.theme}
                  >
                    <option value="system">Seguir sistema</option>
                    <option value="light">Claro de bancada</option>
                    <option value="dark">Escuro de estúdio</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-(--color-ink)">
                    Modo demo
                  </p>
                  <p className="text-sm text-(--color-muted)">
                    Simula leituras sem tocar no áudio do sistema.
                  </p>
                </div>
                <Switch
                  checked={persisted.demoMode}
                  onCheckedChange={(checked) => setDemoMode(checked)}
                />
              </div>
              <div className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                  Status atual
                </p>
                <p className="mt-2 text-lg font-semibold text-(--color-ink)">
                  {snapshot.statusText}
                </p>
                <p className="mt-2 text-sm text-(--color-muted)">
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
            <ProfileWorkbench
              activeProfile={activeProfile}
              appendWatchLog={appendWatchLog}
              applyConfigDraft={applyConfigDraft}
              audioInventory={audioInventory}
              availablePorts={snapshot.availablePorts}
              configDraft={configDraft}
              createProfile={createProfile}
              draftIsDirty={draftIsDirty}
              draftStatusHint={draftStatusHint}
              draftStatusLabel={draftStatusLabel}
              draftStatusTone={draftStatusTone}
              draftValidation={draftValidation}
              duplicateActiveProfile={duplicateActiveProfile}
              persisted={persisted}
              removeActiveProfile={removeActiveProfile}
              resetProfile={resetProfile}
              selectProfile={selectProfile}
              setConfigDraft={setConfigDraft}
            />
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
    <div className="rounded-[26px] border border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_88%,transparent)] px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full border border-(--color-border) bg-(--color-shell)">
          <Icon className="h-5 w-5 text-(--accent-teal)" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold text-(--color-ink)">
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
    <div className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-(--accent-copper)" />
        <p className="text-sm font-semibold text-(--color-ink)">{title}</p>
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
    <div className="flex items-center gap-3 rounded-[18px] border border-(--color-border) bg-(--color-panel) px-4 py-3">
      <div className="h-2.5 w-2.5 rounded-full bg-(--accent-teal)" />
      <span className="text-sm text-(--color-copy)">{label}</span>
    </div>
  );
}
