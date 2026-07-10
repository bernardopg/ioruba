import { ChevronDown, Radio } from "lucide-react";
import { useState } from "react";

import { useAppVersion } from "@/hooks/use-app-version";
import { translateText } from "@/lib/i18n";
import { useIorubaStore } from "@/store/ioruba-store";
import { resolveActiveProfile } from "@ioruba/shared";

export function StatusPill() {
  const [expanded, setExpanded] = useState(false);
  const version = useAppVersion();
  const persisted = useIorubaStore((state) => state.persisted);
  const snapshot = useIorubaStore((state) => state.snapshot);
  const updatePending = useIorubaStore((state) => state.updatePending);
  const language = resolveActiveProfile(persisted).ui.language;
  const lt = (text: string) => translateText(language, text);
  const detailsId = "ioruba-runtime-status-details";

  return (
    <div
      className={`status-pill ${updatePending ? "bottom-48" : "bottom-6"}`}
      data-expanded={expanded}
    >
      <button
        aria-controls={detailsId}
        aria-expanded={expanded}
        aria-label={lt("Detalhes do status do Ioruba")}
        className="status-pill-trigger"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="status-pill-summary">
          <span aria-hidden="true" className="status-pill-dot" data-status={snapshot.status} />
          <span className="status-pill-version">v{version}</span>
          <span className="status-pill-current">{lt(snapshot.statusText)}</span>
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </button>

      {expanded ? (
        <div className="status-pill-details" id={detailsId}>
          <div className="status-pill-heading">
            <Radio aria-hidden="true" className="h-4 w-4" />
            <span>{lt("Estado do dispositivo")}</span>
          </div>
          <StatusDetail label={lt("Status")} value={lt(snapshot.statusText)} />
          <StatusDetail
            label={lt("Porta ativa")}
            value={snapshot.connectionPort ?? lt("nenhuma")}
          />
          <StatusDetail label={lt("Audio backend")} value={snapshot.diagnostics.backend} />
          <StatusDetail
            label={lt("Última serial")}
            value={snapshot.diagnostics.lastSerialLine ?? lt("aguardando")}
          />
        </div>
      ) : null}
    </div>
  );
}

function StatusDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-pill-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
