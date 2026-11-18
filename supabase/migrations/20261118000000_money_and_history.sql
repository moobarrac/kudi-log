-- Money left, monthly budget, and fast totals for months, years and search.

-- Money the user has, as a running record: "set" = "this is what I have now", "add" = income (salary, transfer in).
-- Money left = latest "set" + "add"s after it - spending logged after it. Computed in code (lib/money-left.ts).
create table if not exists public.money_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('set', 'add')),
  amount integer not null check (amount >= 0 and amount <= 1000000000),  -- whole naira
  note text check (char_length(note) <= 60),
  created_at timestamptz not null default now()
);
create index if not exists money_events_user_time on public.money_events (user_id, created_at desc);
alter table public.money_events enable row level security;
drop policy if exists "own money" on public.money_events;
create policy "own money" on public.money_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Monthly budget (whole naira, null = none). Users may set it themselves.
alter table public.profiles add column if not exists monthly_budget integer check (monthly_budget is null or monthly_budget > 0);
grant update (monthly_budget) on public.profiles to authenticated;

-- Totals per calendar month since a day. security invoker + auth.uid(): only ever the caller's own rows.
create or replace function public.monthly_totals(since date)
returns table (month date, total bigint, entries bigint)
language sql stable security invoker set search_path = public as $$
  select date_trunc('month', spent_on)::date as month, sum(amount)::bigint, count(*)::bigint
  from public.entries
  where user_id = auth.uid() and spent_on >= since
  group by 1
  order by 1;
$$;

-- Total and count for a search over the caller's entries (item contains q), optionally within days.
create or replace function public.spend_total(q text default null, from_day date default null, to_day date default null)
returns table (total bigint, entries bigint)
language sql stable security invoker set search_path = public as $$
  select coalesce(sum(amount), 0)::bigint, count(*)::bigint
  from public.entries
  where user_id = auth.uid()
    and (q is null or item ilike '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and (from_day is null or spent_on >= from_day)
    and (to_day is null or spent_on <= to_day);
$$;

-- Search by item stays fast as history grows.
create extension if not exists pg_trgm;
create index if not exists entries_item_trgm on public.entries using gin (item gin_trgm_ops);
