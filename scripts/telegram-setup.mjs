// Points Telegram at this app's webhook and sets the bot's command menu.
// Usage: npm run bot:setup -- https://your-public-url   (a tunnel locally, or the Vercel URL)
// Reads TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from .env.local.

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

if (!token || !secret) {
  console.error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in .env.local first (see docs/setup.md).");
  process.exit(1);
}
if (!base.startsWith("https://")) {
  console.error("Pass the public https URL, e.g. npm run bot:setup -- https://abc.trycloudflare.com");
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`${method}: ${data.ok ? "ok" : data.description}`);
  if (!data.ok) process.exitCode = 1;
}

await call("setWebhook", {
  url: `${base}/api/telegram`,
  secret_token: secret,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: true,
});
await call("setMyCommands", {
  commands: [
    { command: "today", description: "Your day so far" },
    { command: "week", description: "The last 7 days" },
    { command: "money", description: "Money left and your budget" },
    { command: "undo", description: "Remove your last log" },
    { command: "summary", description: "Turn the 9 PM summary on or off" },
    { command: "help", description: "How to use Kudi Log" },
  ],
});
await call("setMyDescription", {
  description: "Type your spending the way you'd say it (suya 2k, transport 1,500) and get your day in kudi at 9 PM.",
});
