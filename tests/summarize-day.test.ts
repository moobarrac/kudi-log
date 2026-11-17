import { describe, expect, it } from "vitest";
import { compareToUsual, streakEnding, summarizeDay, usualFor, weekdayName } from "@/lib/summary";

// 2026-11-16 is a Monday.
const MON = "2026-11-16";
const h = (spent_on: string, amount: number) => ({ spent_on, amount });

const today = [
  { item: "suya", amount: 2000, category: "food" },
  { item: "bolt to yaba", amount: 3200, category: "transport" },
  { item: "prepaid light", amount: 3200, category: "bills" },
  { item: "amala and ewedu", amount: 2500, category: "food" },
  { item: "data", amount: 1000, category: "airtime_data" },
  { item: "danfo", amount: 800, category: "transport" },
];

describe("summarizeDay", () => {
  const history = [
    h("2026-11-09", 10000), h("2026-11-09", 4000), // Monday -7: 14,000
    h("2026-11-02", 15600),                        // Monday -14
    h("2026-10-26", 14800),                        // Monday -21
    // Monday -28 not logged: left out, not counted as ₦0
    h("2026-11-15", 500), h("2026-11-14", 900), h("2026-11-13", 100),
    h("2026-11-11", 700),                          // gap on the 12th
  ];
  const s = summarizeDay(MON, today, history);

  it("adds up the day in code", () => {
    expect(s.total).toBe(12700);
    expect(s.count).toBe(6);
  });
  it("groups categories biggest first with shares", () => {
    expect(s.byCategory).toEqual([
      { category: "food", amount: 4500, share: 35 },
      { category: "transport", amount: 4000, share: 31 },
      { category: "bills", amount: 3200, share: 25 },
      { category: "airtime_data", amount: 1000, share: 8 },
    ]);
  });
  it("picks the biggest single spend, first one on a tie", () => {
    expect(s.biggest).toEqual({ item: "bolt to yaba", amount: 3200, category: "transport" });
  });
  it("compares with the same weekday, only counting logged days", () => {
    expect(s.usual).toEqual({ average: 14800, basis: 3 });
    expect(s.comparison).toEqual({
      direction: "under",
      diff: 2100,
      headline: "₦2,100 under your usual Monday",
      detail: "Your Monday average is ₦14,800",
    });
  });
  it("counts the streak back to the first gap", () => {
    expect(s.streak).toBe(4); // 16, 15, 14, 13
  });
  it("ignores history on or after the day", () => {
    const s2 = summarizeDay(MON, today, [...history, h(MON, 99999), h("2026-11-17", 5)]);
    expect(s2.usual).toEqual(s.usual);
    expect(s2.streak).toBe(4);
  });
  it("handles an empty day", () => {
    const e = summarizeDay(MON, [], history);
    expect(e).toMatchObject({ total: 0, count: 0, byCategory: [], biggest: null, comparison: null, streak: 3 });
  });
});

describe("usualFor", () => {
  it("needs at least one logged same weekday", () => {
    expect(usualFor(MON, [h("2026-11-15", 3000)])).toBeNull();
    expect(usualFor(MON, [h("2026-10-19", 3000)])).toEqual({ average: 3000, basis: 1 });
    expect(usualFor(MON, [h("2026-10-12", 3000)])).toBeNull(); // 5 weeks back: too old
  });
});

describe("compareToUsual", () => {
  it("says 'more than' kindly, and 'about the same' within 5%", () => {
    expect(compareToUsual(16000, { average: 14000, basis: 2 }, MON)?.headline).toBe("₦2,000 more than your usual Monday");
    expect(compareToUsual(14500, { average: 14000, basis: 2 }, MON)?.headline).toBe("About the same as your usual Monday");
    expect(compareToUsual(14500, { average: 14000, basis: 2 }, MON)?.direction).toBe("same");
  });
  it("doesn't call one past day 'usual'", () => {
    expect(compareToUsual(5000, { average: 8000, basis: 1 }, MON)).toMatchObject({
      headline: "₦3,000 under the last Monday you logged",
      detail: "That Monday was ₦8,000",
    });
  });
  it("stays quiet with nothing to compare", () => {
    expect(compareToUsual(5000, null, MON)).toBeNull();
    expect(compareToUsual(0, { average: 8000, basis: 3 }, MON)).toBeNull();
  });
});

describe("streakEnding", () => {
  it("keeps yesterday's streak alive before today's first log", () => {
    const days = new Set(["2026-11-15", "2026-11-14"]);
    expect(streakEnding(MON, days)).toBe(2);
    expect(streakEnding(MON, new Set([MON, ...days]))).toBe(3);
    expect(streakEnding(MON, new Set())).toBe(0);
  });
});

describe("weekdayName", () => {
  it("uses the calendar day, not the server's timezone", () => {
    expect(weekdayName(MON)).toBe("Monday");
    expect(weekdayName("2026-11-22")).toBe("Sunday");
  });
});
