import { NextResponse } from "next/server";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

const MAX = 1_000_000_000;

/**
 * POST { kind: "set" | "add", amount, note? }.
 * "set" = "this is what I have now" (₦0 allowed); "add" = money in, like salary (more than ₦0).
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const kind = body?.kind;
  const amount = body?.amount;
  const note = typeof body?.note === "string" ? body.note.trim().replace(/\s+/g, " ").slice(0, 60) || null : null;

  if (kind !== "set" && kind !== "add") return NextResponse.json({ error: "That didn't come through. Try again." }, { status: 400 });
  if (!Number.isInteger(amount) || amount < (kind === "add" ? 1 : 0) || amount > MAX) {
    return NextResponse.json({ error: "Amounts are whole naira, like 150,000." }, { status: 400 });
  }

  const db = await supabaseServer();
  const { data, error } = await db
    .from("money_events")
    .insert({ user_id: user.sub, kind, amount, note: kind === "add" ? note : null })
    .select("id, kind, amount, note, created_at")
    .single();
  if (error) {
    console.error("[api/money]", error);
    return NextResponse.json({ error: "We couldn't save that. Try again." }, { status: 500 });
  }
  return NextResponse.json({ event: data });
}
