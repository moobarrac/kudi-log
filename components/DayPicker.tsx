"use client";

import { CalendarDays } from "lucide-react";
import { addDays, prettyDay } from "@/lib/dates";

export function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  return prettyDay(day);
}

/** "Today" pill that opens the native date picker, for backdating. */
export function DayPicker({ day, today, onChange }: { day: string; today: string; onChange: (d: string) => void }) {
  return (
    <label className="relative inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-pill border border-line bg-surface px-3.5 text-sm font-medium text-ink focus-within:outline-2 focus-within:outline-emerald">
      <CalendarDays size={16} aria-hidden className="text-muted" />
      {dayLabel(day, today)}
      {/* Invisible native input over the pill: real picker on iOS/Android, no custom calendar to maintain. */}
      <input
        type="date"
        aria-label="Day you spent it"
        value={day}
        max={today}
        min={addDays(today, -90)}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}
