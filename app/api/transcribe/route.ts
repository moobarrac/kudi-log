import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { audioFilename, MAX_AUDIO_BYTES, TRANSCRIBE_MESSAGE, transcribe } from "@/lib/transcribe";

export const maxDuration = 30;

// The Groq free tier is shared by everyone, so one person can't use it all up.
// Per server instance (good enough for a handful of users; resets on deploy).
const WINDOW_MS = 10 * 60 * 1000;
const PER_WINDOW = 20;
const recent = new Map<string, number[]>();

function allow(userId: string): boolean {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= PER_WINDOW) return false;
  hits.push(now);
  recent.set(userId, hits);
  return true;
}

/** POST multipart { audio } -> { text } (cleaned, ready for the quick log box). The audio isn't stored. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("audio");
    audio = f instanceof File ? f : null;
  } catch {
    // fall through
  }
  if (!audio || audio.size === 0) return NextResponse.json({ error: TRANSCRIBE_MESSAGE.empty }, { status: 400 });
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "That voice note is too long. Keep it under 30 seconds." }, { status: 413 });
  }
  if (!allow(user.sub)) return NextResponse.json({ error: TRANSCRIBE_MESSAGE.busy }, { status: 429 });

  const result = await transcribe(audio, audioFilename(audio.type));
  if (!result.ok) {
    const status = result.reason === "off" ? 503 : result.reason === "busy" ? 429 : result.reason === "empty" ? 422 : 502;
    return NextResponse.json({ error: TRANSCRIBE_MESSAGE[result.reason] }, { status });
  }
  return NextResponse.json({ text: result.text });
}
