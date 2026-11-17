import { describe, expect, it } from "vitest";
import { cleanPatch, cleanRestore, isLoggableDay } from "@/lib/entry-input";

const today = "2026-11-17";

describe("isLoggableDay", () => {
  it("allows today back to 90 days", () => {
    expect(isLoggableDay(today, today)).toBe(true);
    expect(isLoggableDay("2026-08-19", today)).toBe(true);
    expect(isLoggableDay("2026-08-18", today)).toBe(false);
    expect(isLoggableDay("2026-11-18", today)).toBe(false);
    expect(isLoggableDay("17/11/2026", today)).toBe(false);
  });
});

describe("cleanPatch", () => {
  it("keeps only valid, known fields", () => {
    expect(cleanPatch({ item: "  Pepper   Soup ", amount: 3000, category: "food", spent_on: "2026-11-16", user_id: "x" }, today)).toEqual({
      ok: true,
      value: { item: "pepper soup", amount: 3000, category: "food", spent_on: "2026-11-16" },
    });
  });
  it("rejects bad values with a friendly message", () => {
    expect(cleanPatch({ amount: 2.5 }, today).ok).toBe(false);
    expect(cleanPatch({ amount: 0 }, today).ok).toBe(false);
    expect(cleanPatch({ amount: "2000" }, today).ok).toBe(false);
    expect(cleanPatch({ item: "  " }, today).ok).toBe(false);
    expect(cleanPatch({ item: "1234" }, today).ok).toBe(false);
    expect(cleanPatch({ category: "cars" }, today).ok).toBe(false);
    expect(cleanPatch({ spent_on: "2026-11-18" }, today).ok).toBe(false);
    expect(cleanPatch({}, today)).toEqual({ ok: false, error: "Nothing to change." });
    expect(cleanPatch(null, today).ok).toBe(false);
  });
});

describe("cleanRestore", () => {
  const row = {
    id: "3f2b8a1e-4c5d-4e6f-8a9b-0c1d2e3f4a5b",
    user_id: "someone-else",
    item: "suya",
    amount: 2000,
    category: "food",
    spent_on: "2026-11-17",
    source: "web",
    raw_text: "suya 2k",
    created_at: "2026-11-17T13:14:00.000Z",
  };
  it("brings back the same row without trusting user_id", () => {
    const r = cleanRestore(row, today);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).not.toHaveProperty("user_id");
      expect(r.value.id).toBe(row.id);
      expect(r.value.created_at).toBe(row.created_at);
    }
  });
  it("allows old days (undo of an old entry) but not future ones", () => {
    expect(cleanRestore({ ...row, spent_on: "2025-01-01" }, today).ok).toBe(true);
    expect(cleanRestore({ ...row, spent_on: "2026-11-18" }, today).ok).toBe(false);
  });
  it("rejects broken rows", () => {
    expect(cleanRestore({ ...row, id: "tmp-123" }, today).ok).toBe(false);
    expect(cleanRestore({ ...row, amount: -5 }, today).ok).toBe(false);
    expect(cleanRestore({ ...row, source: "sms" }, today).ok).toBe(false);
    expect(cleanRestore({ ...row, created_at: "nope" }, today).ok).toBe(false);
  });
});
