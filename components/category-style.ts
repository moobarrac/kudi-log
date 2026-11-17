import {
  Bus,
  Dices,
  Gift,
  Lightbulb,
  type LucideIcon,
  Package,
  PartyPopper,
  Pill,
  ShoppingBag,
  ShoppingBasket,
  Users,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
import { type Category, isCategory } from "@/lib/categories";

type CategoryStyle = {
  icon: LucideIcon;
  /** Chip / tile background */
  tint: string;
  /** Chip text and icon colour */
  ink: string;
  /** Charts, legends, the segmented bar */
  dot: string;
};

// The token prefix in design/tokens.css. Only airtime_data differs from its key.
const TOKEN: Record<Category, string> = {
  food: "food",
  transport: "transport",
  airtime_data: "data",
  bills: "bills",
  groceries: "groceries",
  shopping: "shopping",
  health: "health",
  family: "family",
  gifts: "gifts",
  fun: "fun",
  betting: "betting",
  other: "other",
};

const ICON: Record<Category, LucideIcon> = {
  food: UtensilsCrossed,
  transport: Bus,
  airtime_data: Wifi,
  bills: Lightbulb,
  groceries: ShoppingBasket,
  shopping: ShoppingBag,
  health: Pill,
  family: Users,
  gifts: Gift,
  fun: PartyPopper,
  betting: Dices,
  other: Package,
};

export function categoryStyle(c: string): CategoryStyle {
  const cat: Category = isCategory(c) ? c : "other";
  const t = TOKEN[cat];
  return {
    icon: ICON[cat],
    tint: `var(--cat-${t}-tint)`,
    ink: `var(--cat-${t}-ink)`,
    dot: `var(--cat-${t})`,
  };
}
