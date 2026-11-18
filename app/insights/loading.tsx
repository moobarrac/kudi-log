/** Skeleton for Insights: same shapes as the real screen. */
export default function InsightsLoading() {
  const bars = [40, 70, 35, 90, 55, 45, 30];
  return (
    <main aria-busy className="mx-auto max-w-[480px] px-gutter pt-[max(24px,env(safe-area-inset-top))] pb-36">
      <span className="sr-only">Loading insights…</span>
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded-pill bg-line" />
        <div className="h-11 w-40 rounded-pill bg-surface-2 ring-1 ring-line" />
      </div>
      <div className="mt-6 h-4 w-24 rounded-pill bg-line" />
      <div className="mt-2 h-11 w-48 animate-pulse rounded-row bg-line" />
      <div className="mt-2 h-4 w-52 rounded-pill bg-line" />
      <div className="mt-4 rounded-card border border-line bg-surface px-3.5 pt-4 pb-3">
        <div className="h-4 w-full rounded-pill bg-surface-2" />
        <div className="mt-3 flex h-[150px] items-end gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 animate-pulse rounded-[10px] bg-surface-2" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-3 h-16 rounded-card bg-hero" />
      <div className="mt-7 h-5 w-32 rounded-pill bg-line" />
      <div className="mt-2 h-40 animate-pulse rounded-card bg-surface" />
    </main>
  );
}
