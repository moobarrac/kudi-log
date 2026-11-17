import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __clearAICache, parseWithAI, validateItem } from "@/lib/ai";
import { resolveText } from "@/lib/entries";

describe("validateItem", () => {
  it("accepts a clean item", () => {
    expect(validateItem({ item: "Suya", amount: 2000, category: "food" }, "suya two thousand")).toEqual({
      item: "suya",
      amount: 2000,
      category: "food",
    });
  });
  it("rejects amounts that aren't whole positive naira", () => {
    for (const amount of [0, -5, 1.5, null, "abc", 200_000_000]) {
      expect(validateItem({ item: "suya", amount, category: "food" }, "suya 2k")).toBeNull();
    }
  });
  it("rejects an amount when the text has no number at all", () => {
    expect(validateItem({ item: "gift", amount: 5000, category: "family" }, "that thing for mama")).toBeNull();
  });
  it("fixes an unknown category from keywords, else other", () => {
    expect(validateItem({ item: "keke", amount: 500, category: "vehicles" }, "keke five hundred")?.category).toBe("transport");
    expect(validateItem({ item: "zzz", amount: 500, category: "nope" }, "zzz 500")?.category).toBe("other");
  });
  it("rejects junk", () => {
    expect(validateItem(null, "x 1")).toBeNull();
    expect(validateItem({ item: "", amount: 1 }, "x 1")).toBeNull();
    expect(validateItem({ item: "123", amount: 1 }, "x 1")).toBeNull();
  });
});

describe("parseWithAI", () => {
  beforeEach(() => {
    __clearAICache();
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "test-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const groqReply = (items: unknown[]) =>
    new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ items }) } }] }), { status: 200 });

  it("returns one result per piece, in order, and never asks about pieces with no number", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      groqReply([
        { item: "suya", amount: 2000, category: "food" },
        { item: "bread", amount: null, category: "food" },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const out = await parseWithAI(["suya two thousand", "that thing for mama", "bread 1 loaf"]);
    expect(out).toEqual([{ item: "suya", amount: 2000, category: "food" }, null, null]);
    const sent = JSON.parse(JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content);
    expect(sent).toEqual(["suya two thousand", "bread 1 loaf"]);
  });

  it("caches, so the same phrase is never sent twice", async () => {
    const fetchMock = vi.fn().mockResolvedValue(groqReply([{ item: "suya", amount: 2000, category: "food" }]));
    vi.stubGlobal("fetch", fetchMock);
    await parseWithAI(["Suya  two thousand"]);
    await parseWithAI(["suya two thousand"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns nulls on any failure, never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })));
    expect(await parseWithAI(["suya two thousand"])).toEqual([null]);
    __clearAICache();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{not json", { status: 200 })));
    expect(await parseWithAI(["suya two thousand"])).toEqual([null]);
    __clearAICache();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await parseWithAI(["suya two thousand"])).toEqual([null]);
  });

  it("does nothing without an API key", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await parseWithAI(["suya two thousand"])).toEqual([null]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("resolveText", () => {
  it("uses rules first and only sends leftovers to the AI", async () => {
    const ai = vi.fn().mockResolvedValue([{ item: "suya", amount: 2000, category: "food" }, null]);
    const out = await resolveText("transport 1,500, suya two thousand, that thing for mama", ai);
    expect(ai).toHaveBeenCalledWith(["suya two thousand", "that thing for mama"]);
    expect(out.items).toEqual([
      { item: "transport", amount: 1500, category: "transport", via: "rules" },
      { item: "suya", amount: 2000, category: "food", via: "ai" },
    ]);
    expect(out.unresolved).toEqual(["that thing for mama"]);
  });

  it("skips the AI entirely when rules read everything", async () => {
    const ai = vi.fn();
    const out = await resolveText("suya 2k, data 1k", ai);
    expect(ai).not.toHaveBeenCalled();
    expect(out.items).toHaveLength(2);
  });
});
