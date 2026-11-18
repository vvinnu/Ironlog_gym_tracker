
const CACHE = "ironlog-v2";
const BASE = "/Ironlog_gym_tracker/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        BASE,
        BASE + "manifest.webmanifest"
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE && key.startsWith("ironlog-"))
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin + BASE)) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
