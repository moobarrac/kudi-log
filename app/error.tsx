"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { PillButton, pillClasses } from "@/components/PillButton";

/** Any screen that throws lands here: plain words, a retry, and a way home. Nothing technical on screen. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-gutter py-12">
      <section className="rounded-card-lg bg-surface p-6">
        <p className="font-display text-h1 font-extrabold">That didn't load</p>
        <p className="mt-2 text-muted">
          Something went wrong on our side. Your entries are safe. Try again, and if it keeps happening, give it a minute.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <PillButton block onClick={reset} icon={<RotateCw size={18} aria-hidden />}>
            Try again
          </PillButton>
          <Link href="/today" className={pillClasses("outline", { block: true })}>
            Back to Today
          </Link>
        </div>
        {error.digest && <p className="mt-4 text-center text-xs text-muted">Reference: {error.digest}</p>}
      </section>
    </main>
  );
}
