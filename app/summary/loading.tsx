/** The summary is full-screen ink, so its skeleton is too (no white flash before it). */
export default function SummaryLoading() {
  return (
    <main aria-busy className="min-h-dvh bg-hero">
      <div className="mx-auto max-w-[480px] px-5 pt-[max(16px,env(safe-area-inset-top))]">
        <span className="sr-only">Loading your day…</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-[3px] flex-1 rounded-[2px] bg-ink-line" />
          ))}
        </div>
        <div className="mt-5 h-4 w-40 rounded-pill bg-ink-raised" />
        <div className="mt-2 h-6 w-48 rounded-pill bg-ink-raised" />
        <div className="mt-12 h-4 w-24 rounded-pill bg-ink-raised" />
        <div className="mt-3 h-[72px] w-64 animate-pulse rounded-row bg-ink-raised" />
        <div className="mt-6 h-[68px] animate-pulse rounded-[20px] bg-ink-raised" />
      </div>
    </main>
  );
}
