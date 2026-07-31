/**
 * SIFAU — Offline-first service worker for fiscal inspection mode.
 *
 * Em ambientes sem conectividade (fiscal em campo em área periférica),
 * este service worker intercepta requisições e serve cache local.
 * Os dados de vistoria são armazenados em IndexedDB (via localStorage fallback
 * no FiscalInspection.tsx) e sincronizados ao reconectar.
 *
 * Para produção, substituir este stub por Workbox:
 *   npm install workbox-precaching workbox-routing workbox-strategies
 */

const CACHE_NAME = 'sifau-cache-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Network-first for API calls, cache-first for static assets
  if (request.url.includes('/rest/v1') || request.url.includes('/functions/v1')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request) ?? new Response('Offline', { status: 503 }))
    );
  } else {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request))
    );
  }
});

// Listen for online event to trigger sync
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_PENDING') {
    // Dispatch custom event for app to handle sync
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'ONLINE_SYNC' }));
    });
  }
});
