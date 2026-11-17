"use client";

import { Send } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import { CategoryChip } from "./CategoryChip";
import { GoogleIcon } from "./GoogleIcon";
import { PillButton } from "./PillButton";

// Loaded on first tap: keeps Supabase and the sheet library out of the first paint.
const EmailSignInSheet = dynamic(() => import("./EmailSignInSheet").then((m) => m.EmailSignInSheet), { ssr: false });

type Props = {
  next: string;
  error: string | null;
  telegramUrl: string | null;
  configured: boolean;
};

const ERRORS: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Send a new one.",
  cancelled: "Sign-in was cancelled. You can try again any time.",
  config: "Sign-in isn't set up yet. Check .env.local.",
};

export function Welcome({ next, error, telegramUrl, configured }: Props) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailUsed, setEmailUsed] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(error ? (ERRORS[error] ?? ERRORS.link) : null);

  async function google() {
    setMessage(null);
    setGoogleBusy(true);
    try {
      const { supabaseBrowser } = await import("@/lib/supabase/client");
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
      // The browser is now leaving for Google; keep the button in its busy state.
    } catch {
      setGoogleBusy(false);
      setMessage(configured ? "We couldn't reach Google just now. Try again, or use your email." : ERRORS.config);
    }
  }

  // Cards rise in with CSS (no JS needed), staggered.
  const card = (i: number) => ({
    style: { "--delay": `${80 + i * 90}ms`, "--rise": "28px", "--rise-scale": "0.94", "--rise-duration": "600ms" } as React.CSSProperties,
  });

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-hero text-on-ink">
      {/* soft lime glow behind the cards */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[8%] left-1/2 size-[420px] -translate-x-1/2 rounded-full opacity-[0.13] blur-[90px]"
        style={{ background: "var(--lime)" }}
      />

      <div className="relative mx-auto flex w-full max-w-[480px] flex-1 flex-col px-gutter pt-[max(20px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
        <p className="flex items-center gap-2 font-display text-h3 font-extrabold tracking-tight">
          <span aria-hidden className="size-2.5 rounded-full bg-lime" />
          Kudi Log
        </p>

        {/* Three tilted sample cards */}
        <div aria-hidden className="cats-light relative mx-auto mt-6 h-[268px] w-full max-w-[340px] flex-none">
          <div
            {...card(0)}
            className="animate-rise absolute top-2 left-0 w-[58%] -rotate-[7deg] rounded-card bg-on-ink p-4 text-on-lime shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)]"
          >
            <CategoryChip category="food" />
            <p className="mt-3 text-sm text-on-lime/60">Suya</p>
            <p className="font-display text-h1 font-extrabold tracking-tight">{naira(2000)}</p>
          </div>
          <div
            {...card(1)}
            className="animate-rise absolute top-10 right-0 w-[52%] rotate-[6deg] rounded-card bg-on-ink p-4 text-on-lime shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)]"
          >
            <CategoryChip category="transport" />
            <p className="mt-3 text-sm text-on-lime/60">Danfo</p>
            <p className="font-display text-h1 font-extrabold tracking-tight">{naira(800)}</p>
          </div>
          <div
            {...card(2)}
            className="animate-rise absolute bottom-0 left-1/2 w-[76%] -translate-x-1/2 -rotate-[2deg] rounded-card-lg bg-lime px-5 py-4 text-on-lime shadow-[0_24px_50px_-20px_rgb(0_0_0/0.7)]"
          >
            <p className="text-sm font-medium">Spent today</p>
            <p className="font-display text-[44px] leading-none font-extrabold tracking-[-0.045em]">
              <span className="mr-[0.04em] align-[0.12em] text-[0.62em]">₦</span>12,700
            </p>
            <div className="mt-3 flex h-1.5 gap-[3px]">
              {["food", "transport", "bills", "data"].map((c, i) => (
                <span key={c} className="rounded-pill" style={{ flexGrow: [5, 3, 2, 1][i], background: `var(--cat-${c}-ink)` }} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <h1
            style={{ "--delay": "300ms", "--rise-duration": "500ms" } as React.CSSProperties}
            className="animate-rise font-display text-[40px] leading-[1.02] font-extrabold tracking-[-0.04em]"
          >
            Know where your money went. <span className="text-lime">Every day.</span>
          </h1>
          <p className="mt-3 text-body text-on-ink-muted">
            Type it the way you'd say it, like “suya 2k, transport 1,500”. We do the maths.
          </p>

          {message && (
            <p role="alert" className="mt-5 rounded-row border border-ink-line bg-ink-raised px-4 py-3 text-sm text-on-ink-soft">
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <PillButton block onClick={google} disabled={googleBusy} icon={<GoogleIcon />}>
              {googleBusy ? "Opening Google…" : "Continue with Google"}
            </PillButton>
            <PillButton block variant="outline-on-ink" onClick={() => {
                setEmailUsed(true);
                setEmailOpen(true);
              }}>
              Use my email instead
            </PillButton>
          </div>

          {telegramUrl && (
            <p className="mt-5 text-center text-sm text-on-ink-muted">
              Prefer chat?{" "}
              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className={cn("inline-flex min-h-tap items-center gap-1.5 font-semibold text-good-on-ink underline-offset-4 hover:underline")}
              >
                <Send size={14} aria-hidden /> Start on Telegram
              </a>
            </p>
          )}
          {!configured && (
            <p className="mt-4 text-center text-xs text-on-ink-muted">Dev note: Supabase keys missing. See docs/setup.md.</p>
          )}
        </div>
      </div>

      {emailUsed && <EmailSignInSheet open={emailOpen} onOpenChange={setEmailOpen} next={next} />}
    </main>
  );
}
