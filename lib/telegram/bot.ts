import "server-only";

import { isCategory } from "../categories";
import { loadDay } from "../day-summary";
import { addDays, lagosDay, longDay } from "../dates";
import { logText } from "../entries";
import { loadMoney } from "../money-data";
import { type InsightEntry, rangeInsights, rangeLabel } from "../insights";
import { parseAmount } from "../parser";
import { supabaseAdmin } from "../supabase/admin";
import { audioFilename, MAX_AUDIO_BYTES, TRANSCRIBE_MESSAGE, transcribe } from "../transcribe";
import { answerCallback, downloadFile, editKeyboard, editMessage, sendMessage, siteButton, tg } from "./api";
import {
  askAmount,
  categoryKeyboard,
  esc,
  formatDaySummary,
  formatLogged,
  formatMoney,
  formatWeek,
  heardLine,
  HELP,
  type Keyboard,
  LINK_EXPIRED,
  linkedText,
  loggedKeyboard,
  NOT_LINKED,
  parseCommand,
  pickItemKeyboard,
} from "./format";

// The bot uses the service-role client: RLS is off, so EVERY entries/profiles query below filters by user_id.

export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
};
type TgMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name?: string };
  text?: string;
  /** Voice note (hold the mic in Telegram) or an audio file. */
  voice?: TgAudio;
  audio?: TgAudio;
};
type TgAudio = { file_id: string; duration: number; mime_type?: string; file_size?: number };

/** Voice notes longer than this aren't spending notes; keep the free transcription quota for real ones. */
const MAX_VOICE_SECONDS = 60;

type Profile = { id: string; display_name: string | null; nightly_summary: boolean; telegram_pending: string | null };
type Row = { id: string; item: string; amount: number; category: string; created_at: string };

const MAX_TEXT = 500;

export async function handleUpdate(update: TgUpdate): Promise<void> {
  if (update.message) return onMessage(update.message);
  if (update.callback_query) return onCallback(update.callback_query);
}

