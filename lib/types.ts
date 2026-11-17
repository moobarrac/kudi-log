import type { Category } from "./categories";

/** A row of public.entries (see supabase/migrations). */
export type Entry = {
  id: string;
  user_id: string;
  item: string;
  /** Whole naira */
  amount: number;
  category: Category;
  /** Lagos calendar day, YYYY-MM-DD */
  spent_on: string;
  source: "web" | "telegram";
  raw_text: string | null;
  created_at: string;
};
