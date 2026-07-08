import { lazy, Suspense, useMemo, useState, type KeyboardEvent } from "react";

import {
  Activity,
  AudioLines,
  Braces,
  Cog,
  Cpu,
  FolderCog,
  Gauge,
  HeartPulse,
  Home,
  LaptopMinimal,
  Mic2,
  PanelsTopLeft,
  PlugZap,
  Radar,
  RefreshCcw,
  SlidersHorizontal,
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
import { AudioBackendBanner } from "@/components/dashboard/audio-backend-banner";
import { CalibrationWizard } from "@/components/dashboard/calibration-wizard";
import { ConnectionHealthIndicator } from "@/components/dashboard/connection-health";
import { HardwarePanel } from "@/components/dashboard/hardware-panel";
import { KnobPanel } from "@/components/dashboard/knob-panel";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { OverviewSignalPanel } from "@/components/dashboard/overview-signal-panel";
import { SessionStatsPanel } from "@/components/dashboard/session-stats-panel";
import { WatchLogPanel } from "@/components/dashboard/watch-log-panel";
// recharts pesa ~350 KB (gzip ~104 KB) e só é usado na aba de telemetria.
// Carregamento lazy mantém esse peso fora do bundle inicial até a aba abrir.
const TelemetryChart = lazy(() =>
  import("@/components/dashboard/telemetry-chart").then((module) => ({
    default: module.TelemetryChart
  }))
);
import { useBackgroundTray } from "@/hooks/use-background-tray";
import { usePersistence } from "@/hooks/use-persistence";
import { useRuntimeBoot } from "@/hooks/use-runtime-boot";
import { useSerialRuntime } from "@/hooks/use-serial-runtime";
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useWatchBridge } from "@/hooks/use-watch-bridge";
import {
  exportSessionStats,
  exportWatchLog,
  listAudioInventory,
  setLaunchOnLoginEnabled
} from "@/lib/backend";
import { translateText } from "@/lib/i18n";
import {
  parseProfileDraft,
  serializeProfileDraft
} from "@/lib/profile-config";
import { useIorubaStore } from "@/store/ioruba-store";
import {
  adcMaxForBits,
  DEFAULT_ADC_BITS,
  resolveActiveProfile,
  sessionStatsToCsv,
  sessionStatsToJson,
  type ThemeMode
} from "@ioruba/shared";

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

type AppSection =
  | "home"
  | "control"
  | "channels"
  | "telemetry"
  | "hardware"
  | "diagnostics"
  | "settings"
  | "settings-editor"
  | "settings-advanced";

