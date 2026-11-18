import { describe, expect, it } from "vitest";
import { nightlyAction } from "@/lib/nightly";
import { summarizeDay } from "@/lib/summary";

const TODAY = "2026-11-17";
const day = (entries: number) =>
  summarizeDay(TODAY, Array.from({ length: entries }, () => ({ item: "suya", amount: 2000, category: "food" })), []);

describe("nightlyAction", () => {
  it("sends the summary when there's something today", () => {
    expect(nightlyAction(day(2), [], TODAY)).toBe("summary");
  });
  it("nudges people who logged in the last week", () => {
    expect(nightlyAction(day(0), [{ spent_on: "2026-11-16" }], TODAY)).toBe("nudge");
    expect(nightlyAction(day(0), [{ spent_on: "2026-11-10" }], TODAY)).toBe("nudge");
  });
  it("leaves quiet users alone", () => {
    expect(nightlyAction(day(0), [{ spent_on: "2026-11-09" }], TODAY)).toBe("skip");
    expect(nightlyAction(day(0), [], TODAY)).toBe("skip");
  });
});
