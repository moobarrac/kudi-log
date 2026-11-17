import { NextResponse } from "next/server";
import { lagosDay } from "@/lib/dates";
import { cleanRestore } from "@/lib/entry-input";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

/** POST <deleted entry> -> { entry }. Undo for a delete: the row comes back with its id and time. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const row = cleanRestore(body, lagosDay());
  if (!row.ok) return NextResponse.json({ error: row.error }, { status: 400 });

  const db = await supabaseServer();
  // upsert so a double-tapped Undo doesn't fail on the second insert.
  const { data, error } = await db
    .from("entries")
    .upsert({ ...row.value, user_id: user.sub }, { onConflict: "id" })
    .select()
    .single();
  if (error) {
    console.error("[api/entries/restore]", error);
    return NextResponse.json({ error: "We couldn't bring that back. Log it again." }, { status: 500 });
  }
  return NextResponse.json({ entry: data });
}