interface NavItem {
  id: AppSection;
  label: string;
  description: string;
  icon: typeof Home;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export default function App() {
  useBackgroundTray();
  useWatchBridge();
  useRuntimeBoot();
  usePersistence();
  useSerialRuntime();

  const persisted = useIorubaStore((state) => state.persisted);
  const snapshot = useIorubaStore((state) => state.snapshot);
  const lastFrameAt = useIorubaStore((state) => state.lastFrameAt);
  const sessionStats = useIorubaStore((state) => state.sessionStats);
  const resetSessionStats = useIorubaStore((state) => state.resetSessionStats);
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
  const applyPreset = useIorubaStore((state) => state.applyPreset);
  const exportActiveProfile = useIorubaStore((state) => state.exportActiveProfile);
  const importProfileFromFile = useIorubaStore((state) => state.importProfileFromFile);
  const dismissOnboarding = useIorubaStore((state) => state.dismissOnboarding);
  const duplicateActiveProfile = useIorubaStore(
    (state) => state.duplicateActiveProfile
  );
  const removeActiveProfile = useIorubaStore((state) => state.removeActiveProfile);
  const setPreferredPort = useIorubaStore((state) => state.setPreferredPort);
  const updateActiveProfileConfig = useIorubaStore(
    (state) => state.updateActiveProfileConfig
  );
  const setThemeMode = useIorubaStore((state) => state.setThemeMode);
  const refreshInventory = useIorubaStore((state) => state.refreshInventory);
  const clearWatchLog = useIorubaStore((state) => state.clearWatchLog);
  const appendWatchLog = useIorubaStore((state) => state.appendWatchLog);
  const audioInventory = useIorubaStore((state) => state.audioInventory);
  const activeProfile = resolveActiveProfile(persisted);
  const language = activeProfile.ui.language;
  const lt = (text: string) => translateText(language, text);
  const [launchOnLoginPending, setLaunchOnLoginPending] = useState(false);
  const [activeSection, setActiveSection] = useState<AppSection>("home");

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
  const navigationGroups = useMemo<NavGroup[]>(
    () => [
      {
        id: "operation",
        label: lt("Operação"),
        items: [
          {
            id: "home" as const,
            label: lt("Home"),
            description: lt("Visão geral da bancada e status operacional."),
            icon: Home
          },
          {
            id: "control" as const,
            label: lt("Painel de controle"),
            description: lt("Conexão, sessão e preferências de runtime."),
            icon: PanelsTopLeft
          },
          {
            id: "channels" as const,
            label: lt("Canais"),
            description: lt("Knobs ao vivo e seus destinos de áudio."),
            icon: SlidersHorizontal
          }
        ]
      },
      {
        id: "monitoring" as const,
        label: lt("Monitoramento"),
        items: [
          {
            id: "telemetry" as const,
            label: lt("Telemetria"),
            description: lt("Leituras ao vivo, resposta dos knobs e timeline."),
            icon: Activity
          },
          {
            id: "hardware" as const,
            label: lt("Hardware"),
            description: lt("Controlador, MCU, ADC e backend de áudio."),
            icon: Cpu
          },
          {
            id: "diagnostics" as const,
            label: lt("Diagnósticos"),
            description: lt("Logs e checklist técnico da integração."),
            icon: HeartPulse
          }
        ]
      },
      {
        id: "settings-group" as const,
        label: lt("Ajustes"),
        items: [
          {
            id: "settings" as const,
            label: lt("Perfis"),
            description: lt("Crie, importe, exporte e selecione perfis salvos."),
            icon: FolderCog
          },
          {
            id: "settings-editor" as const,
            label: lt("Editor"),
            description: lt("Conexão, áudio, firmware, knobs e destinos."),
            icon: Cog
          },
          {
            id: "settings-advanced" as const,
            label: lt("Avançado"),
            description: lt("JSON do perfil e inventário para targets."),
            icon: Braces
          }
        ]
      }
    ],
    [lt]
  );
  const navigationItems = useMemo(
    () => navigationGroups.flatMap((group) => group.items),
    [navigationGroups]
  );
  const currentSection =
    navigationItems.find((item) => item.id === activeSection) ?? navigationItems[0];

  // Padrão WAI-ARIA de tabs com tabindex itinerante: as setas movem a seleção
  // (ativação automática), Home/End pulam para as extremidades. Sem isso os
  // tabs inativos (tabIndex -1) ficariam inalcançáveis pelo teclado.
  function handleTablistKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = navigationItems.findIndex(
      (item) => item.id === activeSection
    );

    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % navigationItems.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex =
          (currentIndex - 1 + navigationItems.length) % navigationItems.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = navigationItems.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextItem = navigationItems[nextIndex];
    setActiveSection(nextItem.id);
    document.getElementById(`tab-${nextItem.id}`)?.focus();
  }

