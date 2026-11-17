import { categoryLabel } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { categoryStyle } from "./category-style";

type Props = {
  category: string;
  /** Renders as a button (for pickers) when given. */
  onClick?: () => void;
  selected?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/** Category label with its icon on the category tint. Never colour alone. */
export function CategoryChip({ category, onClick, selected, size = "sm", className }: Props) {
  const s = categoryStyle(category);
  const Icon = s.icon;
  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-pill font-medium whitespace-nowrap",
    size === "md" ? "h-tap px-4 text-sm" : "h-7 px-2.5 text-xs",
    onClick && "transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.97]",
    selected && "ring-2 ring-ink ring-offset-2 ring-offset-paper",
    className,
  );
  const content = (
    <>
      <Icon aria-hidden size={size === "md" ? 16 : 13} strokeWidth={2} />
      {categoryLabel(category)}
    </>
  );
  const style = { background: s.tint, color: s.ink };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={classes} style={style}>
        {content}
      </button>
    );
  }
  return (
    <span className={classes} style={style}>
      {content}
    </span>
  );
}

/** Square icon tile used at the start of entry rows. */
export function CategoryTile({ category, size = 40 }: { category: string; size?: number }) {
  const s = categoryStyle(category);
  const Icon = s.icon;
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-tile"
      style={{ width: size, height: size, background: s.tint, color: s.ink }}
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={2} />
    </span>
  );
}
