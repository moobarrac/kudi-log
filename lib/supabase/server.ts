import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** Server client for server components, route handlers and actions. Uses the user's cookies, so RLS applies. */
export async function supabaseServer(): Promise<SupabaseClient> {
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase is not configured. Fill in .env.local (see docs/setup.md).");
  const store = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // Server components can't set cookies. The middleware refreshes the session, so this is safe to skip.
        }
      },
    },
  });
}

/** The signed-in user's verified JWT claims, or null. */
export async function currentUser() {
  if (!supabaseEnv()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}
