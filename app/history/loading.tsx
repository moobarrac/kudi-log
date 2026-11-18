export default function HistoryLoading() {
  return (
    <main aria-busy className="mx-auto max-w-[480px] px-gutter pt-[max(24px,env(safe-area-inset-top))] pb-36">
      <span className="sr-only">Loading history…</span>
      <div className="h-8 w-32 animate-pulse rounded-pill bg-line" />
      <div className="mt-5 h-12 rounded-card border-[1.5px] border-line bg-surface" />
      <div className="mt-3 flex gap-2">
        {[80, 96, 92, 76].map((w, i) => (
          <div key={i} className="h-9 rounded-pill bg-line" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-4 h-[104px] rounded-card bg-hero" />
      {[0, 1].map((g) => (
        <div key={g} className="mt-6">
          <div className="h-4 w-28 rounded-pill bg-line" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="mt-2 flex h-16 items-center gap-3 rounded-row bg-surface px-3">
              <div className="size-10 animate-pulse rounded-tile bg-surface-2" />
              <div className="h-4 flex-1 rounded-pill bg-surface-2" />
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
