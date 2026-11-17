"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/** The black "What did you spend on?" bar fixed at the bottom of Today. Opens the quick log sheet. */
export function LogBar({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-btn w-full items-center gap-3 rounded-pill bg-hero pr-1.5 pl-5 text-left ring-1 ring-ink-line/60",
        "shadow-[0_10px_30px_-12px_rgb(16_20_18/0.55)] transition-transform duration-150 ease-out active:scale-[0.985]",
        className,
      )}
    >
      <span className="flex-1 truncate text-body text-on-ink-muted">What did you spend on?</span>
      <span
        aria-hidden
        className="grid size-11 place-items-center rounded-full bg-lime text-on-lime transition-transform duration-150 ease-out group-hover:rotate-90"
      >
        <Plus size={22} strokeWidth={2.25} />
      </span>
    </button>
  );
}
