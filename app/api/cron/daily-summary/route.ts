import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { loadDay } from "@/lib/day-summary";
import { lagosDay, longDay } from "@/lib/dates";
import { nightlyAction } from "@/lib/nightly";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendMessage, siteButton } from "@/lib/telegram/api";
import { formatDaySummary } from "@/lib/telegram/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Hobby allows up to 60s

const PAGE = 200;
const WORKERS = 5; // well under Telegram's ~30 messages a second
const TIME_BUDGET_MS = 50_000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed
  const got = request.headers.get("authorization") ?? "";
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(got), h(`Bearer ${secret}`));
}

type Stats = { sent: number; nudged: number; skipped: number; failed: number; unlinked: number; incomplete: boolean };

/**
 * GET /api/cron/daily-summary. Vercel Cron calls it at 20:00 UTC (9 PM Lagos) with Authorization: Bearer $CRON_SECRET.
 * Sends the day's summary to everyone with nightly_summary on and a linked chat. Safe to re-run:
 * last_summary_sent_on means nobody gets the same day twice.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return new NextResponse("Unauthorized", { status: 401 });

  const db = supabaseAdmin();
  const today = lagosDay();
  const dateLabel = longDay(today);
  const deadline = Date.now() + TIME_BUDGET_MS;
  const stats: Stats = { sent: 0, nudged: 0, skipped: 0, failed: 0, unlinked: 0, incomplete: false };

  async function handle(p: { id: string; telegram_chat_id: number }) {
    const { summary, history } = await loadDay(db, p.id, today);
    const action = nightlyAction(summary, history, today);
    if (action === "skip") return void stats.skipped++;

    const res = await sendMessage(p.telegram_chat_id, formatDaySummary(summary, dateLabel, true), siteButton("/summary", "Open summary"));
    if (res.ok) {
      await db.from("profiles").update({ last_summary_sent_on: today }).eq("id", p.id);
      if (action === "summary") stats.sent++;
      else stats.nudged++;
    } else if (res.code === 403 || (res.code === 400 && /chat not found/i.test(res.description))) {
      // They blocked the bot or deleted the chat: stop trying. They can link again from Settings.
      await db.from("profiles").update({ telegram_chat_id: null }).eq("id", p.id);
      stats.unlinked++;
    } else {
      stats.failed++; // left unmarked, so a manual re-run tries again
    }
  }

  // Keyset paging by id: marking rows as sent changes the filtered set, so offsets would skip people.
  let after = "00000000-0000-0000-0000-000000000000";
  for (;;) {
    if (Date.now() > deadline) {
      stats.incomplete = true;
      break;
    }
    const { data, error } = await db
      .from("profiles")
      .select("id, telegram_chat_id")
      .eq("nightly_summary", true)
      .not("telegram_chat_id", "is", null)
      .or(`last_summary_sent_on.is.null,last_summary_sent_on.lt.${today}`)
      .gt("id", after)
      .order("id")
      .limit(PAGE);
    if (error) {
      console.error("[cron/daily-summary] load profiles", error);
      return NextResponse.json({ error: "load failed", ...stats }, { status: 500 });
    }
    const page = (data ?? []) as Array<{ id: string; telegram_chat_id: number }>;
    if (page.length === 0) break;
    after = page[page.length - 1].id;

    const queue = [...page];
    await Promise.all(
      Array.from({ length: WORKERS }, async () => {
        for (let p = queue.shift(); p; p = queue.shift()) {
          if (Date.now() > deadline) return void (stats.incomplete = true);
          try {
            await handle(p);
          } catch (err) {
            console.error("[cron/daily-summary] user failed", p.id, err);
            stats.failed++;
          }
        }
      }),
    );
    if (page.length < PAGE) break;
  }

  console.log("[cron/daily-summary]", today, stats);
  return NextResponse.json({ day: today, ...stats });
}
