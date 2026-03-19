import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({ checked, onCheckedChange }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full border transition",
        checked
          ? "border-[var(--accent-teal)] bg-[color-mix(in_oklab,var(--accent-teal)_35%,var(--color-panel))]"
          : "border-[var(--color-border)] bg-[var(--color-panel)]"
      )}
      onCheckedChange={onCheckedChange}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block h-5 w-5 rounded-full bg-[var(--color-ink)] shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </SwitchPrimitive.Root>
  );
}
