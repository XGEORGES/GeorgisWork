const CACHE_NAME = 'georgiswork-v1.0.0';

const ASSETS_TO_PRECACHE = [
  './',
  './index.html',
  './icon.png',
  './manifest.json'
];

// 1. Evento Install: Precachear activos estáticos iniciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Evento Activate: Limpiar cachés antiguas si la versión cambia
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Evento Fetch: Estrategia Stale-While-Revalidate / Cache First para 100% offline
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean HTTP/HTTPS (ej. chrome-extension)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retornar de caché inmediatamente y actualizar en segundo plano si hay red
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Sin conexión: uso normal de la versión en caché
          });
        return cachedResponse;
      }

      // Si no está en caché, buscar en la red y almacenar
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback offline para navegación HTML
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
