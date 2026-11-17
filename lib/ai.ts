import "server-only";

import { CATEGORY_KEYS, guessCategory, isCategory } from "./categories";
import { hasNumberHint, type ParsedItem } from "./parser";

/**
 * The only AI entry point. Turns pieces the rule parser couldn't read into {item, amount, category}.
 * The AI never does maths: one piece in, one item out, and code checks every field.
 *
 * Returns one result per piece, in order: a ParsedItem, or null when it can't be read
 * (no amount, AI off, rate limited, bad output...). Never throws.
 */
export async function parseWithAI(pieces: string[]): Promise<Array<ParsedItem | null>> {
  const results: Array<ParsedItem | null> = pieces.map(() => null);
  const todo: number[] = [];

  pieces.forEach((p, i) => {
    const key = cacheKey(p);
    if (!hasNumberHint(p)) return; // no amount anywhere: don't spend an AI call, ask the user instead
    if (cache.has(key)) results[i] = cache.get(key) ?? null;
    else todo.push(i);
  });
  if (todo.length === 0) return results;

  const provider = pickProvider();
  if (!provider) return results;

  let raw: unknown;
  try {
    raw = await provider(todo.map((i) => pieces[i]));
  } catch {
    return results; // network error, timeout, rate limit: the UI asks "How much was it?"
  }

  const items = extractItems(raw);
  todo.forEach((pieceIdx, n) => {
    const parsed = validateItem(items?.[n], pieces[pieceIdx]);
    results[pieceIdx] = parsed;
    remember(cacheKey(pieces[pieceIdx]), parsed);
  });
  return results;
}

// ---------- validation (exported for tests) ----------

const MAX_AMOUNT = 100_000_000;

export function extractItems(raw: unknown): unknown[] | null {
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    return (raw as { items: unknown[] }).items;
  }
  return null;
}

/** Accept an AI item only if every field is sane. The amount must be backed by a number in the user's text. */
export function validateItem(value: unknown, piece: string): ParsedItem | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const item = typeof v.item === "string" ? v.item.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 60) : "";
  if (!item || !/[a-z]/i.test(item)) return null;

  const amount = typeof v.amount === "number" ? v.amount : typeof v.amount === "string" ? Number(v.amount) : NaN;
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT) return null;
  if (!hasNumberHint(piece)) return null; // no number anywhere in the text: the AI made it up

  const category = isCategory(v.category) ? v.category : (guessCategory(item) ?? "other");
  return { item, amount, category };
}

// ---------- providers ----------

type Provider = (pieces: string[]) => Promise<unknown>;

const TIMEOUT_MS = 8000;

const SYSTEM_PROMPT = `You read short spending notes written by Nigerians and turn each one into JSON.
Input: a JSON array of strings. Output: {"items": [...]} with exactly one object per input string, in the same order.
Each object: {"item": string, "amount": integer or null, "category": string}.
- item: what was bought, 1-4 lowercase words, no amount in it.
- amount: whole naira as written ("2k" = 2000, "1.5k" = 1500, "two thousand" = 2000, "5 grand" = 5000). If no amount is stated, use null. Never guess, never add or multiply.
- category: one of ${CATEGORY_KEYS.join(", ")}.
Nigerian context: suya, amala, danfo, keke, okada, NEPA, DSTV, recharge card, offering, aso ebi and so on.
Return only the JSON object.`;

function pickProvider(): Provider | null {
  const choice = (process.env.AI_PROVIDER ?? "groq").toLowerCase();
  const groq = process.env.GROQ_API_KEY ? groqProvider : null;
  const gemini = process.env.GEMINI_API_KEY ? geminiProvider : null;
  return choice === "gemini" ? (gemini ?? groq) : (groq ?? gemini);
}

const groqProvider: Provider = async (pieces) => {
  const res = await fetch(`${process.env.GROQ_API_BASE || "https://api.groq.com/openai/v1"}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(pieces) },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`groq ${res.status}`);
  const data = await res.json();
  return JSON.parse(data?.choices?.[0]?.message?.content ?? "null");
};

const geminiProvider: Provider = async (pieces) => {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(pieces) }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  return JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "null");
};

// ---------- cache: the same odd phrase is never sent twice (per server instance) ----------

const CACHE_MAX = 500;
const cache = new Map<string, ParsedItem | null>();

function cacheKey(piece: string): string {
  return piece.toLowerCase().replace(/\s+/g, " ").trim();
}

function remember(key: string, value: ParsedItem | null) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
}

/** Test helper. */
export function __clearAICache() {
  cache.clear();
}
