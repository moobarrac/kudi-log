import "server-only";

import type { Keyboard } from "./format";

export type TgResult<T = unknown> = { ok: true; result: T } | { ok: false; code: number | null; description: string };

/**
 * Minimal Telegram Bot API client. Never throws. TELEGRAM_API_URL is only overridden in local tests (a mock server).
 * `code` is Telegram's error_code, e.g. 403 when the user has blocked the bot.
 */
export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<TgResult<T>> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn(`[telegram] TELEGRAM_BOT_TOKEN missing, skipped ${method}`);
    return { ok: false, code: null, description: "no token" };
  }
  const base = process.env.TELEGRAM_API_URL || "https://api.telegram.org";
  try {
    const res = await fetch(`${base}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; error_code?: number; description?: string } | null;
    if (!data?.ok) {
      const description = data?.description ?? `HTTP ${res.status}`;
      console.error(`[telegram] ${method} failed:`, description);
      return { ok: false, code: data?.error_code ?? res.status, description };
    }
    return { ok: true, result: data.result as T };
  } catch (err) {
    console.error(`[telegram] ${method} error:`, err);
    return { ok: false, code: null, description: String(err) };
  }
}

export function sendMessage(chatId: number, text: string, keyboard?: Keyboard) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}

export function editMessage(chatId: number, messageId: number, text: string, keyboard?: Keyboard) {
  return tg("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: keyboard ?? { inline_keyboard: [] },
  });
}

export function answerCallback(id: string, text?: string) {
  return tg("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
}

export function editKeyboard(chatId: number, messageId: number, keyboard: Keyboard) {
  return tg("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: keyboard });
}

/** A button that opens a page of the app. Only with a public https URL: Telegram rejects localhost links. */
export function siteButton(path: string, text: string): Keyboard | undefined {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return site.startsWith("https://") ? { inline_keyboard: [[{ text, url: `${site.replace(/\/$/, "")}${path}` }]] } : undefined;
}

/** Download a file the user sent (voice notes). Telegram allows bots up to 20 MB; ours are far smaller. */
export async function downloadFile(fileId: string): Promise<Blob | null> {
  const info = await tg<{ file_path?: string }>("getFile", { file_id: fileId });
  if (!info.ok || !info.result.file_path) return null;
  const base = process.env.TELEGRAM_API_URL || "https://api.telegram.org";
  try {
    const res = await fetch(`${base}/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${info.result.file_path}`, {
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? await res.blob() : null;
  } catch (err) {
    console.error("[telegram] download failed", err);
    return null;
  }
}
