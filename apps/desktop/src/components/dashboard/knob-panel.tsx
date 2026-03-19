import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuntimeKnobSnapshot } from "@ioruba/shared";

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

export function KnobPanel({ knob }: { knob: RuntimeKnobSnapshot }) {
  return (
    <Card className="min-h-[280px]">
      <CardHeader>
        <div>
          <CardTitle>{knob.name}</CardTitle>
          <CardDescription>
            Leitura bruta {knob.rawValue} | aplicada {knob.appliedRawValue}
          </CardDescription>
        </div>
        <Badge tone="neutral">{knob.targets.length} target(s)</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-end gap-5">
          <div
            className="relative h-36 w-36 rounded-full border border-[var(--color-border)]"
            style={{
              background: `conic-gradient(${accentColor(knob.accent)} 0deg ${
                knob.percent * 3.6
              }deg, transparent ${knob.percent * 3.6}deg 360deg)`
            }}
          >
            <div className="absolute inset-4 grid place-items-center rounded-full bg-[var(--color-shell)]">
              <span className="font-display text-4xl font-semibold text-[var(--color-ink)]">
                {knob.percent}%
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Destinos
            </p>
            <div className="flex flex-wrap gap-2">
              {knob.targets.map((target) => (
                <Badge key={target} tone="neutral">
                  {target}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
            Último resultado
          </p>
          <p className="mt-2 text-sm text-[var(--color-copy)]">{knob.outcome}</p>
        </div>
      </CardContent>
    </Card>
  );
}
