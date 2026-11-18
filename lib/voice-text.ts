// Turns what speech-to-text hears into the shape the rule parser expects. Pure, shared by web and bot.
//
// Speech engines punctuate like prose ("Suya, 2,000. Keke 1500.") or not at all ("suya 2000 transport 1500").
// The parser splits on commas and "and", so: commas between an item and its amount are removed, sentence
// ends become separators, and a new item that follows an amount gets a comma in front of it.

const NUMBER_WORD =
  "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million";
/** A piece that is nothing but an amount: "2,000", "1.5k", "one thousand five hundred", "2000 naira". */
const AMOUNT_ONLY = new RegExp(
  `^(?:₦|n|#)?\\s?(?:\\d[\\d,]*(?:\\.\\d+)?\\s?(?:k|m)?|(?:(?:${NUMBER_WORD}|and)\\s?)+)\\s*(?:naira|ngn|only)?$`,
  "i",
);
/** Ends with an amount already, so a following amount is a new item, not this one's. */
const ENDS_WITH_AMOUNT = new RegExp(`(?:\\d[\\d,]*(?:\\.\\d+)?\\s?(?:k|m)?|\\b(?:${NUMBER_WORD}))\\s*(?:naira|ngn|only)?$`, "i");

const STARTS_WITH_AMOUNT = new RegExp(`^(?:₦|n|#)?\\s?\\d|^(?:${NUMBER_WORD})\\b`, "i");
const HAS_AMOUNT = new RegExp(`\\d|\\b(?:${NUMBER_WORD})\\b`, "i");

/** Words that belong to the amount before them ("2k for suya", "1500 naira"), so no split there. */
const KEEPS_AMOUNT = /^(naira|ngn|k|m|thousand|hundred|grand|million|only|for|on|worth|of|at|to|and)$/i;

/** Whisper's well-known "hallucinations" on silence or noise. */
const SILENCE = /^(thank you|thanks|thanks for watching|you|bye|okay|ok|hmm|uh|um)[.!]?$/i;

/** Commas that are thousands separators ("2,000") stay; every other comma is a split point. */
const SPLIT_COMMA = /\s*,(?!\d{3}(?:\D|$))\s*/;

export function cleanTranscript(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  if (!t || SILENCE.test(t)) return "";

  // Sentence ends become separators. "1.5k" is safe: its dot isn't followed by a space.
  t = t.replace(/[.!?;]+(?=\s|$)/g, ",");

  // "Suya, 2,000" -> "Suya 2,000". An amount belongs to the item before it when that piece is only an amount,
  // or when the item before has no amount of its own ("Keke, 1,500 and data" -> "Keke 1,500 and data").
  // "2k for suya, 1500 for keke" stays apart: the first piece already has its amount.
  const pieces = t.split(SPLIT_COMMA).map((p) => p.trim()).filter(Boolean);
  const merged: string[] = [];
  for (const p of pieces) {
    const prev = merged[merged.length - 1];
    const joins =
      prev !== undefined &&
      ((AMOUNT_ONLY.test(p) && !ENDS_WITH_AMOUNT.test(prev)) || (STARTS_WITH_AMOUNT.test(p) && !HAS_AMOUNT.test(prev)));
    if (joins) {
      merged[merged.length - 1] = `${prev} ${p}`;
    } else {
      merged.push(p);
    }
  }

  // "suya 2000 transport 1500" -> "suya 2000, transport 1500"
  const split = merged.map((p) =>
    p.replace(/(\d[\d,]*(?:\.\d+)?\s?(?:k|m)?)\s+([a-z][\w'-]*)/gi, (whole, amount: string, next: string) =>
      KEEPS_AMOUNT.test(next) ? whole : `${amount}, ${next}`,
    ),
  );

  return split.join(", ").replace(/\s*,\s*,+/g, ",").replace(/^[,\s]+|[,\s]+$/g, "");
}

/** Append heard text to whatever is already typed. */
export function appendSpoken(current: string, spoken: string): string {
  const base = current.trim().replace(/,$/, "");
  if (!spoken) return current;
  return base ? `${base}, ${spoken}` : spoken;
}

export type VoiceMode = "speech" | "record" | null;

/**
 * Which voice path a device gets:
 * - "speech": the browser's own recognition (live words, ₦0). Chrome on Android and desktop.
 * - "record": record a clip and transcribe it on the server (Groq Whisper, free tier). iPhone, Firefox, or
 *   when the browser's recognition failed before.
 * - null: no microphone support at all, so no mic button.
 */
export function pickVoiceMode(env: { speech: boolean; recorder: boolean; ios: boolean; speechFailed?: boolean }): VoiceMode {
  // iOS Safari has the API, but it's unreliable (stops on its own, often silent in home-screen apps).
  if (env.speech && !env.ios && !env.speechFailed) return "speech";
  if (env.recorder) return "record";
  return null;
}