  async function handleWatchLogExport() {
    appendWatchLog({
      scope: "app",
      level: "info",
      message: "Exportacao do watch log solicitada",
      detail: `${watchLog.length} evento(s)`
    });

    try {
      const result = await exportWatchLog(watchLog);

      appendWatchLog({
        scope: result ? "backend" : "app",
        level: result ? "info" : "warning",
        message: result ? "Watch log exportado" : "Exportacao do watch log cancelada",
        detail: result
          ? `${result.entries} evento(s) em ${result.path}`
          : undefined
      });

      return result;
    } catch (error) {
      appendWatchLog({
        scope: "backend",
        level: "error",
        message: "Falha ao exportar watch log",
        detail: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async function handleSessionStatsExport(format: "json" | "csv") {
    const knobNames = Object.fromEntries(
      snapshot.knobs.map((knob) => [knob.id, knob.name])
    );
    const payload =
      format === "json"
        ? sessionStatsToJson(sessionStats, knobNames)
        : sessionStatsToCsv(sessionStats, knobNames);
    const fileName = `ioruba-session-stats.${format}`;

    appendWatchLog({
      scope: "app",
      level: "info",
      message: "Exportacao de estatisticas solicitada",
      detail: format.toUpperCase()
    });

    try {
      const path = await exportSessionStats(fileName, payload);

      appendWatchLog({
        scope: path ? "backend" : "app",
        level: path ? "info" : "warning",
        message: path
          ? "Estatisticas da sessao exportadas"
          : "Exportacao de estatisticas cancelada",
        detail: path ?? undefined
      });
    } catch (error) {
      appendWatchLog({
        scope: "backend",
        level: "error",
        message: "Falha ao exportar estatisticas",
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return (
    <main className="min-h-screen bg-(--color-shell) text-(--color-copy)">
      <div aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {liveStatusMessage}
      </div>
      <a className="skip-link" href="#app-content">
        {lt("Pular para o conteúdo principal")}
      </a>
      <div className="ambient-grid fixed inset-0 opacity-70" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-[108rem] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-6 lg:px-8 xl:grid-cols-[17rem_minmax(0,1fr)] xl:px-10">
        <aside className="sidebar-shell lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]">
          <div className="sidebar-panel">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={toneForStatus(snapshot.status)}>{snapshot.status}</Badge>
              <Badge tone="neutral">{lt("Tauri 2 + React + TS")}</Badge>
            </div>
            <div className="mt-5">
              <p className="eyebrow">{lt("Ioruba Control Deck")}</p>
              <h1 className="mt-2 font-display text-lg leading-tight text-(--color-ink)">
                {lt("Mixer de áudio para Linux")}
              </h1>
              <p className="mt-2 text-xs leading-5 text-(--color-muted)">
                {lt("Painel instrumental com telemetria viva e perfis locais.")}
              </p>
            </div>

            <div className="mt-5">
              <ConnectionHealthIndicator
                language={language}
                lastFrameAt={lastFrameAt}
                status={snapshot.status}
                statusText={snapshot.statusText}
              />
            </div>

            <nav className="mt-5">
              <div
                aria-label={lt("Navegação principal do Ioruba")}
                className="sidebar-nav"
                id="app-content"
                onKeyDown={handleTablistKeyDown}
                role="tablist"
                tabIndex={-1}
              >
                {navigationGroups.map((group) => (
                  <div className="sidebar-nav-group" key={group.id} role="presentation">
                    <p className="sidebar-nav-group-label" role="presentation">
                      {group.label}
                    </p>
                    <div className="sidebar-nav-list" role="presentation">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === activeSection;

                        return (
                          <button
                            aria-controls="main-tabpanel"
                            aria-selected={isActive}
                            className="sidebar-nav-item"
                            data-active={isActive}
                            id={`tab-${item.id}`}
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            role="tab"
                            tabIndex={isActive ? 0 : -1}
                            type="button"
                          >
                            <span className="sidebar-nav-icon">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 text-left">
                              <span className="sidebar-nav-title">{item.label}</span>
                              <span className="sidebar-nav-description">
                                {item.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>

            <div className="mt-5 grid gap-2.5">
              <MiniStatus
                label={lt("Porta ativa")}
                tone="teal"
                value={snapshot.connectionPort ?? lt("nenhuma")}
              />
              <MiniStatus
                label={lt("Audio backend")}
                tone="copper"
                value={snapshot.diagnostics.backend}
              />
              <MiniStatus
                label={lt("Última serial")}
                tone="neutral"
                value={snapshot.diagnostics.lastSerialLine ?? lt("aguardando")}
              />
            </div>
          </div>
        </aside>

        <div
          aria-labelledby={`tab-${activeSection}`}
          className="flex min-w-0 flex-col gap-6"
          id="main-tabpanel"
          role="tabpanel"
          tabIndex={0}
        >
          <section className="dashboard-ribbon">
            <div>
              <p className="eyebrow">{currentSection.label}</p>
              <h2 className="mt-3 font-display text-2xl leading-tight text-(--color-ink) md:text-3xl xl:text-4xl">
                {currentSection.description}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-(--color-copy) md:text-base">
                {lt("Distribuímos o runtime em áreas menores para manter foco operacional sem perder contexto da sessão.")}
              </p>
            </div>
            <div className="dashboard-ribbon-meta">
              <Metric icon={PlugZap} label={lt("Sessão")} value={snapshot.status} />
              <Metric icon={Gauge} label={lt("Perfil ativo")} value={activeProfile.name} />
              <Metric
                icon={Radar}
                label={lt("Última serial")}
                value={snapshot.diagnostics.lastSerialLine ?? lt("aguardando")}
              />
            </div>
          </section>

          {activeSection === "home" ? (
            <>
              {!persisted.onboardingDismissed ? (
                <OnboardingChecklist
                  audioInventory={audioInventory}
                  language={language}
                  onDismiss={dismissOnboarding}
                  snapshot={snapshot}
                />
              ) : null}
              <AudioBackendBanner
                backend={audioInventory.backend}
                diagnostics={audioInventory.diagnostics}
                language={language}
              />
              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <section className="rounded-[28px] border border-(--color-border) bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-shell)_84%,var(--accent-copper)_8%)_0%,color-mix(in_oklab,var(--color-shell)_84%,var(--accent-teal)_12%)_100%)] px-5 py-6 sm:px-7 [box-shadow:var(--shadow-hero)]">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={toneForStatus(snapshot.status)}>{snapshot.status}</Badge>
                    <Badge tone="neutral">{lt("Arduino C++")}</Badge>
                    <Badge tone="neutral">{lt("Painel segmentado")}</Badge>
                  </div>
                  <div className="mt-8 max-w-3xl">
                    <p className="eyebrow">{lt("Home")}</p>
                    <h3 className="mt-3 font-display text-2xl leading-tight text-(--color-ink) md:text-3xl xl:text-4xl">
                      {lt("Operação central com leitura clara de hardware, backend e perfil")}
                    </h3>
                    <p className="mt-4 max-w-2xl text-sm text-(--color-copy) md:text-base">
                      {lt(
                        "Agora cada área do Ioruba vive em uma rota visual própria: a home resume o estado atual da bancada e aponta rapidamente para os próximos passos."
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
                      icon={AudioLines}
                      label={lt("Targets ativos")}
                      value={String(
                        activeProfile.sliders.reduce(
                          (total, slider) => total + slider.targets.length,
                          0
                        )
                      )}
                    />
                  </div>
                </section>

                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-(--color-border) pb-5">
                    <div>
                      <CardTitle>{lt("Conexão e sessão")}</CardTitle>
                      <CardDescription>
                        {lt("Resumo da sessão viva, pronto para orientar a operação antes de abrir uma área específica.")}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-6">
                    <StatusLine label={lt("Status atual")} value={lt(snapshot.statusText)} />
                    <StatusLine label={lt("Backend áudio")} value={snapshot.diagnostics.backend} />
                    <StatusLine label={lt("Perfil ativo")} value={activeProfile.name} />
                    <StatusLine label={lt("Hint operacional")} value={lt(snapshot.diagnostics.hint)} />
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <QuickJumpCard
                  description={lt("Acione conexão, demo mode e preferências de sessão.")}
                  icon={PanelsTopLeft}
                  onOpen={() => setActiveSection("control")}
                  title={lt("Abrir painel de controle")}
                />
                <QuickJumpCard
                  description={lt("Ajuste os knobs ao vivo e seus destinos de áudio.")}
                  icon={SlidersHorizontal}
                  onOpen={() => setActiveSection("channels")}
                  title={lt("Abrir canais")}
                />
                <QuickJumpCard
                  description={lt("Monitore a timeline dos canais e o comportamento dos knobs.")}
                  icon={Activity}
                  onOpen={() => setActiveSection("telemetry")}
                  title={lt("Abrir telemetria")}
                />
                <QuickJumpCard
                  description={lt("Veja placa, MCU, resolução do ADC e o backend de áudio.")}
                  icon={Cpu}
                  onOpen={() => setActiveSection("hardware")}
                  title={lt("Abrir hardware")}
                />
                <QuickJumpCard
                  description={lt("Revise logs, inventário do backend e saúde da integração.")}
                  icon={HeartPulse}
                  onOpen={() => setActiveSection("diagnostics")}
                  title={lt("Abrir diagnósticos")}
                />
                <QuickJumpCard
                  description={lt("Editar perfis, portas, targets e preferências persistidas.")}
                  icon={Cog}
                  onOpen={() => setActiveSection("settings")}
                  title={lt("Abrir configurações")}
                />
              </section>
            </>
          ) : null}

          {activeSection === "control" ? (
            <section className="grid gap-5">
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
                    <Button
                      onClick={() => disconnect(lt("Conexão serial encerrada"))}
                      variant="secondary"
                    >
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
                      <p
                        className="text-sm font-semibold text-(--color-ink)"
                        id={launchOnLoginTitleId}
                      >
                        {lt("Iniciar com a sessão")}
                      </p>
                      <p
                        className="text-sm text-(--color-muted)"
                        id={launchOnLoginDescriptionId}
                      >
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
            </section>
          ) : null}

          {activeSection === "channels" ? (
            <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {snapshot.knobs.map((knob) => (
                <KnobPanel
                  key={knob.id}
                  knob={knob}
                  language={language}
                  transitionDurationMs={snapshot.transitionDurationMs}
                />
              ))}
            </section>
          ) : null}

          {activeSection === "telemetry" ? (
            <>
              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
                <Suspense
                  fallback={
                    <div
                      className="flex h-80 w-full items-center justify-center rounded-(--radius-card) border border-(--color-border) bg-(--color-panel) text-sm text-(--color-muted) sm:h-95"
                      role="status"
                      aria-live="polite"
                    >
                      {lt("Carregando telemetria...")}
                    </div>
                  }
                >
                  <TelemetryChart language={language} snapshot={snapshot} />
                </Suspense>
                <OverviewSignalPanel
                  activeProfileName={activeProfile.name}
                  language={language}
                  snapshot={snapshot}
                />
              </section>

              <SessionStatsPanel
                knobs={snapshot.knobs}
                language={language}
                onExportCsv={() => handleSessionStatsExport("csv")}
                onExportJson={() => handleSessionStatsExport("json")}
                onReset={resetSessionStats}
                stats={sessionStats}
              />

              <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {snapshot.knobs.map((knob) => (
                  <KnobPanel
                    key={knob.id}
                    knob={knob}
                    language={language}
                    transitionDurationMs={snapshot.transitionDurationMs}
                  />
                ))}
              </section>
            </>
          ) : null}

          {activeSection === "hardware" ? (
            <>
              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                <HardwarePanel
                  firmware={snapshot.diagnostics.firmware}
                  language={language}
                />
                <OverviewSignalPanel
                  activeProfileName={activeProfile.name}
                  language={language}
                  snapshot={snapshot}
                />
              </section>

              <CalibrationWizard
                adcMax={adcMaxForBits(
                  snapshot.diagnostics.firmware?.adcBits ?? DEFAULT_ADC_BITS
                )}
                knobs={snapshot.knobs}
                language={language}
                live={snapshot.status === "connected"}
                onApply={updateActiveProfileConfig}
                profile={activeProfile}
              />

              <AudioBackendBanner
                backend={audioInventory.backend}
                diagnostics={audioInventory.diagnostics}
                language={language}
              />

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>{lt("Inventário de áudio")}</CardTitle>
                    <CardDescription>
                      {lt("Descoberta dinâmica do backend atual com aplicações, sinks e sources.")}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
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
                    values={audioInventory.sources.map((source) => source.description)}
                  />
                </CardContent>
              </Card>
            </>
          ) : null}

          {activeSection === "diagnostics" ? (
            <>
              <section>
                <WatchLogPanel
                  activeProfileName={activeProfile.name}
                  language={language}
                  onClear={clearWatchLog}
                  onExport={handleWatchLogExport}
                  snapshot={snapshot}
                  watchLog={watchLog}
                />
              </section>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>{lt("Checklist da migração")}</CardTitle>
                    <CardDescription>
                      {lt("Itens essenciais já cobertos pelo novo stack.")}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <ChecklistItem label={lt("Protocolo serial legado e frame completo")} />
                  <ChecklistItem label={lt("Redução de ruído e aplicação incremental")} />
                  <ChecklistItem label={lt("Persistência local em JSON")} />
                  <ChecklistItem label={lt("Telemetria com Recharts")} />
                  <ChecklistItem label={lt("Backend de áudio em Rust para Linux")} />
                </CardContent>
              </Card>
            </>
          ) : null}

          {activeSection === "settings" ||
          activeSection === "settings-editor" ||
          activeSection === "settings-advanced" ? (
            <ProfileWorkbench
              view={
                activeSection === "settings-editor"
                  ? "editor"
                  : activeSection === "settings-advanced"
                    ? "advanced"
                    : "profiles"
              }
              activeProfile={activeProfile}
              appendWatchLog={appendWatchLog}
              applyConfigDraft={applyConfigDraft}
              audioInventory={audioInventory}
              availablePorts={snapshot.availablePorts}
              configDraft={configDraft}
              createProfile={createProfile}
              applyPreset={applyPreset}
              exportActiveProfile={exportActiveProfile}
              importProfileFromFile={importProfileFromFile}
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
          ) : null}
        </div>
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
    <div className="metric-card">
      <div className="metric-body">
        <div className="metric-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div className="metric-copy">
          <p className="metric-label">{label}</p>
          <p className="metric-value">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStatus({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "teal" | "copper" | "neutral";
}) {
  return (
    <div className="mini-status" data-tone={tone}>
      <p className="mini-status-label">{label}</p>
      <p className="mini-status-value">{value}</p>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-(--color-border) bg-(--color-panel) px-4 py-3">
      <span className="text-xs uppercase tracking-[0.2em] text-(--color-muted)">{label}</span>
      <span className="text-right text-sm font-semibold text-(--color-ink)">{value}</span>
    </div>
  );
}

function QuickJumpCard({
  title,
  description,
  icon: Icon,
  onOpen
}: {
  title: string;
  description: string;
  icon: typeof PlugZap;
  onOpen: () => void;
}) {
  return (
    <button className="quick-jump-card" onClick={onOpen} type="button">
      <span className="quick-jump-icon">
        <Icon className="h-5 w-5" />
      </span>
      <span className="quick-jump-copy">
        <span className="quick-jump-title">{title}</span>
        <span className="quick-jump-description">{description}</span>
      </span>
    </button>
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
