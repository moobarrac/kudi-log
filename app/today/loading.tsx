/** Skeleton while Today's entries load. Same shapes as the real screen, so nothing jumps. */
export default function TodayLoading() {
  return (
    <main aria-busy className="mx-auto max-w-[480px] px-gutter pt-[max(24px,env(safe-area-inset-top))] pb-52">
      <span className="sr-only">Loading today…</span>
      <div className="h-4 w-24 animate-pulse rounded-pill bg-line" />
      <div className="mt-2 h-8 w-56 animate-pulse rounded-pill bg-line" />
      <div className="mt-6 rounded-card-lg bg-hero p-5">
        <div className="h-4 w-20 rounded-pill bg-ink-raised" />
        <div className="mt-3 h-14 w-44 animate-pulse rounded-row bg-ink-raised" />
        <div className="mt-3 h-4 w-28 rounded-pill bg-ink-raised" />
        <div className="mt-5 h-2 rounded-pill bg-ink-raised" />
      </div>
      <div className="mt-8 h-5 w-32 rounded-pill bg-line" />
      <div className="mt-3 flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-16 items-center gap-3 rounded-row bg-surface px-3">
            <div className="size-10 animate-pulse rounded-tile bg-surface-2" />
            <div className="flex-1">
              <div className="h-4 w-24 animate-pulse rounded-pill bg-surface-2" />
              <div className="mt-1.5 h-3 w-16 rounded-pill bg-surface-2" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-pill bg-surface-2" />
          </div>
        ))}
      </div>
    </main>
  );
}
