export const CATEGORIES = {
  food: { label: "Food", emoji: "🍲" },
  transport: { label: "Transport", emoji: "🚌" },
  airtime_data: { label: "Airtime & data", emoji: "📶" },
  bills: { label: "Bills", emoji: "💡" },
  groceries: { label: "Groceries", emoji: "🛒" },
  shopping: { label: "Shopping", emoji: "🛍️" },
  health: { label: "Health", emoji: "💊" },
  family: { label: "Family & friends", emoji: "👪" },
  gifts: { label: "Gifts", emoji: "🎁" },
  fun: { label: "Fun", emoji: "🎉" },
  betting: { label: "Betting", emoji: "🎲" },
  other: { label: "Other", emoji: "📦" },
} as const;

export type Category = keyof typeof CATEGORIES;

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && value in CATEGORIES;
}

/** Plain label for the web UI (no emoji there; icons come from components/category-style.ts). */
export function categoryLabel(c: string): string {
  return (isCategory(c) ? CATEGORIES[c] : CATEGORIES.other).label;
}

/** Emoji + label, for Telegram messages only. */
export function categoryEmojiLabel(c: string): string {
  const meta = isCategory(c) ? CATEGORIES[c] : CATEGORIES.other;
  return `${meta.emoji} ${meta.label}`;
}

