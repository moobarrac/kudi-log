import { describe, expect, it } from "vitest";
import { summarizeDay } from "@/lib/summary";
import { rangeInsights } from "@/lib/insights";
import {
  askAmount,
  categoryKeyboard,
  esc,
  formatDaySummary,
  formatLogged,
  formatMoney,
  formatWeek,
  heardLine,
  loggedKeyboard,
  parseCommand,
  pickItemKeyboard,
} from "@/lib/telegram/format";

const UUID = "3f2b8a1e-4c5d-4e6f-8a9b-0c1d2e3f4a5b";

describe("parseCommand", () => {
  it("reads commands, with or without the bot name", () => {
    expect(parseCommand("/today")).toEqual({ command: "today", arg: "" });
    expect(parseCommand("/Today@KudiLogBot")).toEqual({ command: "today", arg: "" });
    expect(parseCommand("/summary off")).toEqual({ command: "summary", arg: "off" });
    expect(parseCommand("/start AbC123_-x")).toEqual({ command: "start", arg: "AbC123_-x" });
  });
  it("leaves spending text alone", () => {
    expect(parseCommand("suya 2k")).toBeNull();
    expect(parseCommand("bread 500 / eggs 800")).toBeNull();
  });
});

describe("esc", () => {
  it("escapes what Telegram's HTML mode cares about", () => {
    expect(esc("<b>suya & co</b>")).toBe("&lt;b&gt;suya &amp; co&lt;/b&gt;");
  });
});

describe("log confirmation", () => {
  it("lists each item with category and amount, then today so far", () => {
    const text = formatLogged(
      [
        { item: "suya", amount: 2000, category: "food" },
        { item: "danfo", amount: 800, category: "transport" },
      ],
      12700,
    );
    expect(text).toBe(
      ["Logged 2 items", "🍲 <b>Suya</b> · Food · ₦2,000", "🚌 <b>Danfo</b> · Transport · ₦800", "", "Today so far: <b>₦12,700</b>"].join("\n"),
    );
  });
  it("asks about anything it couldn't read, safely escaped", () => {
    expect(formatLogged([{ item: "suya", amount: 2000, category: "food" }], 2000, ["gift <mama>"])).toContain(
      "How much was “gift &lt;mama&gt;”? Reply with just the amount, like <i>2k</i>.",
    );
    expect(askAmount(["a", "b"])).toBe("I couldn't find amounts for “a”, “b”. Send each one with its amount, like <i>a 2k</i>.");
  });
  it("keeps every button's data under Telegram's 64-byte limit", () => {
    const all = [
      ...loggedKeyboard(UUID).inline_keyboard.flat(),
      ...categoryKeyboard(UUID).inline_keyboard.flat(),
      ...pickItemKeyboard([{ id: UUID, item: "suya", amount: 2000, category: "food" }]).inline_keyboard.flat(),
    ];
    for (const b of all) expect(Buffer.byteLength(b.callback_data ?? "")).toBeLessThanOrEqual(64);
    expect(categoryKeyboard(UUID).inline_keyboard.flat()).toHaveLength(12);
  });
});

describe("summaries", () => {
  it("formats the day from summarizeDay's numbers", () => {
    const s = summarizeDay(
      "2026-11-17",
      [
        { item: "suya", amount: 2000, category: "food" },
        { item: "bolt", amount: 3200, category: "transport" },
      ],
      [{ spent_on: "2026-11-10", amount: 8000 }, { spent_on: "2026-11-03", amount: 6000 }, { spent_on: "2026-11-16", amount: 100 }],
    );
    const text = formatDaySummary(s, "Tuesday, 17 November", true);
    expect(text).toContain("You spent <b>₦5,200</b> across 2 entries");
    expect(text).toContain("↓ ₦1,800 under your usual Tuesday");
    expect(text).toContain("<b>Biggest bite:</b> Transport took 62% of today");
    expect(text).toContain("Biggest single spend: Bolt · ₦3,200");
    expect(text).toContain("Logging streak: 2 days");
  });
  it("is kind on an empty day", () => {
    const s = summarizeDay("2026-11-17", [], [{ spent_on: "2026-11-16", amount: 100 }]);
    expect(formatDaySummary(s, "Tuesday, 17 November", true)).toContain("Your 1-day streak is waiting.");
  });
  it("formats the week", () => {
    const r = rangeInsights(
      [
        { item: "x", amount: 3000, category: "food", spent_on: "2026-11-17" },
        { item: "x", amount: 1000, category: "food", spent_on: "2026-11-09" },
      ],
      "2026-11-17",
      7,
    );
    const text = formatWeek(r, "11 – 17 Nov");
    expect(text).toContain("<b>₦3,000</b> · about ₦429 a day · 1 entry");
    expect(text).toContain("🍲 Food · ₦3,000 · +200%");
  });
});

describe("voice notes", () => {
  it("shows what was heard, escaped", () => {
    expect(heardLine("suya 2,000 & <keke> 500")).toBe("🎙 I heard: “suya 2,000 &amp; &lt;keke&gt; 500”");
  });
});

describe("formatMoney", () => {
  it("shows what's left, how long it lasts and the budget", () => {
    const text = formatMoney(
      { balance: 42000, setAt: "x", setAmount: 50000, added: 0, spent: 8000 },
      { days: 10, until: "2026-11-28", headline: "At your usual ₦4,200 a day, that's about 10 days, to around 28 Nov." },
      { month: "2026-11", budget: 150000, spent: 60000, left: 90000, used: 0.4, expected: 0.6, onPace: true, daysLeft: 13, headline: "₦90,000 left for November", detail: "About ₦6,923 a day for the 13 days left." },
    );
    expect(text).toContain("Money left: <b>₦42,000</b>");
    expect(text).toContain("about 10 days");
    expect(text).toContain("<b>Budget:</b> ₦90,000 left for November");
  });
  it("guides people who haven't set a balance", () => {
    expect(formatMoney(null, null, null)).toContain("You haven't set a balance yet");
  });
});
