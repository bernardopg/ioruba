import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const toneClasses = {
  neutral:
    "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-muted)]",
  positive:
    "border-[color-mix(in_oklab,var(--accent-teal)_40%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-teal)_16%,var(--color-panel))] text-[var(--accent-teal-strong)]",
  warning:
    "border-[color-mix(in_oklab,var(--accent-copper)_40%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-copper)_16%,var(--color-panel))] text-[var(--accent-copper-strong)]",
  critical:
    "border-[color-mix(in_oklab,var(--accent-rose)_40%,var(--color-border))] bg-[color-mix(in_oklab,var(--accent-rose)_14%,var(--color-panel))] text-[var(--accent-rose)]"
} as const;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof toneClasses;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.22em]",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
