import { Cpu, Gauge, Microchip, Radio, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { translateText } from "@/lib/i18n";
import type { FirmwareInfo, UiLanguage } from "@ioruba/shared";

/**
 * Painel de hardware: consolida o que o firmware reporta no handshake
 * (placa, MCU, resolução do ADC, protocolo, knobs e calibração por knob) num
 * único lugar. É o ponto de integração visível firmware↔frontend — sem firmware
 * conectado, mostra um estado vazio claro em vez de campos em branco.
 */
export function HardwarePanel({
  firmware,
  language = "pt-BR"
}: {
  firmware: FirmwareInfo | null;
  language?: UiLanguage;
}) {
  const lt = (text: string) => translateText(language, text);

  if (!firmware) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-(--color-border) pb-5">
          <div>
            <CardTitle>{lt("Controlador")}</CardTitle>
            <CardDescription>
              {lt("Identidade do hardware reportada pelo handshake do firmware.")}
            </CardDescription>
          </div>
          <Badge className="self-start" tone="warning">
            {lt("sem handshake")}
          </Badge>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-[22px] border border-dashed border-(--color-border) bg-(--color-panel) px-5 py-10 text-center">
            <Cpu className="mx-auto h-7 w-7 text-(--color-muted)" />
            <p className="mt-3 text-sm font-semibold text-(--color-ink)">
              {lt("Nenhum controlador conectado")}
            </p>
            <p className="mt-1 text-sm text-(--color-muted)">
              {lt("Ligue o controlador e aguarde o handshake para ver placa, MCU e resolução do ADC.")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const adcBits = firmware.adcBits ?? 10;
  const adcMax = (1 << adcBits) - 1;
  const config = firmware.controllerConfig;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-(--color-border) pb-5">
        <div>
          <CardTitle>{lt("Controlador")}</CardTitle>
          <CardDescription>
            {lt("Identidade do hardware reportada pelo handshake do firmware.")}
          </CardDescription>
        </div>
        <Badge
          className="self-start"
          tone={firmware.protocolSupported ? "positive" : "warning"}
        >
          {firmware.protocolSupported
            ? lt("protocolo compatível")
            : lt("protocolo incompatível")}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 pt-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <HardwareStat
            icon={Cpu}
            label={lt("Placa")}
            value={firmware.boardName}
            hint={`${lt("firmware")} v${firmware.firmwareVersion}`}
          />
          <HardwareStat
            icon={Microchip}
            label={lt("MCU")}
            value={firmware.mcu ?? lt("não reportado")}
            hint={lt("microcontrolador")}
          />
          <HardwareStat
            icon={Gauge}
            label={lt("Resolução do ADC")}
            value={`${adcBits}-bit`}
            hint={`0–${adcMax}`}
          />
          <HardwareStat
            icon={Radio}
            label={lt("Protocolo")}
            value={`v${firmware.protocolVersion}`}
            hint={
              firmware.protocolSupported
                ? lt("compatível com o desktop")
                : lt("verifique a versão do firmware")
            }
          />
          <HardwareStat
            icon={SlidersHorizontal}
            label={lt("Knobs")}
            value={firmware.knobCount !== null ? String(firmware.knobCount) : lt("desconhecido")}
            hint={lt("canais ativos")}
          />
        </div>

        {config ? (
          <div className="rounded-[22px] border border-(--color-border) bg-[color-mix(in_oklab,var(--color-panel)_92%,var(--color-shell)_8%)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-(--color-muted)">
              {lt("Ajuste do controlador")}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <TuningChip label={lt("Threshold")} value={config.changeThreshold} />
              <TuningChip label={lt("Deadzone")} value={config.edgeDeadzone} />
              <TuningChip label={lt("Suavização")} value={`${config.smoothingStrength}%`} />
            </div>

            {config.calibrations.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-(--color-border)">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-(--color-shell) text-(--color-muted)">
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em]">
                        {lt("Knob")}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.16em]">
                        {lt("Mín. bruto")}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.16em]">
                        {lt("Máx. bruto")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.calibrations.map((calibration, index) => (
                      <tr
                        className="border-t border-(--color-border) text-(--color-copy)"
                        key={index}
                      >
                        <td className="px-3 py-2 font-semibold text-(--color-ink)">
                          #{index + 1}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{calibration.minRaw}</td>
                        <td className="px-3 py-2 text-right font-mono">{calibration.maxRaw}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HardwareStat({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  hint: string;
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
          <p className="mt-1 wrap-break-word text-sm font-semibold text-(--color-ink)">
            {value}
          </p>
          <p className="mt-1 text-sm leading-5 text-(--color-muted)">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function TuningChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-panel) px-3 py-2">
      <p className="text-[0.68rem] uppercase tracking-[0.2em] text-(--color-muted)">{label}</p>
      <p className="mt-1 text-sm font-semibold text-(--color-ink)">{value}</p>
    </div>
  );
}
