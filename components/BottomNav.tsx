"use client";

import { ChartColumn, History, House, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TABS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/today", label: "Today", icon: House },
  { href: "/insights", label: "Insights", icon: ChartColumn },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="grid grid-cols-4">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-14 flex-col items-center justify-center gap-1 rounded-row text-xs transition-colors",
              active ? "font-semibold text-ink" : "font-medium text-muted hover:text-ink",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid h-7 w-12 place-items-center rounded-pill transition-[background-color,transform] duration-150 ease-out group-active:scale-95",
                active ? "bg-ink text-paper" : "bg-transparent",
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.25 : 2} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed bottom of every signed-in screen: optional log bar on top, nav underneath. */
export function BottomDock({ children }: { children?: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] bg-linear-to-t from-paper from-70% to-transparent px-gutter pt-6 pb-[max(4px,env(safe-area-inset-bottom))]">
      {children}
      <div className={children ? "mt-2" : undefined}>
        <BottomNav />
      </div>
    </div>
  );
}
