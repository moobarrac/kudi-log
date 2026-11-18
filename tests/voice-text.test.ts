import { describe, expect, it } from "vitest";
import { ruleParse } from "@/lib/parser";
import { appendSpoken, cleanTranscript, pickVoiceMode } from "@/lib/voice-text";

describe("cleanTranscript", () => {
  it("removes the comma Whisper puts between an item and its amount", () => {
    expect(cleanTranscript("Suya, 2,000.")).toBe("Suya 2,000");
    expect(cleanTranscript("Suya, 2,000. Keke, 1,500 and data, 1000.")).toBe("Suya 2,000, Keke 1,500 and data 1000");
  });
  it("splits run-on speech from the browser", () => {
    expect(cleanTranscript("suya 2000 transport 1500 data 1000")).toBe("suya 2000, transport 1500, data 1000");
    expect(cleanTranscript("bolt 3.2k keke 500")).toBe("bolt 3.2k, keke 500");
  });
  it("keeps words that belong to the amount", () => {
    expect(cleanTranscript("2k for suya")).toBe("2k for suya");
    expect(cleanTranscript("1500 naira for keke")).toBe("1500 naira for keke");
    expect(cleanTranscript("suya 2000 and keke 500")).toBe("suya 2000 and keke 500");
  });
  it("keeps number words together with their item", () => {
    expect(cleanTranscript("Data, two thousand.")).toBe("Data two thousand");
  });
  it("drops Whisper's silence hallucinations", () => {
    expect(cleanTranscript("Thank you.")).toBe("");
    expect(cleanTranscript("  you ")).toBe("");
    expect(cleanTranscript("")).toBe("");
  });
  it("gives the parser what it needs", () => {
    const { items, unparsed } = ruleParse(cleanTranscript("Suya, 2,000. Transport 1500 data 1k."));
    expect(items.map((i) => [i.item, i.amount])).toEqual([["suya", 2000], ["transport", 1500], ["data", 1000]]);
    expect(unparsed).toEqual([]);
  });
});

describe("appendSpoken", () => {
  it("adds to what's typed with a comma", () => {
    expect(appendSpoken("", "suya 2k")).toBe("suya 2k");
    expect(appendSpoken("bread 800, ", "suya 2k")).toBe("bread 800, suya 2k");
    expect(appendSpoken("bread 800", "")).toBe("bread 800");
  });
});

describe("pickVoiceMode", () => {
  it("prefers the browser's recognition, except on iPhone", () => {
    expect(pickVoiceMode({ speech: true, recorder: true, ios: false })).toBe("speech");
    expect(pickVoiceMode({ speech: true, recorder: true, ios: true })).toBe("record");
    expect(pickVoiceMode({ speech: false, recorder: true, ios: false })).toBe("record");
    expect(pickVoiceMode({ speech: true, recorder: true, ios: false, speechFailed: true })).toBe("record");
    expect(pickVoiceMode({ speech: false, recorder: false, ios: false })).toBeNull();
  });
});

describe("cleanTranscript keeps separate items apart", () => {
  it("doesn't glue an amount that starts the next item", () => {
    expect(cleanTranscript("2k for suya, 1500 for keke")).toBe("2k for suya, 1500 for keke");
    expect(cleanTranscript("suya 2000, 1500")).toBe("suya 2000, 1500");
    expect(cleanTranscript("Data, one thousand five hundred naira.")).toBe("Data one thousand five hundred naira");
  });
});
