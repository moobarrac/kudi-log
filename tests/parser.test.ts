import { describe, expect, it } from "vitest";
import { hasNumberHint, parseSegment, ruleParse, splitSegments, parseAmount } from "@/lib/parser";

describe("splitSegments", () => {
  it("keeps thousands separators inside numbers", () => {
    expect(splitSegments("suya 2k, transport 1,500, data 1k")).toEqual(["suya 2k", "transport 1500", "data 1k"]);
  });
  it("splits on and, newlines and semicolons", () => {
    expect(splitSegments("bread 1200 and eggs 2500\nkeke 500; water 200")).toEqual([
      "bread 1200",
      "eggs 2500",
      "keke 500",
      "water 200",
    ]);
  });
});

describe("parseSegment", () => {
  const cases: Array<[string, string, number, string]> = [
    ["suya 2k", "suya", 2000, "food"],
    ["transport 1500", "transport", 1500, "transport"],
    ["₦3,500 for amala", "amala", 3500, "food"],
    ["N1200 bread", "bread", 1200, "food"],
    ["data 1.5k", "data", 1500, "airtime_data"],
    ["bought airtime for 500 naira", "airtime", 500, "airtime_data"],
    ["light 10k", "light", 10000, "bills"],
    ["paid rent 1.2m", "rent", 1200000, "bills"],
    ["2k5 bolt", "bolt", 2500, "transport"],
    ["2 plates rice 3000", "2 plates rice", 3000, "food"],
    ["offering 1000", "offering", 1000, "gifts"],
    ["gave mummy 5k", "mummy", 5000, "family"],
    ["random thing 700", "random thing", 700, "other"],
  ];
  for (const [input, item, amount, category] of cases) {
    it(`parses "${input}"`, () => {
      expect(parseSegment(input)).toEqual({ item, amount, category });
    });
  }

  it("returns null without an amount", () => {
    expect(parseSegment("bought suya")).toBeNull();
  });
  it("returns null without an item", () => {
    expect(parseSegment("2000")).toBeNull();
  });
  it("does not read numbers inside words", () => {
    expect(parseSegment("mtn5g router")).toBeNull();
  });
});

describe("ruleParse", () => {
  it("parses the classic example", () => {
    const r = ruleParse("suya 2k, transport 1,500, data 1k");
    expect(r.unparsed).toEqual([]);
    expect(r.items.map((i) => i.amount)).toEqual([2000, 1500, 1000]);
  });
  it("sends what it cannot read to the fallback", () => {
    const r = ruleParse("suya 2k, that thing for my guy");
    expect(r.items).toHaveLength(1);
    expect(r.unparsed).toEqual(["that thing for my guy"]);
  });
});

describe("hasNumberHint", () => {
  it("spots digits and number words", () => {
    for (const t of ["suya 2k", "two thousand for suya", "5 grand", "bread 1200"]) expect(hasNumberHint(t)).toBe(true);
  });
  it("says no when there is no amount to find", () => {
    for (const t of ["that thing for mama", "bread", "keke to work"]) expect(hasNumberHint(t)).toBe(false);
  });
});

describe("parseAmount (edit sheet)", () => {
  it("reads one amount typed on its own", () => {
    expect(parseAmount("2500")).toBe(2500);
    expect(parseAmount("2,500")).toBe(2500);
    expect(parseAmount("₦1,250,000")).toBe(1250000);
    expect(parseAmount("2k")).toBe(2000);
    expect(parseAmount("2.5k")).toBe(2500);
    expect(parseAmount("2k5")).toBe(2500);
    expect(parseAmount(" 800 ")).toBe(800);
  });
  it("rejects anything else", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("suya 2k")).toBeNull();
    expect(parseAmount("2k 3k")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("500m")).toBeNull(); // over the ₦100m cap
  });
});

describe("item names keep their meaning", () => {
  it("only trims filler words at the edges", () => {
    expect(parseSegment("bolt to yaba 3,200")).toEqual({ item: "bolt to yaba", amount: 3200, category: "transport" });
    expect(parseSegment("that thing for mama 5k")?.item).toBe("that thing for mama");
    expect(parseSegment("gift for mama 5k")?.item).toBe("gift for mama");
    expect(parseSegment("2k for suya")?.item).toBe("suya");
    expect(parseSegment("spent 2k on suya today")?.item).toBe("suya");
    expect(parseSegment("paid 1500 for the bread")?.item).toBe("bread");
    expect(parseSegment("gave my mum 5k")?.item).toBe("mum");
  });
});

describe("gifts", () => {
  it("files presents under Gifts, even when they mention family", () => {
    expect(parseSegment("gift for mama 5k")?.category).toBe("gifts");
    expect(parseSegment("birthday present for my sister 15k")?.category).toBe("gifts");
    expect(parseSegment("wedding gift 20k")?.category).toBe("gifts");
    expect(parseSegment("flowers 8k")?.category).toBe("gifts");
  });
  it("keeps money sent to family under Family & friends", () => {
    expect(parseSegment("mama 10k")?.category).toBe("family");
    expect(parseSegment("sent my sister 5k")?.category).toBe("family");
  });
});

describe("money to people", () => {
  it("knows more family words", () => {
    expect(parseSegment("gave sibling 10k")).toEqual({ item: "sibling", amount: 10000, category: "family" });
    expect(parseSegment("cousin 3k")?.category).toBe("family");
    expect(parseSegment("my bro 2k")?.category).toBe("family");
    expect(parseSegment("grandma 5k")?.category).toBe("family");
  });
  it("treats money handed to a person as family & friends, even unknown names", () => {
    expect(parseSegment("gave Tunde 5k")?.category).toBe("family");
    expect(parseSegment("sent Chidi 2k")?.category).toBe("family");
    expect(parseSegment("transfer to Bola 10k")?.category).toBe("family");
    expect(parseSegment("lent Emeka 20k")?.category).toBe("family");
  });
  it("still lets the item decide when it's known", () => {
    expect(parseSegment("gave beggar 200")?.category).toBe("gifts");
    expect(parseSegment("sent gift to mama 5k")?.category).toBe("gifts");
    expect(parseSegment("transfer for rent 200k")?.category).toBe("bills");
  });
});

describe("bank fees", () => {
  it("are bills, not money to a person", () => {
    expect(parseSegment("transfer charge 50")?.category).toBe("bills");
    expect(parseSegment("stamp duty 50")?.category).toBe("bills");
    expect(parseSegment("sms alert 100")?.category).toBe("bills");
  });
});

describe("betting", () => {
  it("has its own category", () => {
    expect(parseSegment("sportybet 2k")?.category).toBe("betting");
    expect(parseSegment("stake 5k")?.category).toBe("betting");
    expect(parseSegment("bet9ja 1500")?.category).toBe("betting");
    expect(parseSegment("1xbet 3k")?.category).toBe("betting");
    expect(parseSegment("baba ijebu 500")?.category).toBe("betting");
    expect(parseSegment("aviator 2k")?.category).toBe("betting");
    expect(parseSegment("funded my bet9ja wallet 10k")?.category).toBe("betting");
  });
  it("leaves fun as fun, and tickets with what they're for", () => {
    expect(parseSegment("movie ticket 3k")?.category).toBe("fun");
    expect(parseSegment("bus ticket 1500")?.category).toBe("transport");
    expect(parseSegment("cinema 5k")?.category).toBe("fun");
    expect(parseSegment("club 20k")?.category).toBe("fun");
  });
});
