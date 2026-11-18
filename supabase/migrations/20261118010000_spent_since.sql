-- Spending logged after a moment (for "money left"). security invoker: with a user's session RLS still limits it
-- to their own rows whatever uid is passed; the bot's admin client passes the linked user's id.
create or replace function public.spent_since(uid uuid, since timestamptz)
returns bigint
language sql stable security invoker set search_path = public as $$
  select coalesce(sum(amount), 0)::bigint from public.entries where user_id = uid and created_at > since;
$$;
