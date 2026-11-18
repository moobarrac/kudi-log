import { NextResponse } from "next/server";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

/** DELETE a balance update or money-in record (a typo, say). RLS keeps it to the user's own rows. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { id } = await params;
  const db = await supabaseServer();
  const { data, error } = await db.from("money_events").delete().eq("id", id).select("id").maybeSingle();
  if (error) {
    console.error("[api/money DELETE]", error);
    return NextResponse.json({ error: "We couldn't remove that. Try again." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "That's already gone. Refresh to see the latest." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
