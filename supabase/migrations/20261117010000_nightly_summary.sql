-- Nightly summary (step 8): remember the last Lagos day we sent it, so a cron that fires twice
-- (or a manual re-run after a partial failure) never sends anyone the same summary twice.
-- Not granted to users: only the cron (admin client) writes it.
alter table public.profiles add column if not exists last_summary_sent_on date;

create index if not exists profiles_nightly on public.profiles (nightly_summary) where telegram_chat_id is not null;
