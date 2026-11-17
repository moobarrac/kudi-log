import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let admin: SupabaseClient | null = null;

/**
 * Service-role client for the Telegram bot and the cron. It bypasses RLS, so every query
 * MUST filter by user_id. Never import this from a browser component.
 */
export function supabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const env = supabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (see docs/setup.md).");
  admin = createClient(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
