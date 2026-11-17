import { describe, expect, it } from "vitest";
import { quickChips, total, totalsByCategory } from "@/lib/summary";

describe("totals", () => {
  const entries = [
    { amount: 2000, category: "food" },
    { amount: 800, category: "transport" },
    { amount: 2400, category: "food" },
    { amount: 800, category: "bills" },
  ];
  it("adds up in code", () => {
    expect(total(entries)).toBe(6000);
    expect(total([])).toBe(0);
  });
  it("groups by category, biggest first, ties alphabetical", () => {
    expect(totalsByCategory(entries)).toEqual([
      { category: "food", amount: 4400 },
      { category: "bills", amount: 800 },
      { category: "transport", amount: 800 },
    ]);
  });
});

describe("quickChips", () => {
  it("puts the user's most frequent items first", () => {
    expect(quickChips(["Suya", "bolt", "suya", "bolt", "suya", "bread"], 3)).toEqual(["suya", "bolt", "bread"]);
  });
  it("tops up with defaults without duplicates", () => {
    expect(quickChips(["suya"], 3)).toEqual(["suya", "transport", "data"]);
    expect(quickChips([], 2)).toEqual(["suya", "transport"]);
  });
  it("skips long items", () => {
    expect(quickChips(["a very long item name that would not fit"], 1)).toEqual(["suya"]);
  });
});
