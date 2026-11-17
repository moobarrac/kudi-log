// Telegram message text and buttons. Pure (no network, no DB) so every reply is unit-tested.
// Messages use parse_mode HTML, so anything the user typed goes through esc().

import { CATEGORY_KEYS, categoryEmojiLabel, categoryLabel, CATEGORIES, isCategory } from "../categories";
import type { RangeInsights } from "../insights";
import type { BudgetStatus, MoneyLeft, Runway } from "../money-left";
import { naira } from "../money";
import { biggestBiteLine, type DaySummary } from "../summary";

export type Button = { text: string; callback_data?: string; url?: string };
export type Keyboard = { inline_keyboard: Button[][] };
type Item = { id?: string; item: string; amount: number; category: string };

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function emoji(category: string): string {
  return (isCategory(category) ? CATEGORIES[category] : CATEGORIES.other).emoji;
}

/** "/today", "/today@KudiLogBot", "/summary off" -> { command: "today", arg: "off" }. Null for plain text. */
export function parseCommand(text: string): { command: string; arg: string } | null {
  const m = text.trim().match(/^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i);
  return m ? { command: m[1].toLowerCase(), arg: (m[2] ?? "").trim() } : null;
}

// ---------- logging ----------

function itemLine(i: Item): string {
  return `${emoji(i.category)} <b>${esc(cap(i.item))}</b> · ${esc(categoryLabel(i.category))} · ${naira(i.amount)}`;
}

/** Ask for a missing amount. One item: reply with just the amount. Several: send each again. */
export function askAmount(unresolved: string[]): string {
  if (unresolved.length === 1) {
    return `How much was “${esc(unresolved[0])}”? Reply with just the amount, like <i>2k</i>.`;
  }
  return `I couldn't find amounts for ${unresolved.map((u) => `“${esc(u)}”`).join(", ")}. Send each one with its amount, like <i>${esc(unresolved[0])} 2k</i>.`;
}

export function formatLogged(items: Item[], todayTotal: number, unresolved: string[] = []): string {
  const head = `Logged ${items.length} ${items.length === 1 ? "item" : "items"}`;
  const lines = [head, ...items.map(itemLine), "", `Today so far: <b>${naira(todayTotal)}</b>`];
  if (unresolved.length) lines.push("", askAmount(unresolved));
  return lines.join("\n");
}

/** Buttons under a log confirmation. `batchId` is any entry id from that message. */
export function loggedKeyboard(batchId: string): Keyboard {
  return {
    inline_keyboard: [[
      { text: "Undo", callback_data: `u:${batchId}` },
      { text: "Fix a category", callback_data: `f:${batchId}` },
    ]],
  };
}

/** Several items in the message: pick which one to fix first. */
export function pickItemKeyboard(items: Array<Required<Pick<Item, "id">> & Item>): Keyboard {
  return { inline_keyboard: items.map((i) => [{ text: `${cap(i.item)} · ${naira(i.amount)}`, callback_data: `p:${i.id}` }]) };
}

export function categoryKeyboard(entryId: string): Keyboard {
  const buttons = CATEGORY_KEYS.map((c) => ({ text: categoryEmojiLabel(c), callback_data: `c:${entryId}:${c}` }));
  const rows: Button[][] = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return { inline_keyboard: rows };
}

/** First line of a reply to a voice note: what we heard, so a mishearing is easy to spot (and Undo). */
export function heardLine(text: string): string {
  return `🎙 I heard: “${esc(text)}”`;
}

// ---------- summaries ----------

