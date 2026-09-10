const CACHE_NAME = 'georgiswork-v1.4.0';

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

// 3. Evento Fetch: 100% Offline primero, con actualización de fondo si hay conexión
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      // Si el recurso ya existe en la caché local, se entrega DE INMEDIATO (funciona sin internet)
      if (cachedResponse) {
        // En segundo plano, si hay conexión a internet, intentamos refrescar la caché silenciosamente
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Sin conexión: no pasa nada, ya entregamos la versión local de caché
          });

        return cachedResponse;
      }

      // Si no estaba en caché, buscar en la red y guardar copia
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
          // Fallback offline si intentan navegar a cualquier ruta sin conexión
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
    })
  );
});
