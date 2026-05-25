const CACHE_NAME = 'rapidingo-v12';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',  './icons/client-192.png',
  './icons/client-512.png',
  './icons/delivery-192.png',
  './icons/delivery-512.png',
  './assets/brand/rapidingo-logo.png',
  './assets/client/restaurant.png',
  './assets/client/pharmacy.png',
  './assets/client/other.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            if (event.request.url.startsWith('http')) {
              cache.put(event.request, responseToCache);
            }
          });
          return networkResponse;
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (!cacheWhitelist.includes(cacheName)) {
          return caches.delete(cacheName);
        }
        return undefined;
      })
    ))
      .then(() => self.clients.claim())
  );
});

