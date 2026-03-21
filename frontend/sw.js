const CACHE_NAME = "festac-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/register.html",
  "/dashboard.html",
  "/send.html",
  "/fund.html",
  "/transaction.html",
  "/setpin.html",
  "/css/style.css",
  "/js/app.js",
  "/manifest.json",
  "/icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

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

self.addEventListener("fetch", event => {
  if (event.request.url.includes("onrender.com")) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});