import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PillVariant = "lime" | "ink" | "outline" | "outline-on-ink" | "quiet";

const VARIANTS: Record<PillVariant, string> = {
  // Text on lime is always ink, in both themes.
  lime: "bg-lime text-on-lime hover:brightness-[1.04]",
  ink: "bg-ink text-paper hover:opacity-92",
  outline: "border-[1.5px] border-line bg-surface text-ink hover:border-muted",
  "outline-on-ink": "border-[1.5px] border-ink-line bg-transparent text-on-ink hover:border-on-ink-muted",
  quiet: "bg-surface-2 text-ink hover:bg-line-soft",
};

/** Shared classes, so links (next/link) can look exactly like buttons. */
export function pillClasses(variant: PillVariant = "lime", opts: { block?: boolean; size?: "md" | "sm" } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap",
    "transition-[transform,filter,opacity,background-color,border-color] duration-150 ease-out",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
    opts.size === "sm" ? "h-tap px-4 text-sm" : "h-btn px-6 text-body",
    opts.block && "w-full",
    VARIANTS[variant],
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PillVariant;
  size?: "md" | "sm";
  block?: boolean;
  icon?: ReactNode;
  /** Optional right-hand part, e.g. the total on "Log 3 items ₦4,500". */
  trailing?: ReactNode;
};

export function PillButton({ variant = "lime", size = "md", block, icon, trailing, className, children, type, ...rest }: Props) {
  return (
    <button type={type ?? "button"} className={cn(pillClasses(variant, { block, size }), trailing != null && "justify-between", className)} {...rest}>
      <span className="inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
      {trailing && <span className="font-display text-h3 font-extrabold tracking-tight tabular-nums">{trailing}</span>}
    </button>
  );
}
