import type { ComponentPropsWithoutRef } from "react";

import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

type SwitchProps = ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>;

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:[box-shadow:0_0_0_4px_color-mix(in_oklab,var(--accent-teal)_24%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[color-mix(in_oklab,var(--accent-teal)_70%,var(--color-border))] data-[state=checked]:bg-[color-mix(in_oklab,var(--accent-teal)_38%,var(--color-panel))] data-[state=unchecked]:border-(--color-border) data-[state=unchecked]:bg-[color-mix(in_oklab,var(--color-panel)_92%,var(--color-shell)_8%)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block h-5 w-5 rounded-full bg-(--color-glow) ring-1 ring-[color-mix(in_oklab,var(--color-border)_72%,transparent)] shadow-[0_3px_12px_color-mix(in_oklab,var(--shadow-ink)_16%,transparent)] transition-transform duration-200 ease-out will-change-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}
