import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline · Kudi Log" };
export const dynamic = "force-static"; // cached by the service worker at install

/** Shown by the service worker when there's no network and no saved copy of the page. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-gutter py-12">
      <section className="rounded-card-lg bg-hero p-6 text-on-ink">
        <span aria-hidden className="grid size-12 place-items-center rounded-tile bg-ink-raised text-lime">
          <WifiOff size={22} />
        </span>
        <h1 className="mt-5 font-display text-h2 font-extrabold">You're offline</h1>
        <p className="mt-2 text-on-ink-soft">
          Your entries are safe. Once you're back on data or Wi-Fi, Kudi Log picks up where you left off.
        </p>
        {/* A plain link: a full reload is what we want here. */}
        <a href="/today" className="mt-6 flex h-btn items-center justify-center rounded-pill bg-lime font-semibold text-on-lime">
          Try again
        </a>
      </section>
    </main>
  );
}
