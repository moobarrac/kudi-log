/** Only allow same-site relative paths after sign-in ("/today"), never "//evil.com" or full URLs. */
export function safeNext(next: string | null | undefined, fallback = "/today"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

type ClaimsLike = { email?: string; user_metadata?: Record<string, unknown> } | null | undefined;

/** First name for greetings: Google name if we have it, else the start of the email. */
export function firstName(claims: ClaimsLike): string | null {
  const meta = claims?.user_metadata ?? {};
  const full = (meta.full_name ?? meta.name) as string | undefined;
  if (full?.trim()) return full.trim().split(/\s+/)[0];
  const local = claims?.email?.split("@")[0];
  if (!local) return null;
  const word = local.split(/[._\-+\d]/).find((w) => w.length > 1);
  return word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : null;
}

/** Turn Supabase auth errors into short, friendly copy. */
export function friendlyAuthError(err: { message?: string; code?: string; status?: number } | null): string {
  if (!err) return "Something went wrong. Please try again.";
  const code = err.code ?? "";
  if (err.status === 429 || code.includes("rate_limit")) {
    return "Too many emails for now. Wait a few minutes, or continue with Google.";
  }
  if (code === "otp_expired" || /expired|invalid/i.test(err.message ?? "")) {
    return "That code has expired or isn't right. Check the latest email, or send a new one.";
  }
  if (code === "email_address_invalid" || /email/i.test(err.message ?? "")) {
    return "That email doesn't look right. Check it and try again.";
  }
  return "We couldn't sign you in just now. Check your connection and try again.";
}
