// Kabab House service worker: cache app shell + static assets, serve cached pages offline.
const VERSION = "kh-v2";
const key = (url) => url.origin + url.pathname; // ignore ?query (receipt uses ?id=)

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(["/icon.svg"]).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const put = (k, res) => caches.open(VERSION).then((c) => c.put(k, res));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET") return;
  // Menu photos / logo from Supabase Storage: cache-first so they show offline.
  if (url.pathname.includes("/storage/v1/object/public/")) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) put(req, res.clone());
        return res;
      })),
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || /\.(?:png|svg|ico|woff2?|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) put(req, res.clone());
        return res;
      })),
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) put(key(url), res.clone());
          return res;
        })
        .catch(() => caches.match(key(url)).then((hit) => hit || caches.match(url.origin + "/pos")))
        .then((res) => res || new Response("Offline — open this page once while online.", { status: 503, headers: { "Content-Type": "text/plain" } })),
    );
  }
});
