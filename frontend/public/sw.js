/* ClearAid service worker — offline shell + API caching + Web Push.
 *
 * Caching strategy so a displaced user keeps a working app offline:
 *  - App shell + static GETs: cache-first, fall back to network, then "/".
 *  - GET /api/alerts: network-first; cache each success; serve cache offline.
 *  - POST /api/translate-form: network-first; on success, store the JSON
 *    response keyed by a hash of the request body; on failure, replay the
 *    cached translation for that exact input.
 */
const SHELL_CACHE = "clearaid-shell-v2";
const API_CACHE = "clearaid-api-v2";
const TRANSLATE_CACHE = "clearaid-translate-v2";
const SHELL = ["/", "/manifest.json", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = [SHELL_CACHE, API_CACHE, TRANSLATE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Small string hash (djb2) to key cached translations by request body.
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

async function handleAlerts(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await fetch(request);
    // Only GET responses can be cached.
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
}

async function handleTranslate(request) {
  const cache = await caches.open(TRANSLATE_CACHE);
  const LAST = "/__translate__/last";
  // Clone + read the body so we can build a stable cache key. (Multipart
  // boundaries vary per request, so we also keep a "last successful" entry as
  // a reliable offline fallback.)
  let key = LAST;
  try {
    const body = await request.clone().text();
    key = "/__translate__/" + hashString(body);
  } catch (e) {
    /* fall back to last key */
  }
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const payload = await res.clone().text();
      const init = { status: 200, headers: { "Content-Type": "application/json" } };
      cache.put(new Request(key), new Response(payload, init));
      cache.put(new Request(LAST), new Response(payload, init));
    }
    return res;
  } catch (e) {
    const cached = (await cache.match(new Request(key))) || (await cache.match(new Request(LAST)));
    if (cached) return cached;
    return new Response(
      JSON.stringify({ detail: "You appear to be offline and no saved translation is available yet." }),
      { headers: { "Content-Type": "application/json" }, status: 503 }
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // API caching (same-origin proxied endpoints).
  if (sameOrigin && url.pathname === "/api/alerts" && request.method === "GET") {
    event.respondWith(handleAlerts(request));
    return;
  }
  if (sameOrigin && url.pathname === "/api/translate-form" && request.method === "POST") {
    event.respondWith(handleTranslate(request));
    return;
  }

  // Leave all other API calls alone (must be fresh).
  if (request.method !== "GET" || (sameOrigin && url.pathname.startsWith("/api"))) {
    return;
  }

  // Static / navigation: cache-first with network fallback, then shell.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).catch(() => caches.match("/"))
    )
  );
});

// --- Web Push ---
// Map a severity/status flag to a colored icon if the payload didn't include
// an explicit icon URL.
function iconForFlag(severity, status) {
  if (status === "resolved" || severity === "success") return "/icons/icon-green.svg";
  if (severity === "warning" || severity === "emergency" || status === "emergency") {
    return "/icons/icon-red.svg";
  }
  return "/icons/icon-blue.svg";
}

self.addEventListener("push", (event) => {
  let data = {
    title: "ClearAid",
    body: "New aid may be available in your area.",
    url: "/emergency",
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    /* keep defaults */
  }
  // Title is strictly "ClearAid"; the body carries the alert name.
  const icon = data.icon || iconForFlag(data.severity, data.status);
  event.waitUntil(
    self.registration.showNotification("ClearAid", {
      body: data.body,
      icon: icon,
      badge: icon,
      vibrate: [120, 60, 120],
      data: { url: data.url || "/emergency" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/emergency";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
