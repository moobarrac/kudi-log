import { describe, expect, it } from "vitest";
import { changeBetween, dayName, rangeInsights, rangeLabel } from "@/lib/insights";

// Today is Tuesday 17 Nov 2026. The week is Wed 11 – Tue 17; last week is Wed 4 – Tue 10.
const TODAY = "2026-11-17";
const e = (spent_on: string, amount: number, category = "food", item = "x") => ({ spent_on, amount, category, item });

describe("changeBetween", () => {
  it("rounds to whole percent and treats ±3% as the same", () => {
    expect(changeBetween(1180, 1000)).toEqual({ kind: "up", pct: 18 });
    expect(changeBetween(940, 1000)).toEqual({ kind: "down", pct: 6 });
    expect(changeBetween(1030, 1000)).toEqual({ kind: "same", pct: 0 });
    expect(changeBetween(500, 0)).toEqual({ kind: "new", pct: 0 });
  });
});

describe("labels", () => {
  it("names days relative to today", () => {
    expect(dayName(TODAY, TODAY)).toBe("Today");
    expect(dayName("2026-11-16", TODAY)).toBe("Yesterday");
    expect(dayName("2026-11-13", TODAY)).toBe("Friday");
    expect(dayName("2026-11-04", TODAY)).toBe("Wed, 4 Nov");
  });
  it("formats ranges", () => {
    expect(rangeLabel("2026-11-11", TODAY)).toBe("11 – 17 Nov");
    expect(rangeLabel("2026-10-28", "2026-11-03")).toBe("28 Oct – 3 Nov");
  });
});

describe("rangeInsights (week)", () => {
  const entries = [
    // this week
    e("2026-11-11", 8000, "food"),
    e("2026-11-13", 9800, "transport"), e("2026-11-13", 5500, "food"), // Friday 15,300
    e("2026-11-15", 4000, "bills"),
    e(TODAY, 2000, "food"),
    // last week
    e("2026-11-05", 6000, "food"), e("2026-11-08", 9000, "transport"),
    // too old: ignored
    e("2026-10-01", 99999, "fun"),
  ];
  const w = rangeInsights(entries, TODAY, 7);

  it("adds up the week and keeps ₦0 days in the chart", () => {
    expect(w.start).toBe("2026-11-11");
    expect(w.total).toBe(29300);
    expect(w.count).toBe(5);
    expect(w.prevTotal).toBe(15000);
    expect(w.days.map((d) => d.total)).toEqual([8000, 0, 15300, 0, 4000, 0, 2000]);
    expect(w.dailyAverage).toBe(Math.round(29300 / 7));
  });
  it("compares categories with last week", () => {
    expect(w.byCategory).toEqual([
      { category: "food", amount: 15500, prev: 6000, change: { kind: "up", pct: 158 } },
      { category: "transport", amount: 9800, prev: 9000, change: { kind: "up", pct: 9 } },
      { category: "bills", amount: 4000, prev: 0, change: { kind: "new", pct: 0 } },
    ]);
  });
  it("finds the heaviest day and says it plainly, without judging", () => {
    expect(w.heaviest).toEqual({ day: "2026-11-13", total: 15300, category: "transport", categoryAmount: 9800 });
    expect(w.insight).toBe("Friday was your heaviest day. ₦9,800 of the ₦15,300 went on transport.");
  });
  it("leads with good news when the week is cheaper", () => {
    const cheaper = rangeInsights([...entries, e("2026-11-06", 30000, "bills")], TODAY, 7);
    expect(cheaper.insight).toBe("You spent ₦15,700 less than last week. Nice one.");
  });
  it("celebrates a category that dropped", () => {
    const r = rangeInsights(
      [e("2026-11-12", 5000, "transport"), e("2026-11-13", 3000, "food"), e("2026-11-14", 3000, "food"),
       e("2026-11-05", 9000, "transport"), e("2026-11-06", 1000, "food")],
      TODAY, 7,
    );
    expect(r.insight).toBe("Transport is down ₦4,000 on last week. Nice one.");
  });
  it("averages only over days since a new user's first log", () => {
    const r = rangeInsights([e("2026-11-15", 3000), e("2026-11-16", 3000), e(TODAY, 3000)], TODAY, 7);
    expect(r.dailyAverage).toBe(3000);
  });
  it("is patient with new users", () => {
    expect(rangeInsights([e(TODAY, 3000)], TODAY, 7).insight).toBe("Log a few more days and patterns will start to show here.");
    expect(rangeInsights([], TODAY, 7).insight).toBe("Nothing logged this week yet. Log a spend and this fills up.");
  });
  it("says 'all' when one category was the whole day, and 'Today is' for today", () => {
    const r = rangeInsights([e("2026-11-12", 100), e("2026-11-13", 100), e(TODAY, 4000, "transport")], TODAY, 7);
    expect(r.insight).toBe("Today is your heaviest day. All ₦4,000 went on transport.");
  });
});

describe("rangeInsights (month)", () => {
  it("covers 30 days and compares with the 30 before", () => {
    const m = rangeInsights([e("2026-10-19", 1000), e("2026-10-18", 5000), e(TODAY, 1000)], TODAY, 30);
    expect(m.start).toBe("2026-10-19");
    expect(m.days).toHaveLength(30);
    expect(m.total).toBe(2000);
    expect(m.prevTotal).toBe(5000);
  });
});
