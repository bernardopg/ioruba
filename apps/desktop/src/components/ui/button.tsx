import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full border text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[var(--accent-copper)] px-4 py-2 text-[var(--color-ink)] shadow-[0_16px_40px_rgba(215,138,68,0.2)] hover:bg-[var(--accent-copper-strong)] focus-visible:ring-[var(--accent-copper)]",
        secondary:
          "border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2 text-[var(--color-copy)] hover:border-[var(--accent-teal)] hover:text-[var(--color-ink)] focus-visible:ring-[var(--accent-teal)]",
        ghost:
          "border-transparent px-3 py-2 text-[var(--color-muted)] hover:bg-[var(--color-panel)] hover:text-[var(--color-copy)] focus-visible:ring-[var(--accent-teal)]"
      },
      size: {
        default: "h-11",
        small: "h-9 px-3 text-xs"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      type={type}
      {...props}
    />
  );
}
