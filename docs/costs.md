# Running Kudi Log for ₦0

Rule: use free tiers until real users force a change, and keep each service behind one small module so swapping later is easy. Free-tier limits change, so check each provider's pricing page when you sign up.

| Need | Free choice | Limit to watch | When it bites, switch to |
|---|---|---|---|
| Hosting + API | Vercel Hobby | Hobby is for non-commercial use. Cron runs once a day at most (that's enough for the 9 PM summary). | Cloudflare Workers/Pages free tier (allows commercial use), or Vercel Pro if you start charging |
| Database + auth | Supabase Free | 500 MB database. **The project pauses after about a week with no activity**, so keep using it, or ping it from the daily cron. | Supabase Pro, only when you have real users |
| Sign-in | Supabase Auth: Google OAuth + email magic link | Built-in email sending is rate-limited to a few emails an hour, which is fine for testing | Resend free tier as the SMTP provider, or rely on Google sign-in |
| AI parsing | Groq free tier | Per-minute and per-day request caps. The rule parser handles most entries, so AI calls stay rare. | Gemini free tier (same `lib/ai.ts` function, set `AI_PROVIDER=gemini`) |
| Voice notes | Browser speech recognition (Chrome, ₦0, no server), else Groq Whisper `whisper-large-v3-turbo` free tier (iPhone, Firefox, Telegram voice notes) | Whisper free tier is shared with AI parsing by the whole Groq account: about 2,000 requests and 28,800 audio seconds a day (check the Limits page in the Groq console). Each request counts as at least 10 s. `/api/transcribe` also caps each person at 20 notes per 10 minutes. Audio is never stored. | Groq paid is $0.04 per audio hour (about $0.0001 per 10 s note). Under the ₦0 rule we don't upgrade: the app says "Voice is busy right now, type it for now" |
| Chat channel | Telegram Bot API | Free, about 30 messages a second, which is plenty | n/a |
| WhatsApp | **Not used.** From 1 Oct 2026 every WhatsApp Platform message in Nigeria is charged | | Only for alerts, much later |
| SMS / OTP | **Not used** (paid) | | Google sign-in or email instead |
| Payments | **None in v1** | | Paystack when you need it: no setup fee, pay per transaction only |
| App stores | **Skipped.** Use an installable PWA | Apple charges $99 a year | Wrap the PWA (Capacitor or TWA) for the Play Store's one-off $25 fee, if ever |
| Domain | `kudi-log.vercel.app` | | A `.com.ng` or `.ng` domain when you want a real brand |
| Analytics | Vercel Web Analytics (free on Hobby) or none | | n/a |

## Keeping AI calls near zero

1. The rule parser runs first and handles most entries, like "suya 2k" and "transport 1,500".
2. Only unreadable pieces go to the AI, batched into one call per message.
3. Cache by normalised text so the same weird phrase is never sent twice.
4. If the AI fails or hits a limit, the app asks the user ("How much was it?") instead of erroring.
