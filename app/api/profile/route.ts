import { NextResponse } from "next/server";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

/**
 * PATCH { nightly_summary?: boolean, monthly_budget?: number | null }.
 * The user's own session: RLS and column grants allow only these (and the name).
 */
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const patch: { nightly_summary?: boolean; monthly_budget?: number | null } = {};

  if (body && "nightly_summary" in body) {
    if (typeof body.nightly_summary !== "boolean") return bad();
    patch.nightly_summary = body.nightly_summary;
  }
  if (body && "monthly_budget" in body) {
    const b = body.monthly_budget;
    if (b !== null && (!Number.isInteger(b) || b < 1 || b > 1_000_000_000)) {
      return NextResponse.json({ error: "A budget is whole naira, like 150,000." }, { status: 400 });
    }
    patch.monthly_budget = b;
  }
  if (Object.keys(patch).length === 0) return bad();

  const db = await supabaseServer();
  const { error } = await db.from("profiles").update(patch).eq("id", user.sub);
  if (error) {
    console.error("[api/profile]", error);
    return NextResponse.json({ error: "We couldn't save that. Try again." }, { status: 500 });
  }
  return NextResponse.json(patch);
}

function bad() {
  return NextResponse.json({ error: "That didn't come through. Try again." }, { status: 400 });
}
