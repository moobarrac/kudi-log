import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { categoryLabel, isCategory } from "@/lib/categories";
import { loadDay } from "@/lib/day-summary";
import { lagosDay, longDay } from "@/lib/dates";
import { isLoggableDay } from "@/lib/entry-input";
import { naira } from "@/lib/money";
import { biggestBiteLine, type DaySummary, weekdayName } from "@/lib/summary";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /summary/card?day=YYYY-MM-DD -> PNG, 1080x1920 (phone story size, so it fits WhatsApp status).
 * The same layout as the summary screen. Satori can't read CSS variables, so colours are copied from design/tokens.css.
 */
const C = {
  hero: "#101412",
  raised: "#1E2421",
  track: "#262D29",
  line: "#3A423E",
  onInk: "#FFFFFF",
  soft: "#D5DBD7",
  muted: "#A8B0AB",
  lime: "#C6F24E",
  good: "#7BE0A8",
  goodTint: "#173A2A",
};
const DOT: Record<string, string> = {
  food: "#F0803C",
  transport: "#5B8CF0",
  airtime_data: "#A98AF0",
  bills: "#E5B52A",
  groceries: "#2FA866",
  shopping: "#E45C93",
  health: "#2BA3B3",
  family: "#C08A4E",
  gifts: "#C455D9",
  fun: "#F06A5A",
  betting: "#D23F57",
  other: "#8C928E",
};

const FONT_DIR = join(process.cwd(), "assets/fonts");
let fonts: Promise<Array<{ name: string; data: Buffer; weight: 500 | 600 | 700 | 800; style: "normal" }>> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(FONT_DIR, "Inter-Medium.ttf")).then((data) => ({ name: "Inter", data, weight: 500 as const, style: "normal" as const })),
    readFile(join(FONT_DIR, "Inter-SemiBold.ttf")).then((data) => ({ name: "Inter", data, weight: 600 as const, style: "normal" as const })),
    readFile(join(FONT_DIR, "BricolageGrotesque-Bold.ttf")).then((data) => ({ name: "Bricolage", data, weight: 700 as const, style: "normal" as const })),
    readFile(join(FONT_DIR, "BricolageGrotesque-ExtraBold.ttf")).then((data) => ({ name: "Bricolage", data, weight: 800 as const, style: "normal" as const })),
  ]);
  return fonts;
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return new Response("Please sign in again.", { status: 401 });

  const today = lagosDay();
  const asked = new URL(request.url).searchParams.get("day");
  const day = isLoggableDay(asked, today) ? asked : today;

  const db = await supabaseServer();
  const [{ summary }, fontData] = await Promise.all([loadDay(db, user.sub, day), loadFonts()]);

  return new ImageResponse(<Card s={summary} isToday={day === today} />, {
    width: 1080,
    height: 1920,
    fonts: fontData,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function Card({ s, isToday }: { s: DaySummary; isToday: boolean }) {
  const when = isToday ? "today" : weekdayName(s.day);
  const shown = s.byCategory.slice(0, 4);
  const max = shown[0]?.amount ?? 1;
  const top = s.byCategory[0];
  const c = s.comparison;
  const bite = top ? (biggestBiteLine(s.byCategory, categoryLabel(top.category), when) ?? "") : "";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: C.hero,
        color: C.onInk,
        fontFamily: "Inter",
        padding: "88px 88px 80px",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 36, color: C.muted, fontWeight: 500 }}>{longDay(s.day)}</span>
        <span style={{ fontFamily: "Bricolage", fontSize: 56, fontWeight: 700 }}>Your day in kudi</span>
      </div>

      {/* total */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 72 }}>
        <span style={{ fontSize: 42, color: C.soft, fontWeight: 500 }}>You spent</span>
        <span
          style={{ fontFamily: "Bricolage", fontSize: fitTotal(naira(s.total)), fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1, color: C.lime, marginTop: 10 }}
        >
          {naira(s.total)}
        </span>
        <span style={{ fontSize: 42, color: C.soft, fontWeight: 500, marginTop: 10 }}>
          across {s.count} {s.count === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* comparison */}
      {c && (
        <div style={{ display: "flex", alignItems: "center", gap: 32, marginTop: 44, background: C.raised, borderRadius: 52, padding: "36px 40px" }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 34,
              background: c.direction === "under" ? C.goodTint : C.track,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={c.direction === "under" ? C.good : C.soft} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              {c.direction === "under" ? (
                <path d="M12 5v14M19 12l-7 7-7-7" />
              ) : c.direction === "over" ? (
                <path d="M12 19V5M5 12l7-7 7 7" />
              ) : (
                <path d="M5 9h14M5 15h14" />
              )}
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <span style={{ fontSize: c.headline.length > 34 ? 34 : 40, fontWeight: 600 }}>{c.headline}</span>
            <span style={{ fontSize: 30, color: C.muted, fontWeight: 500 }}>{c.detail}</span>
          </div>
        </div>
      )}

      {/* biggest bite */}
      {top && (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
          <span style={{ fontSize: 34, color: C.muted, fontWeight: 500 }}>Biggest bite</span>
          <span style={{ fontFamily: "Bricolage", fontSize: bite.length > 26 ? 50 : 64, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 8 }}>
            {bite}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 32 }}>
            {shown.map((row) => (
              <div key={row.category} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 34 }}>
                  <span style={{ color: C.soft, fontWeight: 500 }}>{categoryLabel(row.category)}</span>
                  <span style={{ fontWeight: 600 }}>{naira(row.amount)}</span>
                </div>
                <div style={{ display: "flex", height: 20, borderRadius: 10, background: C.track }}>
                  <div
                    style={{
                      height: 20,
                      borderRadius: 10,
                      width: `${Math.max(3, (row.amount / max) * 100)}%`,
                      background: DOT[isCategory(row.category) ? row.category : "other"],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* tiles */}
      <div style={{ display: "flex", gap: 28, marginTop: 44, flexShrink: 0 }}>
        {s.biggest && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, background: C.raised, borderRadius: 46, padding: 38, minWidth: 0 }}>
            <span style={{ fontSize: 30, color: C.muted, fontWeight: 500 }}>Biggest single spend</span>
            <span style={{ fontSize: 38, fontWeight: 600 }}>{capitalise(truncate(s.biggest.item, 17))}</span>
            <span style={{ fontFamily: "Bricolage", fontSize: 54, fontWeight: 700 }}>{naira(s.biggest.amount)}</span>
          </div>
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, background: C.raised, borderRadius: 46, padding: 38 }}>
          <span style={{ fontSize: 30, color: C.muted, fontWeight: 500 }}>Logging streak</span>
          <span style={{ fontFamily: "Bricolage", fontSize: 54, fontWeight: 700 }}>
            {s.streak} {s.streak === 1 ? "day" : "days"}
          </span>
          <div style={{ display: "flex", gap: 12 }}>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} style={{ width: 30, height: 30, borderRadius: 15, background: i < Math.min(s.streak, 7) ? C.lime : C.line }} />
            ))}
          </div>
        </div>
      </div>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: "auto", paddingTop: 40, flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: C.lime }} />
        <span style={{ fontFamily: "Bricolage", fontSize: 40, fontWeight: 700 }}>Kudi Log</span>
        <span style={{ fontSize: 32, color: C.muted, fontWeight: 500 }}>Know where your money went.</span>
      </div>
    </div>
  );
}

/** 200px for up to 7 characters, smaller for big totals so ₦1,268,400 still fits the 904px row. */
function fitTotal(text: string) {
  return Math.min(200, Math.floor(904 / (text.length * 0.62)));
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
