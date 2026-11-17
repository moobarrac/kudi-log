import { type Category, guessCategory, guessFromVerb } from "./categories";

export type ParsedItem = { item: string; amount: number; category: Category };

export type RuleParseResult = {
  items: ParsedItem[];
  /** Pieces of the message the rules could not read. These go to the AI fallback. */
  unparsed: string[];
};

const MAX_AMOUNT = 100_000_000;

// "₦2,500", "N2500", "2k", "2.5k", "1.2m", "1500 naira", "2k5" (= 2,500)
const AMOUNT_RE =
  /(?:^|(?<=[\s(:=@-]))(?:₦|ngn|n|#)?\s?(\d+(?:\.\d+)?)(?:\s?(k|m)(\d{1,3})?)?(?:\s?(?:naira|ngn|nairas))?(?=$|[\s).!?])/gi;

// Words trimmed from the START and END of an item ("2k for suya", "spent 2k on suya today").
// Inside an item they stay, so "bolt to yaba" and "gift for mama" keep their meaning.
const FILLER =
  /^(i|me|my|just|bought|buy|paid|pay|spent|spend|gave|give|for|on|of|at|to|the|a|an|today|yesterday|cost|costs|was|is|abeg|sha|o)$/i;

function normalize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1") // drop thousands separators: 1,500 -> 1500
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1") // run twice for 1,500,000
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

/** Split a message into one piece per expense. */
export function splitSegments(text: string): string[] {
  return normalize(text)
    .split(/\s*(?:[,;\n]|\band\b|\+|&|\/\/)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function toAmount(num: string, suffix: string | undefined, tail: string | undefined): number {
  let value = parseFloat(num);
  if (suffix) {
    const mult = suffix.toLowerCase() === "m" ? 1_000_000 : 1_000;
    value *= mult;
    // "2k5" means 2,500; "1m2" means 1,200,000
    if (tail) value += parseFloat(`0.${tail}`) * mult;
  }
  return Math.round(value);
}

function cleanItem(raw: string): string {
  const words = raw.replace(/[-:=@()]+/g, " ").split(/\s+/).filter(Boolean);
  while (words.length && FILLER.test(words[0])) words.shift();
  while (words.length && FILLER.test(words[words.length - 1])) words.pop();
  return words.join(" ");
}

/** Parse a single piece like "suya 2k" or "2k for suya". Returns null if it can't. */
export function parseSegment(input: string): ParsedItem | null {
  const segment = normalize(input);
  const matches = [...segment.matchAll(AMOUNT_RE)];
  if (matches.length === 0) return null;

  // With several numbers ("2 plates rice 3000"), prefer one with a money marker, else the biggest.
  const scored = matches.map((m) => {
    const amount = toAmount(m[1], m[2], m[3]);
    const marked = /[₦#]|^\s?n|k|m|naira|ngn/i.test(m[0].trim());
    return { m, amount, marked };
  });
  const pick =
    scored.filter((s) => s.marked).sort((a, b) => b.amount - a.amount)[0] ??
    scored.sort((a, b) => b.amount - a.amount)[0];

  if (!pick || pick.amount <= 0 || pick.amount > MAX_AMOUNT) return null;

  const idx = pick.m.index ?? 0;
  const rest = segment.slice(0, idx) + " " + segment.slice(idx + pick.m[0].length);
  const item = cleanItem(rest);
  if (!item || !/[a-z]/i.test(item)) return null;

  // The item first ("gift for mama" -> gifts); then how it was said ("gave Tunde 5k" -> family & friends).
  const category = guessCategory(item) ?? guessFromVerb(segment);
  return { item: item.toLowerCase(), amount: pick.amount, category: category ?? "other" };
}

/** Rule-based parser. Handles most everyday entries without any AI call. */
export function ruleParse(text: string): RuleParseResult {
  const items: ParsedItem[] = [];
  const unparsed: string[] = [];
  for (const seg of splitSegments(text)) {
    const parsed = parseSegment(seg);
    if (parsed) items.push(parsed);
    else unparsed.push(seg);
  }
  return { items, unparsed };
}

const NUMBER_HINT =
  /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|grand|k)\b/i;

/** Does this text mention a number at all (digits or words)? If not, no parser or AI can find an amount. */
export function hasNumberHint(text: string): boolean {
  return NUMBER_HINT.test(text);
}

/**
 * Read a single amount typed on its own, e.g. in the edit sheet: "2500", "2,500", "₦2,500", "2k", "2.5k", "2k5".
 * Returns whole naira, or null if it isn't exactly one amount.
 */
export function parseAmount(text: string): number | null {
  const t = normalize(text);
  if (!t) return null;
  const m = [...t.matchAll(AMOUNT_RE)];
  if (m.length !== 1 || m[0][0].trim() !== t) return null;
  const amount = toAmount(m[0][1], m[0][2], m[0][3]);
  return amount > 0 && amount <= MAX_AMOUNT ? amount : null;
}
