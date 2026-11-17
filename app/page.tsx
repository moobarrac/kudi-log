import { Welcome } from "@/components/Welcome";
import { safeNext } from "@/lib/auth";
import { supabaseEnv } from "@/lib/supabase/env";

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function WelcomePage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  return (
    <Welcome
      next={safeNext(next)}
      error={error ?? null}
      telegramUrl={bot ? `https://t.me/${bot}` : null}
      configured={supabaseEnv() !== null}
    />
  );
}
