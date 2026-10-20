import type { HTMLAttributes } from "react";

import { Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatAudioTarget, translateText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { sliderValueToNormalized } from "@ioruba/shared";
import type { AudioInventory, RuntimeKnobSnapshot, RuntimeTargetOutcome, UiLanguage } from "@ioruba/shared";

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
  className, knob, language = "pt-BR", transitionDurationMs = 300,
  inverted, adcMax = 1023, onEditTargets, audioInventory, demoMode = false, hasReading = true,
}: {
  className?: HTMLAttributes<HTMLDivElement>["className"];
  knob: RuntimeKnobSnapshot;
  language?: UiLanguage;
  transitionDurationMs?: number;
  inverted?: boolean;
  adcMax?: number;
  onEditTargets?: () => void;
  audioInventory?: AudioInventory;
  demoMode?: boolean;
  hasReading?: boolean;
}) {
  const lt = (text: string) => translateText(language, text);
  const accent = accentColor(knob.accent);
  const applied = sliderValueToNormalized(knob.appliedRawValue, adcMax);
  const percent = inverted === undefined ? knob.percent : Math.round((inverted ? 1 - applied : applied) * 100);
  const idle = knob.outcome.targets.some(target => target.status === "idle");
  const severityLabel = demoMode ? "Simulação" : { info: "Aguardando leitura", success: "Aplicado", warning: idle ? "Aguardando áudio" : "Destino indisponível", error: "Falha ao ajustar áudio" }[knob.outcome.severity];
  const levelLabel = lt(demoMode ? "Nível simulado" : "Nível enviado ao áudio");

  return (
    <Card className={cn("channel-strip", className)} style={{ "--channel-accent": accent } as React.CSSProperties}>
      <header className="channel-heading">
        <span className="channel-number" aria-hidden="true">{String(knob.id + 1).padStart(2, "0")}</span>
        <h2 title={knob.name}>{knob.name}</h2>
        {onEditTargets ? <button className="icon-button channel-edit" aria-label={`${lt("Editar destinos")}: ${knob.name}`} onClick={onEditTargets} type="button"><Settings2 aria-hidden="true" className="h-4 w-4" /></button> : null}
      </header>
      <div className="channel-level">
        <meter className="sr-only" aria-label={`${levelLabel}: ${knob.name}`} min={0} max={100} value={hasReading ? percent : 0} aria-valuetext={hasReading ? `${percent}%` : lt("Aguardando leitura")}>{hasReading ? `${percent}%` : lt("Aguardando leitura")}</meter>
        <div className="channel-dial" data-has-signal={hasReading} style={{ "--dial-angle": `${-135 + percent * 2.7}deg` } as React.CSSProperties}>
          <div className="channel-dial-face"><span className="channel-dial-pointer" /></div>
        </div>
        <p className="channel-percent">{hasReading ? percent : "—"}{hasReading ? <span>%</span> : null}</p>
        <p className="channel-level-label">{levelLabel}</p>
        <div className="channel-meter" aria-hidden="true"><span style={{ width: `${hasReading ? percent : 0}%`, transition: `width ${Math.max(0, transitionDurationMs)}ms ease-out` }} /></div>
        <div className="channel-scale" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>
      </div>
      <div className="channel-destinations">
        <h3>{lt("Destinos de áudio")}</h3>
        <ul>{knob.targets.map((target, index) => <li key={`${target}-${index}`}>{formatAudioTarget(language, target, audioInventory)}</li>)}</ul>
      </div>
      <div className="channel-feedback" data-severity={knob.outcome.severity} role="status" aria-label={`${lt("Ultimo resultado")}: ${knob.name}`}>
        <span aria-hidden="true" className="channel-feedback-dot" />
        <span>{lt(severityLabel)}</span><span className="sr-only">{knob.outcome.summary}</span>
      </div>
      {!demoMode && (knob.outcome.severity === "warning" || knob.outcome.severity === "error") ? <p className="channel-help">{lt(idle ? "Abra o aplicativo e inicie a reprodução." : "Confira o destino em Editar destinos.")}</p> : null}
      {inverted ? <p className="channel-inversion" title={lt("O nível de áudio diminui quando o valor do knob aumenta.")}>{lt("Sentido invertido")}</p> : null}
      <details className="channel-details">
        <summary>{lt("Detalhes do sinal")}</summary>
        <dl className="channel-readings">
          <div><dt>{lt("Sinal recebido")}</dt><dd>{knob.rawValue}</dd></div>
          <div><dt>{lt("Sinal aplicado")}</dt><dd>{knob.appliedRawValue}</dd></div>
        </dl>
        {inverted ? <p>{lt("O nível de áudio diminui quando o valor do knob aumenta.")}</p> : null}
        <p>{knob.outcome.summary}</p>
        {knob.outcome.targets.map((target, index) => <div className="channel-target-detail" key={`${target.target}-${index}`}>
          <div><strong>{formatAudioTarget(language, target.target, audioInventory)}</strong><Badge tone={toneForTargetStatus(target.status)}>{labelForTargetStatus(target.status, lt)}</Badge></div>
          <p>{target.detail}</p>
          {target.matched.length > 0 ? <ul>{target.matched.map((name, i) => <li key={`${name}-${i}`}>{name}</li>)}</ul> : null}
        </div>)}
      </details>
    </Card>
  );
}
