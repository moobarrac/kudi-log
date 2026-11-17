# Setting up Supabase

Develop against a **local** Supabase (Docker, free, no email limits). Create the **hosted** project only when you deploy.

## Local (day to day)

Needs OrbStack running (`brew install --cask orbstack`, open it once) and the CLI (`brew install supabase/tap/supabase`).

```bash
npm run db:start     # first run downloads images, a few minutes
npm run db:status    # prints the URL and keys again
```

Put the local values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<"Publishable" / anon key from db:status>
SUPABASE_SERVICE_ROLE_KEY=<"Secret" / service_role key from db:status>
```

| What | Where |
|---|---|
| App | http://localhost:3000 |
| Studio (tables, users, SQL) | http://127.0.0.1:54323 |
| Mailpit (every sign-in email lands here, nothing is really sent) | http://127.0.0.1:54324 |

- **Schema** lives in `supabase/migrations/`. `npm run db:reset` wipes the local DB and replays them. For a change: `supabase migration new <name>`, write SQL, `npm run db:reset`.
- **Auth settings** (site URL, redirect URLs, email template, rate limits) are in `supabase/config.toml`. Restart (`npm run db:stop && npm run db:start`) after editing.
- **Google sign-in is off locally.** Use email: type your address, open Mailpit, copy the code.
- **Testing on your phone:** set `NEXT_PUBLIC_SUPABASE_URL=http://<your-Mac-LAN-IP>:54321`, run `npm run dev -- -H 0.0.0.0`, and open `http://<your-Mac-LAN-IP>:3000`. If your LAN IP isn't in `additional_redirect_urls` in `config.toml`, add it and restart.

## Hosted (when you deploy)

1. Create a project at [supabase.com](https://supabase.com) (Free plan). A region near Nigeria: `eu-west-2` (London) or `af-south-1` (Cape Town).
2. Push the schema from this repo:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

3. **Authentication → URL Configuration:** Site URL `https://kudi-log.vercel.app`; Redirect URLs `https://kudi-log.vercel.app/**` (plus `http://localhost:3000/**` if you ever point local dev at it).
4. **Authentication → Emails → Templates:** paste `supabase/templates/sign-in.html` into **both** "Magic Link" and "Confirm signup" (subject: "Your Kudi Log sign-in code"). The code in it is what makes sign-in work in the installed iPhone app, where links open in Safari instead.
5. **Google sign-in:**
   1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → **OAuth consent screen**: External, app name "Kudi Log". Testing mode is fine at first (add testers' emails).
   2. **Credentials → Create credentials → OAuth client ID** → Web application. Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
   3. Supabase → **Authentication → Providers → Google**: enable, paste the client ID and secret.
6. Put the hosted URL, anon key and service role key in Vercel's environment variables.

Hosted Supabase's built-in email only sends a few emails an hour. Fine for a handful of users; for more, add Resend's free tier as custom SMTP (see `docs/costs.md`).

## Check it

- `/` shows Welcome; `/today` signed out sends you back to Welcome.
- Use my email → code arrives (Mailpit locally) → typing it lands on `/today` with your name.
- Sign out → back to Welcome.

# Setting up the Telegram bot

1. In Telegram, message **@BotFather**, send `/newbot`, and pick a name and a username ending in `bot`. Copy the token it gives you.
2. In `.env.local` set:
   ```bash
   TELEGRAM_BOT_TOKEN=<token from BotFather>
   TELEGRAM_BOT_USERNAME=<the username, without @>
   TELEGRAM_WEBHOOK_SECRET=<any long random string, e.g. from: openssl rand -hex 24>
   ```
   Restart `npm run dev` so the server picks them up.
3. Telegram needs a public https URL to reach your laptop. In a second terminal:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
   It prints a `https://….trycloudflare.com` address. The address changes every time you start the tunnel.
4. Point the bot at it (this also sets the bot's command menu):
   ```bash
   npm run bot:setup -- https://….trycloudflare.com
   ```
5. In the app, open **Settings → Link Telegram**. Telegram opens; tap **Start**. Back in the app, Settings shows "Telegram is linked". Now send the bot `suya 2k, transport 1,500`.

When you deploy, set the same three variables in Vercel and run `npm run bot:setup -- https://<your-app>.vercel.app` once.

Notes:
- The webhook rejects any request without the secret header, so only Telegram can post to it.
- Link codes expire after 15 minutes and work once.
- Buttons that open the website ("Open summary") only appear when `NEXT_PUBLIC_SITE_URL` is an https address; Telegram refuses `localhost` links.

# The 9 PM summary (cron)

`vercel.json` runs `GET /api/cron/daily-summary` at 20:00 UTC (9 PM Lagos). It sends:

- the day's summary to linked users who logged something today,
- a short nudge to people who logged in the last 7 days but not today,
- nothing to people who've been quiet longer, or who turned it off (`/summary off` or the switch in Settings).

Setup on Vercel: add a `CRON_SECRET` environment variable (any long random string). Vercel sends it as `Authorization: Bearer <CRON_SECRET>` automatically; without it the route returns 401. On the Hobby plan the cron fires once a day, at some point within that hour (so between 9 and 10 PM Lagos).

Try it locally (with `CRON_SECRET` in `.env.local` and the bot set up):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-summary
```

It replies with counts, e.g. `{"sent":1,"nudged":0,"skipped":0,"failed":0,"unlinked":0}`. Running it again the same day sends nothing new: each user is marked with the day they last got it. If someone blocks the bot, their chat is unlinked so we stop trying.

# Fonts

Both fonts are self-hosted and trimmed (`app/fonts/`, loaded with `next/font/local` in `app/layout.tsx`). The full Google versions were the heaviest thing on every page load (about 180 KB before any text could settle); these are about 94 KB together.

They keep Latin, Latin Extended, the Yoruba dotted vowels (ẹ ọ ṣ), ₦, arrows and typographic punctuation, plus the features we use (kerning, ligatures, tabular figures).

To rebuild them you need [fonttools](https://github.com/fonttools/fonttools) (`pip install fonttools brotli`):

```bash
U="U+0020-007E,U+00A0-017F,U+0300-036F,U+1E00-1EFF,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2032-2033,U+20A6,U+2190-2193,U+2212,U+00B7"

# Bricolage Grotesque 700 + 800, from the static TTFs in assets/fonts (also used by the share card)
for w in Bold ExtraBold; do
  pyftsubset assets/fonts/BricolageGrotesque-$w.ttf --unicodes="$U" --flavor=woff2 \
    --layout-features='kern,liga,calt,tnum,lnum,case' --output-file=app/fonts/bricolage-$w.woff2
done

# Inter: the variable font from google/fonts, optical size pinned at 14, weight 400-700
curl -L -o /tmp/Inter.ttf "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf"
python3 -c "from fontTools.ttLib import TTFont; from fontTools.varLib import instancer; instancer.instantiateVariableFont(TTFont('/tmp/Inter.ttf'), {'opsz': 14, 'wght': (400, 700)}).save('/tmp/Inter-14.ttf')"
pyftsubset /tmp/Inter-14.ttf --unicodes="$U" --flavor=woff2 \
  --layout-features='kern,liga,calt,tnum,lnum,case,ccmp,mark,mkmk' --output-file=app/fonts/inter-var.woff2
```

Bricolage only has 700 and 800 here, so use `font-bold` or `font-extrabold` with `font-display`. Inter covers 400 to 700. Both fonts are under the SIL Open Font License.
