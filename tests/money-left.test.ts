import { describe, expect, it } from "vitest";
import { budgetStatus, dailyPace, moneyLeft, runway } from "@/lib/money-left";

const t = (s: string) => `2026-11-${s}+00:00`;

describe("moneyLeft", () => {
  it("is unknown until a balance is set", () => {
    expect(moneyLeft([{ kind: "add", amount: 5000, created_at: t("10T10:00:00") }], [])).toBeNull();
  });
  it("takes off only what was logged after setting it, and adds income", () => {
    const r = moneyLeft(
      [
        { kind: "set", amount: 100000, created_at: t("10T09:00:00") },
        { kind: "set", amount: 150000, created_at: t("12T09:00:00") }, // the latest set wins
        { kind: "add", amount: 50000, created_at: t("11T09:00:00") }, // before the latest set: ignored
        { kind: "add", amount: 20000, created_at: t("15T09:00:00") },
      ],
      [
        { amount: 3000, created_at: t("12T08:00:00") }, // already spent when the balance was set
        { amount: 4000, created_at: t("13T12:00:00") },
        { amount: 1000, created_at: t("16T12:00:00") },
      ],
    );
    expect(r).toEqual({ balance: 165000, setAt: t("12T09:00:00"), setAmount: 150000, added: 20000, spent: 5000 });
  });
  it("can go below zero (spent more than the balance set)", () => {
    expect(moneyLeft([{ kind: "set", amount: 1000, created_at: t("10T09:00:00") }], [{ amount: 1500, created_at: t("11T09:00:00") }])?.balance).toBe(-500);
  });
});

describe("dailyPace and runway", () => {
  it("averages the last 30 days from the first log", () => {
    const h = [{ spent_on: "2026-11-09", amount: 5000 }, { spent_on: "2026-11-18", amount: 5000 }];
    expect(dailyPace(h, "2026-11-18")).toBe(1000); // 10,000 over 10 days
    expect(dailyPace([], "2026-11-18")).toBe(0);
  });
  it("says how long the money lasts", () => {
    expect(runway(21000, 1000, "2026-11-18")).toEqual({
      days: 21,
      until: "2026-12-09",
      headline: "At your usual ₦1,000 a day, that's about 21 days, to around 9 Dec.",
    });
    expect(runway(500, 1000, "2026-11-18")?.headline).toBe("At your usual ₦1,000 a day, that's less than a day.");
    expect(runway(0, 1000, "2026-11-18")).toBeNull();
    expect(runway(5000, 0, "2026-11-18")).toBeNull();
  });
});

describe("budgetStatus", () => {
  it("shows what's left and a daily amount", () => {
    const b = budgetStatus(150000, 60000, "2026-11-18");
    expect(b.left).toBe(90000);
    expect(b.daysLeft).toBe(13);
    expect(b.headline).toBe("₦90,000 left for November");
    expect(b.detail).toBe("About ₦6,923 a day for the 13 days left.");
    expect(b.onPace).toBe(true); // 40% used, 60% of the month gone
  });
  it("is kind when over", () => {
    const b = budgetStatus(50000, 54500, "2026-11-18");
    expect(b.headline).toBe("₦4,500 over November's budget");
    expect(b.detail).toBe("A new month starts in 13 days.");
    expect(budgetStatus(50000, 60000, "2026-11-30").detail).toBe("A new month starts tomorrow.");
    expect(budgetStatus(50000, 1000, "2026-11-30").detail).toBe("That's for today, the last day of the month.");
  });
});