async function profileForChat(chatId: number): Promise<Profile | null> {
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("id, display_name, nightly_summary, telegram_pending")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

async function todayTotal(userId: string): Promise<number> {
  const { data } = await supabaseAdmin().from("entries").select("amount").eq("user_id", userId).eq("spent_on", lagosDay());
  return (data ?? []).reduce((s, r) => s + (r.amount as number), 0);
}

/** All rows saved from one message share created_at (one insert), so that's how a "log" is found again. */
async function batchOf(userId: string, entryId: string): Promise<Row[]> {
  const db = supabaseAdmin();
  const { data: one } = await db.from("entries").select("created_at").eq("user_id", userId).eq("id", entryId).maybeSingle();
  if (!one) return [];
  const { data } = await db
    .from("entries")
    .select("id, item, amount, category, created_at")
    .eq("user_id", userId)
    .eq("created_at", one.created_at)
    .order("id");
  return (data ?? []) as Row[];
}

// ---------- messages ----------

async function onMessage(msg: TgMessage) {
  if (msg.chat.type !== "private") return; // groups aren't supported: someone's spending isn't for a group chat
  const chatId = msg.chat.id;
  const voice = msg.voice ?? msg.audio;
  if (voice) return onVoice(chatId, voice);
  const text = msg.text?.trim();
  if (!text) {
    await sendMessage(chatId, "I can read text and voice notes. Type it like <i>suya 2k</i>, or hold the mic and say it.");
    return;
  }

  const cmd = parseCommand(text);
  if (cmd?.command === "start" && cmd.arg) return link(chatId, cmd.arg, msg.from?.first_name ?? null);

  const profile = await profileForChat(chatId);
  if (!profile) {
    await sendMessage(chatId, NOT_LINKED, siteButton("/settings", "Open Kudi Log"));
    return;
  }

  if (!cmd) return logMessage(profile, chatId, text);
  switch (cmd.command) {
    case "start":
    case "help":
      return void (await sendMessage(chatId, HELP));
    case "today":
      return sendToday(profile, chatId);
    case "week":
      return sendWeek(profile, chatId);
    case "undo":
      return undoLast(profile, chatId);
    case "money":
    case "balance":
    case "budget": {
      const m = await loadMoney(supabaseAdmin(), profile.id, lagosDay());
      return void (await sendMessage(chatId, formatMoney(m.left, m.runway, m.budget), siteButton("/money", "Open Money")));
    }
    case "summary":
      return setSummary(profile, chatId, cmd.arg.toLowerCase());
    default:
      await sendMessage(chatId, `I don't know that one.\n\n${HELP}`);
  }
}

async function link(chatId: number, code: string, firstName: string | null) {
  const db = supabaseAdmin();
  const { data: p } = await db
    .from("profiles")
    .select("id, display_name, telegram_link_expires_at")
    .eq("telegram_link_code", code)
    .maybeSingle();
  if (!p || !p.telegram_link_expires_at || Date.parse(p.telegram_link_expires_at) < Date.now()) {
    await sendMessage(chatId, LINK_EXPIRED, siteButton("/settings", "Open Settings"));
    return;
  }
  // One chat, one account: unlink this chat from anyone else first (telegram_chat_id is unique).
  await db.from("profiles").update({ telegram_chat_id: null }).eq("telegram_chat_id", chatId).neq("id", p.id);
  const { error } = await db
    .from("profiles")
    .update({ telegram_chat_id: chatId, telegram_link_code: null, telegram_link_expires_at: null, telegram_pending: null })
    .eq("id", p.id);
  if (error) throw new Error(`link failed: ${error.message}`);
  await sendMessage(chatId, linkedText(p.display_name ?? firstName));
}

async function setPending(profile: Profile, pending: string | null) {
  if (profile.telegram_pending === pending) return;
  await supabaseAdmin().from("profiles").update({ telegram_pending: pending }).eq("id", profile.id);
}

/** Voice note -> Whisper -> the same path as typed text, with "I heard" so people can check it. */
async function onVoice(chatId: number, voice: TgAudio) {
  const profile = await profileForChat(chatId);
  if (!profile) {
    await sendMessage(chatId, NOT_LINKED, siteButton("/settings", "Open Kudi Log"));
    return;
  }
  if (voice.duration > MAX_VOICE_SECONDS || (voice.file_size ?? 0) > MAX_AUDIO_BYTES) {
    await sendMessage(chatId, "That voice note is a bit long. Keep it under a minute, like <i>“suya 2k, transport 1,500”</i>.");
    return;
  }
  void tg("sendChatAction", { chat_id: chatId, action: "typing" }); // "Kudi Log is typing…" while Whisper works

  const audio = await downloadFile(voice.file_id);
  if (!audio) {
    await sendMessage(chatId, TRANSCRIBE_MESSAGE.failed);
    return;
  }
  const result = await transcribe(audio, audioFilename(voice.mime_type ?? "audio/ogg"));
  if (!result.ok) {
    await sendMessage(chatId, TRANSCRIBE_MESSAGE[result.reason]);
    return;
  }
  return logMessage(profile, chatId, result.text, result.text);
}

async function logMessage(profile: Profile, chatId: number, raw: string, heard?: string) {
  if (raw.length > MAX_TEXT) {
    await sendMessage(chatId, "That's a lot at once. Split it into two messages.");
    return;
  }

  // A reply that's only an amount ("5k") answers the last "How much was it?".
  let text = raw;
  if (parseAmount(raw) !== null) {
    if (!profile.telegram_pending) {
      await sendMessage(chatId, `What was the ${esc(raw)} for? Send it like <i>suya ${esc(raw)}</i>.`);
      return;
    }
    text = `${profile.telegram_pending} ${raw}`;
  }

  const { entries, unresolved } = await logText(supabaseAdmin(), profile.id, text, "telegram", lagosDay());
  await setPending(profile, unresolved.length === 1 ? unresolved[0] : null);

  if (entries.length === 0) {
    const reply = unresolved.length ? askAmount(unresolved) : "I couldn't read that. Try something like <i>suya 2k</i>.";
    await sendMessage(chatId, heard ? `${heardLine(heard)}\n\n${reply}` : reply);
    return;
  }
  const logged = formatLogged(entries, await todayTotal(profile.id), unresolved);
  await sendMessage(chatId, heard ? `${heardLine(heard)}\n\n${logged}` : logged, loggedKeyboard(entries[0].id));
}

async function sendToday(profile: Profile, chatId: number) {
  const today = lagosDay();
  const { summary } = await loadDay(supabaseAdmin(), profile.id, today);
  await sendMessage(chatId, formatDaySummary(summary, longDay(today), true), siteButton("/summary", "Open summary"));
}

async function sendWeek(profile: Profile, chatId: number) {
  const today = lagosDay();
  const { data } = await supabaseAdmin()
    .from("entries")
    .select("item, amount, category, spent_on")
    .eq("user_id", profile.id)
    .gte("spent_on", addDays(today, -13))
    .lte("spent_on", today);
  const r = rangeInsights((data ?? []) as InsightEntry[], today, 7);
  await sendMessage(chatId, formatWeek(r, rangeLabel(r.start, r.end)), siteButton("/insights", "Open insights"));
}

async function undoLast(profile: Profile, chatId: number) {
  const db = supabaseAdmin();
  const { data: last } = await db
    .from("entries")
    .select("id")
    .eq("user_id", profile.id)
    .eq("source", "telegram")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) {
    await sendMessage(chatId, "Nothing to undo.");
    return;
  }
  const removed = await removeBatch(profile.id, last.id);
  await sendMessage(chatId, undoneText(removed, await todayTotal(profile.id)));
}

