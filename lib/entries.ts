import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseWithAI } from "./ai";
import { type ParsedItem, ruleParse } from "./parser";
import type { Entry } from "./types";

export type ResolveResult = {
  items: Array<ParsedItem & { via: "rules" | "ai" }>;
  /** Pieces nobody could read. The UI asks "How much was it?". */
  unresolved: string[];
};

type AIFn = (pieces: string[]) => Promise<Array<ParsedItem | null>>;

/** Rules first, AI second, only for the leftovers. Pure apart from the AI call, so it's easy to test. */
export async function resolveText(text: string, ai: AIFn = parseWithAI): Promise<ResolveResult> {
  const { items, unparsed } = ruleParse(text);
  const out: ResolveResult = { items: items.map((i) => ({ ...i, via: "rules" as const })), unresolved: [] };
  if (unparsed.length === 0) return out;

  const fromAI = await ai(unparsed);
  unparsed.forEach((piece, i) => {
    const r = fromAI[i];
    if (r) out.items.push({ ...r, via: "ai" });
    else out.unresolved.push(piece);
  });
  return out;
}

export type LogResult = { entries: Entry[]; unresolved: string[] };

/**
 * Parse a message and save what we could read.
 * `db` is the user's client (web, RLS applies) or the admin client (bot), so user_id is always set explicitly.
 */
export async function logText(
  db: SupabaseClient,
  userId: string,
  text: string,
  source: Entry["source"],
  day: string,
): Promise<LogResult> {
  const { items, unresolved } = await resolveText(text);
  if (items.length === 0) return { entries: [], unresolved };

  const rows = items.map((i) => ({
    user_id: userId,
    item: i.item,
    amount: i.amount,
    category: i.category,
    spent_on: day,
    source,
    raw_text: text.slice(0, 500),
  }));

  const { data, error } = await db.from("entries").insert(rows).select();
  if (error) throw new Error(`insert failed: ${error.message}`);
  return { entries: (data ?? []) as Entry[], unresolved };
}
