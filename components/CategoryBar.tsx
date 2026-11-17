import { categoryLabel } from "@/lib/categories";
import { naira } from "@/lib/money";
import { categoryStyle } from "./category-style";

export type CategoryTotal = { category: string; amount: number };

/** Segmented bar + legend for the hero card. Expects totals sorted biggest first. */
export function CategoryBar({ totals, legendMax = 4 }: { totals: CategoryTotal[]; legendMax?: number }) {
  const sum = totals.reduce((s, t) => s + t.amount, 0);
  if (sum <= 0) {
    return <div className="h-2 rounded-pill bg-ink-raised" aria-hidden />;
  }
  const description = totals.map((t) => `${categoryLabel(t.category)} ${naira(t.amount)}`).join(", ");

  return (
    <figure className="m-0">
      <div role="img" aria-label={`Spending by category: ${description}`} className="flex h-2 gap-[3px]">
        {totals.map((t) => (
          <span
            key={t.category}
            className="h-full rounded-pill transition-[flex-grow] duration-[400ms] ease-out"
            style={{ flexGrow: t.amount, flexBasis: 0, minWidth: 6, background: categoryStyle(t.category).dot }}
          />
        ))}
      </div>
      <figcaption aria-hidden className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-on-ink-muted">
        {totals.slice(0, legendMax).map((t) => (
          <span key={t.category} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: categoryStyle(t.category).dot }} />
            {categoryLabel(t.category)}
          </span>
        ))}
        {totals.length > legendMax && <span>+{totals.length - legendMax} more</span>}
      </figcaption>
    </figure>
  );
}
