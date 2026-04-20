import { useState } from "react";

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
import { useBackgroundTray } from "@/hooks/use-background-tray";
import { usePersistence } from "@/hooks/use-persistence";
import { useRuntimeBoot } from "@/hooks/use-runtime-boot";
import { useSerialRuntime } from "@/hooks/use-serial-runtime";
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useWatchBridge } from "@/hooks/use-watch-bridge";
import {
  listAudioInventory,
  setLaunchOnLoginEnabled
} from "@/lib/backend";
import { translateText } from "@/lib/i18n";
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
  useBackgroundTray();
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
  const setLaunchOnLogin = useIorubaStore((state) => state.setLaunchOnLogin);
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
  const language = activeProfile.ui.language;
  const lt = (text: string) => translateText(language, text);
  const [launchOnLoginPending, setLaunchOnLoginPending] = useState(false);

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
      ? lt("Alteracoes pendentes")
      : lt("Perfil salvo")
    : lt("JSON invalido");
  const draftStatusHint = draftValidation.ok
    ? draftIsDirty
      ? lt("Salve para persistir o perfil ativo.")
      : lt("O editor esta sincronizado com o perfil salvo.")
    : lt(draftValidation.error);
  const demoModeTitleId = "demo-mode-title";
  const demoModeDescriptionId = "demo-mode-description";
  const launchOnLoginTitleId = "launch-on-login-title";
  const launchOnLoginDescriptionId = "launch-on-login-description";
  const statusCardDescriptionId = "session-status-description";
  const liveStatusMessage = `${lt("Sessão")} ${snapshot.status}: ${lt(snapshot.statusText)}. ${lt(snapshot.diagnostics.hint)} ${lt("Perfil")}: ${draftStatusLabel}. ${draftStatusHint}`;

  return (
    <main className="min-h-screen bg-(--color-shell) text-(--color-copy)">
      <div aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {liveStatusMessage}
      </div>
      <a className="skip-link" href="#app-content">
        {lt("Pular para o conteúdo principal")}
      </a>
      <div className="ambient-grid fixed inset-0 opacity-70" />
      <div className="relative mx-auto flex min-h-screen max-w-400 flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <section className="rounded-[36px] border border-(--color-border) bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-shell)_84%,var(--accent-copper)_8%)_0%,color-mix(in_oklab,var(--color-shell)_84%,var(--accent-teal)_12%)_100%)] px-7 py-7 [box-shadow:var(--shadow-hero)]">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={toneForStatus(snapshot.status)}>{snapshot.status}</Badge>
              <Badge tone="neutral">{lt("Tauri 2 + React + TS")}</Badge>
              <Badge tone="neutral">{lt("Arduino C++")}</Badge>
            </div>
            <div className="mt-8 max-w-3xl">
              <p className="eyebrow">{lt("Ioruba Control Deck")}</p>
              <h1 className="mt-3 font-display text-4xl leading-tight text-(--color-ink) md:text-6xl">
                {lt("Mixer físico refeito para sobreviver fora do Haskell e do Python.")}
              </h1>
              <p className="mt-5 max-w-2xl text-base text-(--color-copy) md:text-lg">
                {lt(
                  "A interface nova foi pensada como um painel instrumental: conexão serial, telemetria viva, perfis persistidos em JSON local e aplicação de volume desacoplada do frontend."
                )}
              </p>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <Metric
                icon={PlugZap}
                label={lt("Porta ativa")}
                value={snapshot.connectionPort ?? lt("nenhuma")}
              />
              <Metric
                icon={Waves}
                label={lt("Audio backend")}
                value={snapshot.diagnostics.backend}
              />
              <Metric
                icon={Radar}
                label={lt("Última serial")}
                value={snapshot.diagnostics.lastSerialLine ?? lt("aguardando")}
              />
            </div>
          </section>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-(--color-border) pb-5">
              <div>
                <CardTitle>{lt("Conexão e sessão")}</CardTitle>
                <CardDescription>
                  {lt("Controle de portas, demo mode e persistência do perfil ativo.")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={requestConnect}>{lt("Conectar")}</Button>
                <Button onClick={() => disconnect(lt("Conexão serial encerrada"))} variant="secondary">
                  {lt("Desconectar")}
                </Button>
                <Button
                  onClick={async () => {
                    appendWatchLog({
                      scope: "app",
                      level: "info",
                      message: lt("Inventario de audio solicitado")
                    });
                    const inventory = await listAudioInventory();
                    refreshInventory(inventory);
                  }}
                  variant="ghost"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {lt("Atualizar áudio")}
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                    {lt("Porta preferida")}
                  </span>
                  <select
                    className="field"
                    onChange={(event) =>
                      setPreferredPort(event.currentTarget.value || null)
                    }
                    value={activeProfile.serial.preferredPort ?? ""}
                  >
                    <option value="">{lt("Detectar automaticamente")}</option>
                    {snapshot.availablePorts.map((port) => (
                      <option key={port} value={port}>
                        {port}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                    {lt("Tema da interface")}
                  </span>
                  <select
                    className="field"
                    onChange={(event) =>
                      setThemeMode(event.currentTarget.value as ThemeMode)
                    }
                    value={activeProfile.ui.theme}
                  >
                    <option value="system">{lt("Seguir sistema")}</option>
                    <option value="light">{lt("Claro de bancada")}</option>
                    <option value="dark">{lt("Escuro de estúdio")}</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-(--color-ink)" id={demoModeTitleId}>
                    {lt("Modo demo")}
                  </p>
                  <p className="text-sm text-(--color-muted)" id={demoModeDescriptionId}>
                    {lt("Simula leituras sem tocar no áudio do sistema.")}
                  </p>
                </div>
                <Switch
                  aria-describedby={demoModeDescriptionId}
                  aria-labelledby={demoModeTitleId}
                  checked={persisted.demoMode}
                  onCheckedChange={(checked) => setDemoMode(checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-(--color-ink)" id={launchOnLoginTitleId}>
                    {lt("Iniciar com a sessão")}
                  </p>
                  <p className="text-sm text-(--color-muted)" id={launchOnLoginDescriptionId}>
                    {lt("Abre o Ioruba no login e mantém o app disponível no tray.")}
                  </p>
                </div>
                <Switch
                  aria-describedby={launchOnLoginDescriptionId}
                  aria-labelledby={launchOnLoginTitleId}
                  checked={persisted.launchOnLogin}
                  disabled={launchOnLoginPending}
                  onCheckedChange={(checked) => {
                    setLaunchOnLoginPending(true);
                    void setLaunchOnLoginEnabled(checked)
                      .then((actual) => {
                        setLaunchOnLogin(actual);
                      })
                      .catch((error) => {
                        appendWatchLog({
                          scope: "app",
                          level: "error",
                          message: lt("Falha ao atualizar inicializacao com a sessao"),
                          detail: error instanceof Error ? error.message : String(error)
                        });
                      })
                      .finally(() => {
                        setLaunchOnLoginPending(false);
                      });
                  }}
                />
              </div>
              <div
                aria-atomic="true"
                aria-describedby={statusCardDescriptionId}
                aria-live="polite"
                className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-4"
                role="status"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
                  {lt("Status atual")}
                </p>
                <p className="mt-2 text-lg font-semibold text-(--color-ink)">
                  {lt(snapshot.statusText)}
                </p>
                <p className="mt-2 text-sm text-(--color-muted)" id={statusCardDescriptionId}>
                  {lt(snapshot.diagnostics.hint)}
                </p>
              </div>
            </CardContent>
          </Card>
        </header>

        <Tabs defaultValue="overview">
          <TabsList
            aria-label={lt("Navegação principal do Ioruba")}
            className="flex max-w-full flex-wrap justify-start"
            id="app-content"
            tabIndex={-1}
          >
            <TabsTrigger value="overview">{lt("Overview")}</TabsTrigger>
            <TabsTrigger value="watch">{lt("Watch")}</TabsTrigger>
            <TabsTrigger value="config">{lt("Config")}</TabsTrigger>
            <TabsTrigger value="diagnostics">{lt("Diagnostics")}</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6 space-y-6" value="overview">
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.85fr)]">
              <TelemetryChart language={language} snapshot={snapshot} />
              <OverviewSignalPanel
                activeProfileName={activeProfile.name}
                language={language}
                snapshot={snapshot}
              />
            </section>

            <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {snapshot.knobs.map((knob, index) => (
                <KnobPanel
                  className={index === 0 ? "md:col-span-2 2xl:col-span-1" : undefined}
                  key={knob.id}
                  knob={knob}
                  language={language}
                />
              ))}
            </section>
          </TabsContent>

          <TabsContent className="mt-6" value="watch">
            <WatchLogPanel
              activeProfileName={activeProfile.name}
              language={language}
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
              language={language}
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
                  <CardTitle>{lt("Inventário de áudio")}</CardTitle>
                  <CardDescription>
                    {lt("Descoberta dinâmica do backend atual com aplicações, sinks e sources.")}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <InventoryBlock
                  icon={LaptopMinimal}
                  title={lt("Aplicações")}
                  noItemsLabel={lt("nenhum item detectado")}
                  values={snapshot.diagnostics.activeApplications}
                />
                <InventoryBlock
                  icon={Waves}
                  title={lt("Saídas")}
                  noItemsLabel={lt("nenhum item detectado")}
                  values={audioInventory.sinks.map((sink) => sink.description)}
                />
                <InventoryBlock
                  icon={Mic2}
                  title={lt("Entradas")}
                  noItemsLabel={lt("nenhum item detectado")}
                  values={audioInventory.sources.map(
                    (source) => source.description
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{lt("Checklist da migração")}</CardTitle>
                  <CardDescription>
                    {lt("Itens essenciais já cobertos pelo novo stack.")}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ChecklistItem label={lt("Protocolo serial legado e frame completo")} />
                <ChecklistItem label={lt("Redução de ruído e aplicação incremental")} />
                <ChecklistItem label={lt("Persistência local em JSON")} />
                <ChecklistItem label={lt("Telemetria com Recharts")} />
                <ChecklistItem label={lt("Backend de áudio em Rust para Linux")} />
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
  values,
  noItemsLabel
}: {
  icon: typeof PlugZap;
  title: string;
  values: string[];
  noItemsLabel: string;
}) {
  return (
    <div className="rounded-[22px] border border-(--color-border) bg-(--color-panel) px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-(--accent-copper)" />
        <p className="text-sm font-semibold text-(--color-ink)">{title}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.length === 0 ? (
          <Badge tone="neutral">{noItemsLabel}</Badge>
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
