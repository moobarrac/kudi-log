import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Where Google and magic links land.
 * - Google / PKCE magic link: ?code=...
 * - Email template with token_hash (works across browsers): ?token_hash=...&type=email
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const fail = (reason: string) => NextResponse.redirect(new URL(`/?error=${reason}`, url.origin));

  if (url.searchParams.get("error")) return fail("cancelled");

  try {
    const supabase = await supabaseServer();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return fail("link");
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) return fail("link");
    } else {
      return fail("link");
    }
  } catch {
    return fail("config");
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
