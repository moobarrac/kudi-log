// Lagos is UTC+1 all year (no daylight saving), so we can do this without a timezone library.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

/** The calendar day in Lagos as YYYY-MM-DD. */
export function lagosDay(now: Date = new Date()): string {
  return new Date(now.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** Shift a YYYY-MM-DD day by n days. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function prettyDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Clock time in Lagos for display, e.g. "2:14 PM". */
export function lagosTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).replace(/\b(am|pm)\b/i, (s) => s.toUpperCase());
}

/** Hour of the day in Lagos, 0-23. */
export function lagosHour(now: Date = new Date()): number {
  return new Date(now.getTime() + LAGOS_OFFSET_MS).getUTCHours();
}

export function greeting(now: Date = new Date()): string {
  const h = lagosHour(now);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** "Monday, 16 November", for the summary header. */
export function longDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}
