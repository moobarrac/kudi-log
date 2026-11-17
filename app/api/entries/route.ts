import { NextResponse } from "next/server";
import { isDay } from "@/lib/dates";
import { listEntries, totalFor } from "@/lib/history";
import { cleanQuery, filterRange, isPeriod } from "@/lib/periods";
import { lagosDay } from "@/lib/dates";
import { logText } from "@/lib/entries";
import { isLoggableDay } from "@/lib/entry-input";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

const MAX_TEXT = 500;

/** POST { text, day? } -> { entries, unresolved }. Uses the user's session, so RLS scopes the insert. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let body: { text?: unknown; day?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That didn't come through. Try again." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Type what you spent on first." }, { status: 400 });
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: "That's a lot at once. Split it into two logs." }, { status: 400 });
  }

  const today = lagosDay();
  const day = body.day === undefined ? today : body.day;
  if (!isLoggableDay(day, today)) {
    return NextResponse.json({ error: "Pick a day in the last 3 months." }, { status: 400 });
  }

  try {
    const db = await supabaseServer();
    const result = await logText(db, user.sub, text, "web", day);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/entries]", err);
    return NextResponse.json({ error: "We couldn't save that just now. Try again." }, { status: 500 });
  }
}

/**
 * GET ?q=suya&period=month|last-month|3m|all&day=YYYY-MM-DD&cursor_day=&cursor_at=
 * -> { entries, next, total? }. The total (whole filter, summed in Postgres) comes with the first page only.
 */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const sp = new URL(request.url).searchParams;
  const q = cleanQuery(sp.get("q"));
  const period = isPeriod(sp.get("period")) ? (sp.get("period") as Parameters<typeof filterRange>[0]) : "all";
  const range = filterRange(period, sp.get("day"), lagosDay());
  const cDay = sp.get("cursor_day");
  const cAt = sp.get("cursor_at");
  const cursor = cDay && isDay(cDay) && cAt && !Number.isNaN(Date.parse(cAt)) ? { day: cDay, at: cAt } : null;

  try {
    const db = await supabaseServer();
    const [page, total] = await Promise.all([listEntries(db, { q, range, cursor }), cursor ? null : totalFor(db, q, range)]);
    return NextResponse.json({ ...page, ...(total ? { total } : {}) });
  } catch (err) {
    console.error("[api/entries GET]", err);
    return NextResponse.json({ error: "We couldn't load your entries. Try again." }, { status: 500 });
  }
}