/** /today and the 9 PM message. Every number comes from summarizeDay. */
export function formatDaySummary(s: DaySummary, dateLabel: string, isToday: boolean): string {
  const when = isToday ? "today" : "that day";
  if (s.count === 0) {
    return [
      `<b>Your day in kudi</b> · ${esc(dateLabel)}`,
      "",
      `Nothing logged ${when} yet. Send me what you spent, like <i>suya 2k, transport 1,500</i>.`,
      ...(s.streak > 0 ? ["", `Your ${s.streak}-day streak is waiting.`] : []),
    ].join("\n");
  }

  const lines = [
    `<b>Your day in kudi</b> · ${esc(dateLabel)}`,
    "",
    `You spent <b>${naira(s.total)}</b> across ${s.count} ${s.count === 1 ? "entry" : "entries"}`,
  ];
  if (s.comparison) {
    const arrow = s.comparison.direction === "under" ? "↓" : s.comparison.direction === "over" ? "↑" : "=";
    lines.push(`${arrow} ${esc(s.comparison.headline)}`);
  }
  const top = s.byCategory[0];
  if (top) {
    lines.push("", `<b>Biggest bite:</b> ${esc(biggestBiteLine(s.byCategory, categoryLabel(top.category), isToday ? "today" : "the day") ?? "")}`);
    for (const c of s.byCategory.slice(0, 5)) lines.push(`${emoji(c.category)} ${esc(categoryLabel(c.category))} · ${naira(c.amount)}`);
  }
  if (s.biggest) lines.push("", `Biggest single spend: ${esc(cap(s.biggest.item))} · ${naira(s.biggest.amount)}`);
  lines.push(`Logging streak: ${s.streak} ${s.streak === 1 ? "day" : "days"}`);
  return lines.join("\n");
}

export function formatWeek(r: RangeInsights, rangeText: string): string {
  if (r.count === 0) {
    return `<b>Your week</b> · ${esc(rangeText)}\n\nNothing logged in the last 7 days. Send me what you spent, like <i>suya 2k</i>.`;
  }
  const lines = [
    `<b>Your week</b> · ${esc(rangeText)}`,
    `<b>${naira(r.total)}</b> · about ${naira(r.dailyAverage)} a day · ${r.count} ${r.count === 1 ? "entry" : "entries"}`,
    "",
    esc(r.insight),
    "",
    "<b>Where it went</b> (vs last week)",
  ];
  for (const c of r.byCategory.slice(0, 6)) {
    const ch = c.change;
    const delta = ch.kind === "up" ? ` · +${ch.pct}%` : ch.kind === "down" ? ` · −${ch.pct}%` : ch.kind === "new" ? " · new" : "";
    lines.push(`${emoji(c.category)} ${esc(categoryLabel(c.category))} · ${naira(c.amount)}${delta}`);
  }
  return lines.join("\n");
}

/** /money: what's left, how long it lasts, and the budget. Numbers from lib/money-left. */
export function formatMoney(left: MoneyLeft | null, run: Runway | null, budget: BudgetStatus | null): string {
  const lines: string[] = ["<b>Your money</b>", ""];
  if (left) {
    if (left.balance < 0) {
      lines.push(`You've logged <b>${naira(-left.balance)}</b> more than the balance you set. Update it in Kudi Log → Money.`);
    } else {
      lines.push(`Money left: <b>${naira(left.balance)}</b>`);
      if (run) lines.push(esc(run.headline));
    }
  } else {
    lines.push("You haven't set a balance yet. In Kudi Log, open <b>Money</b> and add how much you have.");
  }
  if (budget) lines.push("", `<b>Budget:</b> ${esc(budget.headline)}`, esc(budget.detail));
  return lines.join("\n");
}

// ---------- fixed copy ----------

export const HELP = [
  "Send me what you spend, the way you'd say it:",
  "<i>suya 2k, transport 1,500, data 1k</i>",
  "Or hold the mic and say it as a voice note.",
  "",
  "/today · your day so far",
  "/week · the last 7 days",
  "/money · money left and your budget",
  "/undo · remove your last log",
  "/summary on or /summary off · the 9 PM summary",
  "/help · this message",
].join("\n");

export const NOT_LINKED =
  "Hi! I'm Kudi Log. To start, link this chat to your account: open Kudi Log, go to <b>Settings</b> and tap <b>Link Telegram</b>.";

export const LINK_EXPIRED = "That link has expired or was already used. Open Kudi Log → Settings and tap <b>Link Telegram</b> again.";

export function linkedText(name: string | null): string {
  return [
    `You're linked${name ? `, ${esc(name)}` : ""}!`,
    "",
    "Send me what you spend, the way you'd say it:",
    "<i>suya 2k, transport 1,500, data 1k</i>",
    "Or hold the mic and say it as a voice note.",
    "",
    "I'll send your day in kudi at 9 PM. Turn it off with /summary off.",
  ].join("\n");
}
