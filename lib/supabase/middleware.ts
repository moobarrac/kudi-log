import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "./env";

/** Pages that need a signed-in user. */
const PROTECTED = ["/today", "/insights", "/history", "/money", "/settings", "/summary"];

/**
 * Refreshes the Supabase session cookie on every page request, and redirects:
 * signed-out users away from app pages, signed-in users from Welcome to Today.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = supabaseEnv();
  if (!env) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });

  // getClaims() verifies the JWT (and refreshes it when needed). Don't put code between createServerClient and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (path === "/") url.searchParams.set("next", pathname + search);
    const res = NextResponse.redirect(url);
    // Keep any refreshed cookies on the redirect.
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return redirectTo("/");
  }
  if (signedIn && pathname === "/") {
    return redirectTo("/today");
  }
  return response;
}
