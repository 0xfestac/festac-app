const CACHE_NAME = "festac-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/register.html",
  "/dashboard.html",
  "/send.html",
  "/fund.html",
  "/transaction.html",
  "/css/style.css",
  "/js/app.js",
  "/manifest.json",
  "/icon.png"
];

// Install — cache all assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener("fetch", event => {
  // Don't cache API calls
  if (event.request.url.includes("festac.onrender.com")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});