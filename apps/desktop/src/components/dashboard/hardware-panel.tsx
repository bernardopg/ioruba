import {
  Cable,
  CircleDot,
  Cpu,
  Gauge,
  Microchip,
  Radio,
  RotateCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { translateText } from "@/lib/i18n";
import type { FirmwareInfo, FirmwarePinMap, UiLanguage } from "@ioruba/shared";

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

        {firmware.pinMap ? <FirmwarePinMapPanel pinMap={firmware.pinMap} lt={lt} /> : null}

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
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em]" scope="col">
                        {lt("Knob")}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.16em]" scope="col">
                        {lt("Mín. bruto")}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.16em]" scope="col">
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

function FirmwarePinMapPanel({
  pinMap,
  lt,
}: {
  pinMap: FirmwarePinMap;
  lt: (text: string) => string;
}) {
  const activeConnections =
    pinMap.knobPins.length + pinMap.buttonPins.length + pinMap.encoderPins.length * 2;

  return (
    <section
      aria-labelledby="active-pin-map-title"
      className="overflow-hidden rounded-[22px] border border-(--color-border) bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-panel)_94%,var(--accent-teal)_6%),var(--color-panel))]"
    >
      <div className="flex flex-col gap-4 border-b border-(--color-border) px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[color-mix(in_oklab,var(--accent-teal)_35%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-teal)_11%,var(--color-shell))]">
            <Cable className="h-4 w-4 text-(--accent-teal)" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-(--color-ink)" id="active-pin-map-title">
              {lt("Pinagem ativa")}
            </h3>
            <p className="mt-1 text-sm leading-5 text-(--color-muted)">
              {lt("Mapa reportado pelo firmware e validado contra conflitos antes da compilação.")}
            </p>
          </div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[color-mix(in_oklab,var(--accent-teal)_32%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-teal)_10%,var(--color-panel))] px-3 py-1.5 text-xs font-semibold text-(--color-ink)">
          <ShieldCheck className="h-3.5 w-3.5 text-(--accent-teal)" />
          {activeConnections} {lt("conexões sem conflito")}
        </div>
      </div>

      <div className="grid divide-y divide-(--color-border) md:grid-cols-3 md:divide-x md:divide-y-0">
        <PinGroup
          icon={SlidersHorizontal}
          label={lt("Knobs")}
          detail={lt("Entradas analógicas")}
          pins={pinMap.knobPins}
          emptyLabel={lt("não habilitados")}
        />
        <PinGroup
          icon={CircleDot}
          label={lt("Botões")}
          detail={lt("INPUT_PULLUP para GND")}
          pins={pinMap.buttonPins}
          emptyLabel={lt("não habilitados")}
        />
        <EncoderPinGroup
          pairs={pinMap.encoderPins}
          emptyLabel={lt("não habilitados")}
          lt={lt}
        />
      </div>
    </section>
  );
}

function PinGroup({
  icon: Icon,
  label,
  detail,
  pins,
  emptyLabel,
}: {
  icon: typeof Cpu;
  label: string;
  detail: string;
  pins: string[];
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0 px-4 py-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-(--accent-teal)" />
        <p className="text-sm font-semibold text-(--color-ink)">{label}</p>
      </div>
      <p className="mt-1 text-xs leading-5 text-(--color-muted)">{detail}</p>
      {pins.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={label}>
          {pins.map((pin, index) => (
            <li
              className="rounded-lg border border-(--color-border) bg-(--color-shell) px-2 py-1 font-mono text-xs font-semibold text-(--color-copy)"
              key={`${pin}-${index}`}
            >
              {pin}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-medium text-(--color-muted)">{emptyLabel}</p>
      )}
    </div>
  );
}

function EncoderPinGroup({
  pairs,
  emptyLabel,
  lt,
}: {
  pairs: FirmwarePinMap["encoderPins"];
  emptyLabel: string;
  lt: (text: string) => string;
}) {
  return (
    <div className="min-w-0 px-4 py-4">
      <div className="flex items-center gap-2">
        <RotateCw className="h-4 w-4 text-(--accent-teal)" />
        <p className="text-sm font-semibold text-(--color-ink)">{lt("Encoders")}</p>
      </div>
      <p className="mt-1 text-xs leading-5 text-(--color-muted)">{lt("Canais A/B com INPUT_PULLUP")}</p>
      {pairs.length > 0 ? (
        <ul className="mt-3 grid gap-1.5" aria-label={lt("Encoders")}>
          {pairs.map(({ a, b }, index) => (
            <li
              className="flex min-w-0 items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-shell) px-2 py-1.5"
              key={`${a}-${b}`}
            >
              <span className="w-5 shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--color-muted)">
                {index + 1}
              </span>
              <span className="min-w-0 font-mono text-xs font-semibold text-(--color-copy)">{a}</span>
              <span className="text-(--color-muted)" aria-hidden="true">↔</span>
              <span className="min-w-0 font-mono text-xs font-semibold text-(--color-copy)">{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-medium text-(--color-muted)">{emptyLabel}</p>
      )}
    </div>
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
