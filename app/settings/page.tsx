import { ChevronRight, LogOut, Wallet } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BottomDock } from "@/components/BottomNav";
import { firstName } from "@/lib/auth";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { TelegramCard } from "./TelegramCard";

export const metadata: Metadata = { title: "Settings · Kudi Log" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  const name = firstName(user);
  const email = typeof user.email === "string" ? user.email : null;
  const db = await supabaseServer();
  const { data: profile } = await db.from("profiles").select("telegram_chat_id, nightly_summary").eq("id", user.sub).maybeSingle();

  return (
    <main className="mx-auto max-w-[480px] px-gutter pt-[max(24px,env(safe-area-inset-top))] pb-36">
      <h1 className="font-display text-h1 font-extrabold">Settings</h1>

      <section className="mt-6 flex items-center gap-4 rounded-card bg-surface p-4">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-lime font-display text-h3 font-extrabold text-on-lime">
          {(name ?? email ?? "?").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          {name && <p className="truncate font-semibold">{name}</p>}
          {email && <p className="truncate text-sm text-muted">{email}</p>}
        </div>
      </section>

      <h2 className="mt-8 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Money</h2>
      <Link href="/money" className="mt-2 flex items-center gap-3 rounded-card bg-surface px-4 py-3.5 hover:bg-surface-2">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-tile bg-emerald-tint text-emerald">
          <Wallet size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Money and budget</span>
          <span className="block text-sm text-muted">What you have, money in, and your monthly budget.</span>
        </span>
        <ChevronRight size={18} aria-hidden className="text-muted" />
      </Link>

      <TelegramCard
        linked={profile?.telegram_chat_id != null}
        nightly={profile?.nightly_summary ?? true}
        botUsername={process.env.TELEGRAM_BOT_USERNAME || null}
      />

      <form action="/auth/signout" method="post" className="mt-8">
        <button
          type="submit"
          className="flex h-btn w-full items-center justify-center gap-2 rounded-pill border-[1.5px] border-line bg-surface text-body font-semibold text-ink transition-colors hover:border-muted"
        >
          <LogOut size={18} aria-hidden />
          Sign out
        </button>
      </form>

      <BottomDock />
    </main>
  );
}
