-- Telegram linking (step 7).

-- One-time link codes expire, so an old screenshot of a code can't link someone else's chat later.
alter table public.profiles add column if not exists telegram_link_expires_at timestamptz;

-- When the bot asks "How much was it?", the item waits here for a reply that's just an amount ("5k").
alter table public.profiles add column if not exists telegram_pending text;

-- Users may only change their own name and the nightly summary switch from the browser.
-- Linking fields are set by the server (admin client) only, so nobody can point their account
-- at someone else's Telegram chat by writing telegram_chat_id themselves.
revoke insert, update on public.profiles from anon, authenticated;
grant update (display_name, nightly_summary) on public.profiles to authenticated;

-- Undo finds a whole logged message by its shared created_at.
create index if not exists entries_user_created on public.entries (user_id, created_at);