// Keyword -> category. Matched against whole words in the item name, longest keyword first.
const KEYWORDS: Record<Category, string[]> = {
  food: [
    "suya", "amala", "eba", "fufu", "semo", "pounded yam", "iyan", "jollof", "rice", "fried rice", "beans",
    "moi moi", "moimoi", "akara", "bole", "boli", "puff puff", "puff-puff", "shawarma", "pizza", "burger",
    "chicken", "turkey", "meat", "fish", "pepper soup", "peppersoup", "noodles", "indomie", "spag", "spaghetti",
    "bread", "egg", "eggs", "yam", "plantain", "dodo", "abacha", "ofada", "tuwo", "food", "lunch", "breakfast",
    "dinner", "snacks", "snack", "chops", "small chops", "drink", "drinks", "water", "pure water", "sachet water",
    "coke", "malt", "zobo", "kunu", "chapman", "ice cream", "chin chin", "chinchin", "gala", "biscuit",
    "biscuits", "doughnut", "cake", "buka", "mama put", "restaurant", "chicken republic", "kfc", "dominos",
    "tea", "coffee", "corn", "groundnut", "meat pie", "sausage", "pap", "ogi", "agege", "chop",
  ],
  transport: [
    "transport", "t-fare", "tfare", "fare", "danfo", "bus", "brt", "keke", "napep", "okada", "bike", "bolt",
    "uber", "indrive", "taxi", "cab", "ride", "train", "ferry", "boat", "fuel", "petrol", "diesel", "gas station",
    "toll", "parking", "flight", "lekki toll",
  ],
  airtime_data: ["airtime", "data", "recharge", "recharge card", "mtn", "glo", "airtel", "9mobile", "bundle", "wifi", "internet"],
  bills: [
    "light", "nepa", "phcn", "electricity", "prepaid", "meter", "token", "dstv", "gotv", "startimes", "netflix",
    "showmax", "spotify", "subscription", "rent", "water bill", "waste", "lawma", "service charge", "bill", "bills",
    "school fees", "fees", "tax", "levy",
    "charge", "charges", "bank charge", "bank charges", "transfer charge", "transfer fee", "sms alert", "stamp duty", "maintenance fee", "card fee",
  ],
  groceries: [
    "groceries", "grocery", "market", "foodstuff", "foodstuffs", "garri", "tomatoes", "tomato", "pepper", "onions",
    "onion", "oil", "palm oil", "groundnut oil", "maggi", "salt", "sugar", "milk", "peak milk", "milo", "provisions",
    "supermarket", "shoprite", "spar", "bag of rice", "detergent", "soap", "toiletries", "tissue",
  ],
  shopping: [
    "shoe", "shoes", "clothes", "cloth", "shirt", "trouser", "trousers", "dress", "ankara", "aso ebi", "bag",
    "wig", "hair", "attachment", "jumia", "konga", "phone", "charger", "earpiece", "headphones", "gadget",
    "perfume", "cream", "lotion", "makeup", "watch", "slippers",
  ],
  health: [
    "drugs", "drug", "medicine", "pharmacy", "chemist", "hospital", "clinic", "doctor", "test", "malaria",
    "panadol", "paracetamol", "vitamin", "vitamins", "dental", "lab",
  ],
  // Gifts come before family: "gift for mama" is a gift, even though it mentions family.
  gifts: [
    "gift", "gifts", "present", "presents", "birthday", "birthday gift", "wedding gift", "hamper", "hampers", "souvenir",
    "souvenirs", "flowers", "bouquet", "gift card", "anniversary", "valentine", "christmas gift", "sallah gift", "surprise",
    // Money given away (church, mosque, charity) lives here too since "Church & giving" was removed.
    "offering", "tithe", "church", "mosque", "zakat", "sadaka", "donation", "seed", "thanksgiving", "beggar", "alms",
  ],
  family: [
    "mum", "mom", "mummy", "mama", "mother", "dad", "daddy", "papa", "father", "parents", "iya", "baba",
    "sister", "sis", "brother", "bro", "sibling", "siblings", "twin", "twins", "cousin", "cousins", "nephew", "niece",
    "grandma", "grandpa", "granny", "grandmother", "grandfather", "in-law", "in law", "son", "daughter",
    "family", "relatives", "baby", "kids", "children", "wife", "husband", "aunty", "auntie", "uncle",
    "friend", "friends", "bestie", "babe", "bae", "girlfriend", "boyfriend", "fiance", "fiancee",
  ],
  fun: [
    "movie", "movies", "cinema", "club", "party", "beer", "beers", "alcohol", "wine",
    "game", "games", "ps", "playstation", "outing", "hangout", "suites", "lounge", "shisha", "concert",
    "barbing", "barber", "salon", "haircut",
  ],
  betting: [
    "bet", "bets", "betting", "stake", "stakes", "staked", "odds", "acca", "accumulator", "booking code", "bet slip",
    "sportybet", "sporty", "bet9ja", "betking", "1xbet", "bet365", "betway", "nairabet", "merrybet", "msport",
    "msports", "betano", "parimatch", "22bet", "melbet", "betwinner", "surebet", "naijabet", "accessbet",
    "lotto", "lottery", "baba ijebu", "premier lotto", "golden chance", "casino", "aviator", "jackpot", "slots",
  ],
  other: [],
};

const KEYWORD_LIST: Array<[string, Category]> = Object.entries(KEYWORDS)
  .flatMap(([cat, words]) => words.map((w) => [w, cat as Category] as [string, Category]))
  .sort((a, b) => b[0].length - a[0].length);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const KEYWORD_RES: Array<[RegExp, Category]> = KEYWORD_LIST.map(([w, c]) => [
  new RegExp(`(^|[^a-z0-9])${escapeRe(w)}($|[^a-z0-9])`, "i"),
  c,
]);

/**
 * Money handed to a person ("gave Tunde 5k", "sent my guy 2k", "transfer to Chidi 10k") is family & friends
 * even when we don't know who the person is. Checked against the whole piece, after the keywords.
 */
const GIVEN_TO_SOMEONE = /\b(gave|give|sent|send|transferred|transfer(?:\s+to)?|lent|lend|dashed|dash)\b/i;

export function guessFromVerb(text: string): Category | null {
  return GIVEN_TO_SOMEONE.test(text) ? "family" : null;
}

/** Returns a category if a keyword matches, or null if we don't recognise the item. */
export function guessCategory(item: string): Category | null {
  for (const [re, cat] of KEYWORD_RES) {
    if (re.test(item)) return cat;
  }
  return null;
}
