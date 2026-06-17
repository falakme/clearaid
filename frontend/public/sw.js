/* ClearAid service worker — offline shell + translation caching.
 *
 * Caching strategy so a user keeps a working app offline:
 *  - App shell + static GETs: cache-first, fall back to network, then "/".
 *  - POST /api/translate-form: network-first; on success, store the JSON
 *    response keyed by a hash of the request body; on failure, replay the
 *    cached translation for that exact input.
 */
const SHELL_CACHE = "clearaid-shell-v3";
const TRANSLATE_CACHE = "clearaid-translate-v3";
const SHELL = ["/", "/manifest.json", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = [SHELL_CACHE, TRANSLATE_CACHE];
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

async function handleTranslate(request) {
  const cache = await caches.open(TRANSLATE_CACHE);
  const LAST = "/__translate__/last";
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
