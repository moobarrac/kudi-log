"use client";

import { ArrowLeft, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useState } from "react";
import { friendlyAuthError } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PillButton } from "./PillButton";
import { Sheet } from "./Sheet";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; next: string };

const RESEND_AFTER = 45; // seconds
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Email sign-in: we send one email with both a magic link and a code.
 * The code matters for the installed PWA on iPhone, where a link would open in Safari instead.
 */
export function EmailSignInSheet({ open, onOpenChange, next }: Props) {
  const router = useRouter();
  const formId = useId();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendEmail() {
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setError("That email doesn't look right. Check it and try again.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        email: clean,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) setError(friendlyAuthError(error));
      else {
        setEmail(clean);
        setStep("code");
        setWait(RESEND_AFTER);
      }
    } catch {
      setError("Sign-in isn't set up yet. Check .env.local.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabaseBrowser().auth.verifyOtp({ email, token: code, type: "email" });
      if (error) {
        setError(friendlyAuthError(error));
        setBusy(false);
        return;
      }
      navigator.vibrate?.(10);
      router.replace(next);
      router.refresh();
    } catch {
      setError("We couldn't sign you in just now. Check your connection and try again.");
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (step === "email") sendEmail();
    else if (code.length >= 6) verifyCode();
  }

  function close(o: boolean) {
    onOpenChange(o);
    if (!o) setError(null);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={close}
      title={step === "email" ? "Use your email" : "Check your inbox"}
      footer={
        <PillButton form={formId} type="submit" block disabled={busy || (step === "code" && code.length < 6)}>
          {step === "email" ? (busy ? "Sending…" : "Email me a sign-in code") : busy ? "Signing you in…" : "Sign in"}
        </PillButton>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate>
        {step === "email" ? (
          <>
            <p className="text-body text-muted">No password needed. We'll email you a link and a 6-digit code.</p>
            <label htmlFor="email" className="mt-5 block text-sm font-medium text-muted-strong">
              Your email
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "auth-error" : undefined}
              className="mt-2 h-btn w-full rounded-card border-2 border-ink bg-surface px-4 text-h3 text-ink outline-none placeholder:text-muted"
            />
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-row border border-line bg-surface p-3.5 text-ink">
              <Mail size={20} className="mt-0.5 shrink-0 text-emerald" />
              <p className="text-sm">
                Sent to <span className="font-semibold">{email}</span>. Tap the link in the email, or type the code here.
              </p>
            </div>
            <label htmlFor="code" className="mt-5 block text-sm font-medium text-muted-strong">
              Code from the email
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={10}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "auth-error" : undefined}
              className="mt-2 h-16 w-full rounded-card border-2 border-ink bg-surface px-4 text-center font-display text-h1 font-bold tracking-[0.35em] text-ink tabular-nums outline-none placeholder:text-line"
            />
            <div className="mt-3 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                className="inline-flex h-tap items-center gap-1.5 font-medium text-muted-strong"
              >
                <ArrowLeft size={16} /> Different email
              </button>
              <button
                type="button"
                disabled={wait > 0 || busy}
                onClick={sendEmail}
                className="h-tap font-semibold text-emerald disabled:font-medium disabled:text-muted"
              >
                {wait > 0 ? `Resend in ${wait}s` : "Resend email"}
              </button>
            </div>
          </>
        )}
        {error && (
          <p id="auth-error" role="alert" className="mt-4 rounded-row bg-warn-bg px-3.5 py-3 text-sm text-warn-ink">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
