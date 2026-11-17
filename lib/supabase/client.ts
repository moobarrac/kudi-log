import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let client: SupabaseClient | null = null;

/** Browser client (one per tab). Uses the user's session, so RLS scopes every query. */
export function supabaseBrowser(): SupabaseClient {
  if (client) return client;
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase is not configured. Fill in .env.local (see docs/setup.md).");
  client = createBrowserClient(env.url, env.anonKey);
  return client;
}
