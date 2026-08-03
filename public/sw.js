// Minimal service worker: exists solely to satisfy PWA installability
// requirements (a registered SW with a fetch handler). It intentionally
// does no caching so site behavior is unchanged — every request just
// passes straight through to the network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
