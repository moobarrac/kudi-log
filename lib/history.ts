import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Range } from "./periods";
import type { Entry } from "./types";

export const PAGE_SIZE = 60;

/** Where the next page starts: newest first, so "older than this row". */
export type Cursor = { day: string; at: string };

export type HistoryPage = { entries: Entry[]; next: Cursor | null };

/** Escape LIKE wildcards so "50%" or "a_b" search for themselves. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * One page of the user's entries, newest first. Keyset paging (spent_on, created_at) so it stays fast and
 * never skips rows when new entries are added meanwhile. `db` is the user's client: RLS scopes it.
 */
export async function listEntries(
  db: SupabaseClient,
  opts: { q: string | null; range: Range; cursor: Cursor | null; limit?: number },
): Promise<HistoryPage> {
  const limit = opts.limit ?? PAGE_SIZE;
  let query = db
    .from("entries")
    .select("*")
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (opts.q) query = query.ilike("item", likePattern(opts.q));
  if (opts.range.from) query = query.gte("spent_on", opts.range.from);
  if (opts.range.to) query = query.lte("spent_on", opts.range.to);
  if (opts.cursor) {
    const { day, at } = opts.cursor;
    query = query.or(`spent_on.lt.${day},and(spent_on.eq.${day},created_at.lt."${at}")`);
  }
  const { data, error } = await query;
  if (error) throw new Error(`history load failed: ${error.message}`);
  const rows = (data ?? []) as Entry[];
  const more = rows.length > limit;
  const entries = more ? rows.slice(0, limit) : rows;
  const last = entries[entries.length - 1];
  return { entries, next: more && last ? { day: last.spent_on, at: last.created_at } : null };
}

/** Total and count for the same filter, across everything (not just the loaded page). Summed in Postgres. */
export async function totalFor(db: SupabaseClient, q: string | null, range: Range): Promise<{ total: number; count: number }> {
  const { data, error } = await db.rpc("spend_total", { q, from_day: range.from, to_day: range.to });
  if (error) throw new Error(`history total failed: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as { total: number; entries: number } | null;
  return { total: Number(row?.total ?? 0), count: Number(row?.entries ?? 0) };
}
