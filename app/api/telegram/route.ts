import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram/api";
import { handleUpdate, type TgUpdate } from "@/lib/telegram/bot";

/** Constant-time compare (hashing first makes the lengths equal). */
function sameSecret(a: string, b: string): boolean {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

/**
 * Telegram webhook. Telegram sends X-Telegram-Bot-Api-Secret-Token on every call (set with setWebhook's secret_token).
 * Fails closed: with no secret configured, nothing gets in.
 */
export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!expected || !sameSecret(got, expected)) return new NextResponse("Unauthorized", { status: 401 });

  let update: TgUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true }); // not JSON: ignore, and don't make Telegram retry
  }

  try {
    await handleUpdate(update);
  } catch (err) {
    console.error("[api/telegram]", err);
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (chatId) await sendMessage(chatId, "Something went wrong on our side. Try again in a minute.");
  }
  // Always 200 once authenticated: a non-200 makes Telegram resend the same update again and again.
  return NextResponse.json({ ok: true });
}
