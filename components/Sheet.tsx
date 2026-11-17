"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Hide the visible title (it stays for screen readers). */
  hideTitle?: boolean;
  /** Right side of the header, e.g. the "Today" date picker. */
  headerAction?: ReactNode;
  /** Pinned under the scrolling body, e.g. the lime Log CTA. */
  footer?: ReactNode;
  /** Nearly full height (quick log) instead of fitting its content. */
  tall?: boolean;
  children: ReactNode;
};

/** Bottom sheet with drag to dismiss (vaul). */
export function Sheet({ open, onOpenChange, title, hideTitle, headerAction, footer, tall, children }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-[rgb(16_20_18/0.45)] backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[480px] flex-col rounded-t-card-lg bg-paper outline-none",
            tall ? "h-[94dvh]" : "max-h-[94dvh]",
          )}
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-pill bg-line" />
          <header className="flex shrink-0 items-center gap-2 px-gutter pt-2 pb-3">
            <Drawer.Close
              aria-label="Close"
              className="-ml-2 grid size-tap place-items-center rounded-full text-ink transition-colors hover:bg-surface-2"
            >
              <X size={22} strokeWidth={2} />
            </Drawer.Close>
            <Drawer.Title className={cn("flex-1 font-display text-h3 font-bold tracking-tight", hideTitle && "sr-only")}>
              {title}
            </Drawer.Title>
            {headerAction}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-gutter pb-4">{children}</div>
          {footer && <div className="shrink-0 px-gutter pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
