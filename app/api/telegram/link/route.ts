import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/supabase/server";

const CODE_TTL_MS = 15 * 60 * 1000;

/**
 * POST -> { url }: a one-time t.me deep link that links the chat that opens it to this account.
 * Linking fields can't be written by users (see the telegram migration), so this uses the admin client,
 * scoped to the signed-in user's own id.
 */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  if (!bot || !process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "Telegram isn't set up yet. Add the bot token (see docs/setup.md)." }, { status: 503 });
  }

  const code = randomBytes(12).toString("base64url"); // 16 chars, allowed in a /start payload
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ telegram_link_code: code, telegram_link_expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString() })
    .eq("id", user.sub);
  if (error) {
    console.error("[api/telegram/link]", error);
    return NextResponse.json({ error: "We couldn't start linking. Try again." }, { status: 500 });
  }
  return NextResponse.json({ url: `https://t.me/${bot}?start=${code}` });
}

/** DELETE: unlink this account's Telegram chat. */
export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ telegram_chat_id: null, telegram_link_code: null, telegram_link_expires_at: null, telegram_pending: null })
    .eq("id", user.sub);
  if (error) {
    console.error("[api/telegram/link DELETE]", error);
    return NextResponse.json({ error: "We couldn't unlink that. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
