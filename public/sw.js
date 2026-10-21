
const CACHE_NAME = "chlorine-analyzer-v1";

const APP_SCOPE = self.registration.scope;

const APP_SHELL = [
  APP_SCOPE,
  new URL("index.html", APP_SCOPE).href,
  new URL("manifest.webmanifest", APP_SCOPE).href,
  new URL("icon.svg", APP_SCOPE).href,
  new URL("icon-192.png", APP_SCOPE).href,
  new URL("icon-512.png", APP_SCOPE).href,
  new URL("apple-touch-icon.png", APP_SCOPE).href
];

// Install: cache the application shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })
  );
});

// Activate: remove outdated caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// Fetch: cache application resources, never device APIs.
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Do not intercept ESP32-C3 requests or other origins.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Do not cache API responses.
  if (url.pathname.includes("/api/")) {
    return;
  }

  // Network-first for navigation.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);

        return (
          (await cache.match(APP_SCOPE)) ||
          Response.error()
        );
      })
    );

    return;
  }

  // Cache-first for static resources.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);

      if (cached) {
        return cached;
      }

      const response = await fetch(request);

      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    })()
  );
});
