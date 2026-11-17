"use client";

import { m, type MotionValue, type PanInfo, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Trash2 } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { lagosTime } from "@/lib/dates";
import { naira } from "@/lib/money";
import { CategoryTile } from "./CategoryChip";

type Props = {
  item: string;
  amount: number;
  category: string;
  createdAt: string;
  source: "web" | "telegram";
  /** Saving in the background (optimistic row). */
  pending?: boolean;
  /** Tap the row to edit it. */
  onEdit?: () => void;
  /** Swipe left (or press Delete) to remove. The caller shows the Undo toast. */
  onDelete?: () => void;
};

const DELETE_AT = -96; // px dragged before release deletes
const FLING = -600; // px/s

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4); // close to --ease-out

/** Slide a motion value to `to`. A tiny rAF tween, so the row doesn't need motion's animation engine up front. */
function tween(v: MotionValue<number>, to: number, ms: number): Promise<void> {
  const from = v.get();
  const t0 = performance.now();
  return new Promise((resolve) => {
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      v.set(from + (to - from) * easeOut(t));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** One spend in the Today list. Use inside <AnimatePresence> so deletes collapse smoothly. */
export function EntryRow({ item, amount, category, createdAt, source, pending, onEdit, onDelete }: Props) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const dragged = useRef(false);
  const trashOpacity = useTransform(x, [0, -40, DELETE_AT], [0, 0.4, 1]);
  const trashScale = useTransform(x, [-40, DELETE_AT], [0.8, 1]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (onDelete && (info.offset.x < DELETE_AT || info.velocity.x < FLING)) {
      tween(x, -480, 180).then(onDelete);
    } else {
      tween(x, 0, 220);
    }
    // Let the click that follows a drag pass without opening edit.
    setTimeout(() => (dragged.current = false), 0);
  }

  const label = capitalise(item);
  const meta = pending ? "Saving…" : `${lagosTime(createdAt)} · ${source === "telegram" ? "Telegram" : "App"}`;

  return (
    <m.li
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative list-none overflow-hidden rounded-row"
    >
      {onDelete && (
        <div aria-hidden className="absolute inset-0 flex items-center justify-end rounded-row bg-bad pr-5 text-on-ink">
          <m.span style={{ opacity: trashOpacity, scale: trashScale }} className="flex items-center gap-1.5 text-sm font-semibold">
            <Trash2 size={18} strokeWidth={2} />
            Delete
          </m.span>
        </div>
      )}

      <m.div
        drag={onDelete ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.9, right: 0.05 }}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: "pan-y" }}
        className={cn("relative bg-surface transition-opacity duration-150", pending && "opacity-60")}
      >
        <button
          type="button"
          onClick={() => !dragged.current && onEdit?.()}
          onKeyDown={(e) => {
            if (onDelete && (e.key === "Delete" || e.key === "Backspace")) {
              e.preventDefault();
              onDelete();
            }
          }}
          className="flex min-h-[64px] w-full items-center gap-3 rounded-row px-3 py-2.5 text-left focus-visible:outline-offset-[-2px]"
        >
          <CategoryTile category={category} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-medium text-ink">{label}</span>
            <span className="block text-xs text-muted">{meta}</span>
          </span>
          <span className="font-display text-h3 font-bold tracking-tight text-ink tabular-nums">{naira(amount)}</span>
          {(onEdit || onDelete) && (
            <span className="sr-only">
              {onEdit ? ". Tap to edit." : ""}
              {onDelete ? " Press Delete to remove." : ""}
            </span>
          )}
        </button>
      </m.div>
    </m.li>
  );
}
