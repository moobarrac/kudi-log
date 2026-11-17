import { NextResponse } from "next/server";
import { lagosDay } from "@/lib/dates";
import { cleanPatch } from "@/lib/entry-input";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const GONE = "That entry is no longer there. Refresh to see the latest.";

/** PATCH { item?, amount?, category?, spent_on? } -> { entry }. RLS keeps it to the user's own rows. */
export async function PATCH(request: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const patch = cleanPatch(body, lagosDay());
  if (!patch.ok) return NextResponse.json({ error: patch.error }, { status: 400 });

  const db = await supabaseServer();
  const { data, error } = await db.from("entries").update(patch.value).eq("id", id).select().maybeSingle();
  if (error) {
    console.error("[api/entries PATCH]", error);
    return NextResponse.json({ error: "We couldn't save that change. Try again." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: GONE }, { status: 404 });
  return NextResponse.json({ entry: data });
}

/** DELETE -> { entry } (the deleted row, so the browser can offer Undo). */
export async function DELETE(_request: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { id } = await params;

  const db = await supabaseServer();
  const { data, error } = await db.from("entries").delete().eq("id", id).select().maybeSingle();
  if (error) {
    console.error("[api/entries DELETE]", error);
    return NextResponse.json({ error: "We couldn't delete that. Try again." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: GONE }, { status: 404 });
  return NextResponse.json({ entry: data });
}
