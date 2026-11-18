// Kudi Log service worker: a small offline shell, nothing more.
// - Pages: network first. Offline, show the last copy of that page, else /offline.
// - Built JS/CSS/fonts/icons: cache first (their names change on every deploy).
// - API, auth and anything not GET: never cached.
// Bump VERSION to drop old caches.
const VERSION = "v2";
const SHELL = `kudi-shell-${VERSION}`;
const PAGES = `kudi-pages-${VERSION}`;
const ASSETS = `kudi-assets-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      await shell.addAll(["/icons/icon-192.png", "/manifest.webmanifest"]);
      // Cache the offline page AND every script/style it loads: without its JS it can't hydrate offline.
      const res = await fetch(OFFLINE_URL, { cache: "reload" });
      await shell.put(OFFLINE_URL, res.clone());
      const html = await res.text();
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? [])];
      const store = await caches.open(ASSETS);
      await Promise.all(assets.map((a) => store.add(a).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, PAGES, ASSETS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Signing out: forget cached pages, they belong to the person who just left.
  if (url.pathname === "/auth/signout") {
    event.respondWith(caches.delete(PAGES).then(() => fetch(req)));
    return;
  }
  if (req.method !== "GET") return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          // Keep the last good copy of the signed-in screens for offline viewing.
          if (res.ok && !res.redirected && ["/today", "/insights", "/settings", "/summary"].includes(url.pathname)) {
            const cache = await caches.open(PAGES);
            cache.put(url.pathname, res.clone());
          }
          return res;
        } catch {
          const cached = await caches.match(url.pathname, { cacheName: PAGES });
          return cached ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
        }
      })(),
    );
  }
});
