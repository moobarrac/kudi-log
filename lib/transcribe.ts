import "server-only";

import { cleanTranscript } from "./voice-text";

/**
 * Speech to text with Groq Whisper (free tier). Used by the web mic (iPhone, Firefox, fallback)
 * and Telegram voice notes. The audio is sent once and never stored.
 *
 * Returns the cleaned text, ready for the rule parser. Never throws.
 */
export type TranscribeResult =
  | { ok: true; text: string }
  | { ok: false; reason: "off" | "busy" | "empty" | "failed" };

export const MAX_AUDIO_BYTES = 2 * 1024 * 1024; // ~2 minutes of compressed speech; clips are capped at 30s anyway

// Whisper uses this as context: it nudges spelling of local words and writing amounts as digits.
const PROMPT =
  "Spending notes from Nigeria. Suya 2,000, keke 500, danfo 800, okada, Bolt 3,200, amala, jollof, pure water, " +
  "recharge card, airtime, data 1,000, NEPA light, DSTV, offering, aso ebi, ₦1,500.";

const MODEL = () => process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3-turbo";

export async function transcribe(audio: Blob, filename: string): Promise<TranscribeResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, reason: "off" };
  if (audio.size === 0) return { ok: false, reason: "empty" };

  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", MODEL());
  form.append("language", "en");
  form.append("prompt", PROMPT);
  form.append("temperature", "0");
  form.append("response_format", "json");

  try {
    const res = await fetch(`${process.env.GROQ_API_BASE || "https://api.groq.com/openai/v1"}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 429) return { ok: false, reason: "busy" }; // free-tier limit reached
    if (!res.ok) {
      console.error("[transcribe] groq", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return { ok: false, reason: "failed" };
    }
    const data = (await res.json()) as { text?: string };
    const text = cleanTranscript(data.text ?? "");
    return text ? { ok: true, text } : { ok: false, reason: "empty" };
  } catch (err) {
    console.error("[transcribe]", err);
    return { ok: false, reason: "failed" };
  }
}

/** What to tell people when it didn't work. Plain words, always with a way forward. */
export const TRANSCRIBE_MESSAGE: Record<Exclude<TranscribeResult, { ok: true }>["reason"], string> = {
  off: "Voice isn't set up yet. Type it for now.",
  busy: "Voice is busy right now. Type it for now, or try again in a few minutes.",
  empty: "I didn't catch that. Try again a bit closer to the mic.",
  failed: "That voice note didn't come through. Try again, or type it.",
};

/** Filename with the right extension, so Whisper knows the format. */
export function audioFilename(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("webm")) return "voice.webm";
  if (m.includes("ogg") || m.includes("opus")) return "voice.ogg";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "voice.m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "voice.mp3";
  if (m.includes("wav")) return "voice.wav";
  return "voice.webm";
}
