import { describe, expect, it } from "vitest";
import { addMonths, daysInMonth, isMonth, monthEnd, monthInsights, monthLabel, yearInsights } from "@/lib/months";

const e = (spent_on: string, amount: number, category = "food", item = "x") => ({ spent_on, amount, category, item });
const TODAY = "2026-11-18";

describe("month helpers", () => {
  it("knows month lengths, including leap years", () => {
    expect(daysInMonth("2026-11")).toBe(30);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(monthEnd("2026-12")).toBe("2026-12-31");
  });
  it("steps across years", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-11", 2)).toBe("2027-01");
  });
  it("labels and validates", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(monthLabel("2026-11", "short")).toBe("Nov");
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
  });
});

describe("monthInsights (month in progress)", () => {
  const entries = [
    e("2026-10-02", 10000, "bills"), e("2026-10-10", 20000, "food"), e("2026-10-25", 50000, "food"), // after the 18th: not compared
    e("2026-11-01", 4000, "food"), e("2026-11-05", 6000, "transport"), e("2026-11-18", 2000, "food"),
  ];
  const m = monthInsights(entries, "2026-11", TODAY);

  it("adds up the month so far and leaves future days empty", () => {
    expect(m.total).toBe(12000);
    expect(m.count).toBe(3);
    expect(m.days).toHaveLength(30);
    expect(m.days[17]).toEqual({ day: "2026-11-18", total: 2000 });
    expect(m.days[18].total).toBeNull();
  });
  it("compares fairly: 1–18 Nov against 1–18 Oct", () => {
    expect(m.prevTotal).toBe(30000);
    expect(m.comparison).toEqual({
      direction: "under",
      diff: 18000,
      headline: "₦18,000 less than this point in October",
      detail: "1–18 Oct: ₦30,000",
    });
    expect(m.insight).toBe("So far you've spent ₦18,000 less than at this point in October. Nice one.");
  });
  it("averages only over days since the first log", () => {
    expect(m.dailyAverage).toBe(Math.round(12000 / 18));
    const fresh = monthInsights([e("2026-11-10", 900), e("2026-11-18", 900)], "2026-11", TODAY);
    expect(fresh.dailyAverage).toBe(Math.round(1800 / 9));
  });
});

describe("monthInsights (past month)", () => {
  it("compares whole months", () => {
    const m = monthInsights([e("2026-09-03", 30000), e("2026-10-04", 40000, "transport"), e("2026-10-20", 5000)], "2026-10", TODAY);
    expect(m.isCurrent).toBe(false);
    expect(m.total).toBe(45000);
    expect(m.comparison?.headline).toBe("₦15,000 more than September");
    expect(m.comparison?.detail).toBe("September: ₦30,000");
  });
  it("caps the comparison window at the shorter month (31 March vs February)", () => {
    const m = monthInsights([e("2027-02-28", 1000), e("2027-03-31", 1000)], "2027-03", "2027-03-31");
    expect(m.prevTotal).toBe(1000);
    expect(m.comparison?.detail).toBe("1–28 Feb: ₦1,000");
  });
});

describe("yearInsights", () => {
  it("fills 12 months, averages finished months, names the biggest", () => {
    const y = yearInsights(
      [
        { month: "2026-09-01", total: 90000, entries: 30 },
        { month: "2026-10-01", total: 120000, entries: 40 },
        { month: "2026-11-01", total: 50000, entries: 20 },
      ],
      TODAY,
    );
    expect(y.months).toHaveLength(12);
    expect(y.months[0].month).toBe("2025-12");
    expect(y.months[11]).toEqual({ month: "2026-11", total: 50000, entries: 20 });
    expect(y.total).toBe(260000);
    expect(y.monthlyAverage).toBe(105000);
    expect(y.highest).toEqual({ month: "2026-10", total: 120000 });
    expect(y.insight).toBe("Your average month is ₦105,000. November so far: ₦50,000. October was the biggest, at ₦120,000.");
  });
  it("is patient early on", () => {
    expect(yearInsights([], TODAY).insight).toBe("Nothing logged yet. Your months show up here as you log.");
    expect(yearInsights([{ month: "2026-11-01", total: 5000, entries: 3 }], TODAY).insight).toContain("first month");
  });
});