async function removeBatch(userId: string, entryId: string): Promise<Row[]> {
  const batch = await batchOf(userId, entryId);
  if (batch.length === 0) return [];
  const { data } = await supabaseAdmin()
    .from("entries")
    .delete()
    .eq("user_id", userId)
    .in("id", batch.map((b) => b.id))
    .select("id, item, amount, category, created_at");
  return (data ?? []) as Row[];
}

function undoneText(removed: Row[], total: number): string {
  if (removed.length === 0) return "That was already removed.";
  const names = removed.map((r) => esc(r.item)).join(", ");
  return `Undone. Removed ${names}.\n\nToday so far: <b>₦${total.toLocaleString("en-NG")}</b>`;
}

async function setSummary(profile: Profile, chatId: number, arg: string) {
  if (arg !== "on" && arg !== "off") {
    await sendMessage(
      chatId,
      `The 9 PM summary is <b>${profile.nightly_summary ? "on" : "off"}</b>. Send /summary ${profile.nightly_summary ? "off" : "on"} to change it.`,
    );
    return;
  }
  await supabaseAdmin().from("profiles").update({ nightly_summary: arg === "on" }).eq("id", profile.id);
  await sendMessage(chatId, arg === "on" ? "Done. Your day in kudi arrives at 9 PM." : "Done. No more 9 PM summaries. /summary on brings them back.");
}

// ---------- buttons ----------

async function onCallback(cq: NonNullable<TgUpdate["callback_query"]>) {
  const msg = cq.message;
  const data = cq.data ?? "";
  if (!msg) return void (await answerCallback(cq.id));
  // In a private chat the chat id is the user's id; anything else isn't ours.
  if (cq.from.id !== msg.chat.id) return void (await answerCallback(cq.id));
  const profile = await profileForChat(msg.chat.id);
  if (!profile) return void (await answerCallback(cq.id, "Link your Kudi Log account first."));

  const [kind, id, extra] = data.split(":");
  if (!id) return void (await answerCallback(cq.id));

  if (kind === "u") {
    const removed = await removeBatch(profile.id, id);
    await editMessage(msg.chat.id, msg.message_id, undoneText(removed, await todayTotal(profile.id)));
    return void (await answerCallback(cq.id, removed.length ? "Undone" : undefined));
  }

  if (kind === "f") {
    const batch = await batchOf(profile.id, id);
    if (batch.length === 0) return void (await answerCallback(cq.id, "That was removed."));
    if (batch.length === 1) {
      await editKeyboard(msg.chat.id, msg.message_id, categoryKeyboard(batch[0].id));
      return void (await answerCallback(cq.id, "Pick the right category"));
    }
    await editKeyboard(msg.chat.id, msg.message_id, pickItemKeyboard(batch));
    return void (await answerCallback(cq.id, "Which one?"));
  }

  if (kind === "p") {
    await editKeyboard(msg.chat.id, msg.message_id, categoryKeyboard(id));
    return void (await answerCallback(cq.id, "Pick the right category"));
  }

  if (kind === "c" && isCategory(extra)) {
    const { data: updated } = await supabaseAdmin()
      .from("entries")
      .update({ category: extra })
      .eq("user_id", profile.id)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (!updated) return void (await answerCallback(cq.id, "That was removed."));
    const batch = await batchOf(profile.id, id);
    await editMessage(msg.chat.id, msg.message_id, formatLogged(batch, await todayTotal(profile.id)), loggedKeyboard(batch[0].id));
    return void (await answerCallback(cq.id, "Fixed"));
  }

  await answerCallback(cq.id);
}
