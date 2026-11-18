import Link from "next/link";
import { pillClasses } from "@/components/PillButton";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-gutter py-12">
      <section className="rounded-card-lg bg-hero p-6 text-on-ink">
        <p className="font-display text-[56px] leading-none font-extrabold tracking-[-0.04em] text-lime">404</p>
        <p className="mt-4 font-display text-h2 font-bold">This page isn't here</p>
        <p className="mt-2 text-on-ink-soft">The link may be old or mistyped. Your spending is where you left it.</p>
        <Link href="/today" className={`${pillClasses("lime", { block: true })} mt-6`}>
          Go to Today
        </Link>
      </section>
    </main>
  );
}
