# Kudi Log design: "Night Market"

Live mockups: https://claude.ai/artifact/FsXD8s5d54qbuV1eRBZ45C (screen 3 is interactive, so you can type into it).

## The idea in one line

A warm paper background, a deep ink "hero" card holding the money, and one electric lime accent that only appears for money moments. It should feel calm and premium, like a nice wallet. It should not look like a bank.

## Principles

1. **One input does everything.** The black "What did you spend on?" bar is always at the bottom of Today. Typing is the main way to log, and quick chips (recent items) are the shortcut.
2. **Read it as you type.** Parsed rows appear live under the input. The user sees exactly what will be saved before they tap Log. Anything the rules can't read shows as a dashed amber row ("AI will take a look").
3. **Numbers are the hero.** Amounts use Bricolage Grotesque 800 with tight tracking. Everything else is quiet Inter.
4. **Never slow.** Optimistic updates, no spinners for rule-parsed items, and skeletons rather than blank screens.
5. **Kind, not preachy.** Copy celebrates good days ("₦2,100 under your usual Monday") and never scolds.

## Tokens

All values are in `design/tokens.css`. The short version:

| Token | Value | Use |
|---|---|---|
| Ink | `#101412` | Text, hero card, primary button on paper |
| Paper | `#F4F2EC` | App background |
| Surface | `#FFFFFF` | Cards, inputs |
| Lime | `#C6F24E` | Main CTA, totals on ink. Text on lime is always ink |
| Emerald | `#0E7A4E` | Brand, links, good news |
| Muted | `#59615C` | Secondary text |

Each category has a tint (chip background), an ink (chip text) and a dot colour (charts). A category is always shown with its label, never by colour alone.

Type: Bricolage Grotesque (display: amounts and headings) and Inter (UI), with tabular figures on. Hero total is 56px on Today and 76px on the summary.

Shape: pill buttons are 56px tall with radius 28. Cards use radius 22–28, rows 18 and icon tiles 12. Touch targets are at least 44px, with 16px screen gutters on a 4px grid.

Icons: Lucide (stroke 2). No emoji in the UI.

## Screens

1. **Welcome.** Ink background, three tilted sample cards (Suya ₦2,000, Danfo ₦800, a lime "Spent today ₦12,700"), headline "Know where your money went. Every day.", Continue with Google (lime), Use my email instead (outline), and "Prefer chat? Start on Telegram".
2. **Today (home).** Greeting and date. Hero ink card with "Spent today", the lime total, a comparison line, a segmented category bar and legend. A "Your day in kudi is ready" card after 6 PM. The entry list (icon tile with category tint, item, time and source, amount). A Money card (money left, budget bar). Fixed bottom: the log bar and nav (Today, Insights, History, Settings).
3. **Quick log (sheet).** Close, title, and a "Today" date picker for backdating. A big input with a 2px ink border and the label "Type it the way you'd say it". A mic button: tap to speak, tap the square to stop. Words land in the box and the live preview reads them; nothing is logged until the CTA. Chrome uses the browser's own speech recognition (live words); iPhone and other browsers record a short clip (max 30s) that Groq Whisper transcribes. Quick chips. "Reading it as you type" with live parsed rows. A fixed lime CTA: "Log 3 items ₦4,500".
4. **End-of-day summary.** Full-screen ink, story-style progress bars at the top. "You spent ₦12,700 across 6 entries", the comparison, "Biggest bite" with category bars, biggest single spend, and the logging streak. Buttons: Share card and See my week. The share card is the same layout rendered as an image.
5. **Week insights.** Week/Month/Year tabs, the week total and daily average, a 7-day bar chart with today in emerald, one computed insight on an ink card, "Where it went" with change against last week (up is red-brown, down is emerald), and "coming soon" tiles for Who owes me and Rent Ready.
6. **Insights: Month and Year.** Month: ‹ November 2026 › to step through months, "So far this month" total, a fair comparison card ("₦17,126 less than this point in October · 1–18 Oct: ₦131,732"), the budget bar for the current month, a day-by-day chart (future days dashed; drag or tap across it to pick a day; "See entries" jumps to History), the insight, Biggest single spend and Heaviest day tiles, and Where it went vs the month before. Year: the last 12 months as bars (current month emerald; tap one to open it), the monthly average, and Month by month with change against the month before.
7. **History.** Search by item, period chips (All time, This month, Last month, 3 months, or a single day from Insights), an ink total card for the filter ("“suya” this month · ₦5,000 across 2 entries"), entries grouped by day with day totals, edit and swipe-to-delete with Undo, older entries load as you scroll.
8. **Money.** Ink card with Money left and how long it lasts at your pace ("about 27 days, to around 15 Dec"), Update balance and Add money. Monthly budget with what's left, a daily amount, and a tick for where an even spread would be (amber when ahead of pace, never red). Balance history. On Today, a Money card under the hero shows money left and the budget bar and updates as you log.
9. **Telegram bot.** Confirmations list each item with its category and amount, plus "Today so far". Inline buttons: Undo and Fix a category. `/today` replies with the summary. When there's no amount, the bot asks "How much was it?".

## Motion

- Parsed rows enter at 150ms ease-out (`--ease-out`), with a 30ms stagger.
- The hero total counts up to its new value in 400ms after logging.
- Swipe an entry left to delete. An Undo toast stays for 5 seconds, with no confirm dialog.
- Sheets use vaul with drag to dismiss.
- A light haptic (`navigator.vibrate(10)`) on log, delete and undo where supported.
- Respect `prefers-reduced-motion`: no count-up, and fades instead of slides.

## Dark mode

Paper becomes ink, cards become `#1E2421`, and emerald lightens to `#7BE0A8`. The hero card stays dark and lime stays the money colour. Tokens are already in `tokens.css`.

## Accessibility

Text contrast is at least 4.5:1 (Muted on Paper is about 5.6:1). Use real buttons and links with visible focus rings (2px emerald). Icon-only buttons get `aria-label`, and charts get a text alternative.
