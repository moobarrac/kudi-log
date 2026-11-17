"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { naira, nairaDigits } from "@/lib/money";

type Props = {
  amount: number;
  /** "today" is 56px, "summary" is 76px. */
  size?: "today" | "summary";
  className?: string;
};

const DURATION = 400;
/** Close to --ease-out (cubic-bezier(0.22, 1, 0.36, 1)). */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * The big lime money number. The server renders the real amount (so it paints at once, before any JS);
 * after that it counts up to each new value in 400ms. Plain requestAnimationFrame, no animation library.
 */
export function HeroTotal({ amount, size = "today", className }: Props) {
  const [shown, setShown] = useState(amount);
  const from = useRef(amount);

  useEffect(() => {
    const start = from.current;
    if (start === amount) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = amount;
      setShown(amount);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      const v = Math.round(start + (amount - start) * easeOut(t));
      from.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [amount]);

  // Shrink to fit big totals (₦1,268,400) on a phone. Sized from the final amount so it doesn't jump while counting.
  // ~0.6em per character of Bricolage 800; the gutters are the screen padding (+ card padding on Today).
  const chars = nairaDigits(amount).length + 0.7;
  const cap = size === "summary" ? 76 : 56;
  const gutters = size === "summary" ? 40 : 72;
  const fontSize = `min(${cap}px, calc((min(100vw, 480px) - ${gutters}px) / ${(chars * 0.6).toFixed(2)}))`;

  return (
    <p
      style={{ fontSize }}
      className={cn(
        "font-display font-extrabold tabular-nums text-lime",
        size === "summary" ? "text-total-lg" : "text-total",
        className,
      )}
    >
      {/* Screen readers get the final amount once, not every frame of the count-up. */}
      <span className="sr-only">{naira(amount)}</span>
      <span aria-hidden className="mr-[0.04em] align-[0.12em] text-[0.62em] font-bold tracking-normal">
        ₦
      </span>
      <span aria-hidden>{nairaDigits(shown)}</span>
    </p>
  );
}
