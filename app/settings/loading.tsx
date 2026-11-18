export default function SettingsLoading() {
  return (
    <main aria-busy className="mx-auto max-w-[480px] px-gutter pt-[max(24px,env(safe-area-inset-top))] pb-36">
      <span className="sr-only">Loading settings…</span>
      <div className="h-8 w-36 animate-pulse rounded-pill bg-line" />
      <div className="mt-6 flex items-center gap-4 rounded-card bg-surface p-4">
        <div className="size-12 animate-pulse rounded-full bg-surface-2" />
        <div className="flex-1">
          <div className="h-4 w-24 rounded-pill bg-surface-2" />
          <div className="mt-2 h-3 w-40 rounded-pill bg-surface-2" />
        </div>
      </div>
      <div className="mt-8 h-3 w-20 rounded-pill bg-line" />
      <div className="mt-2 h-36 animate-pulse rounded-card bg-surface" />
    </main>
  );
}
