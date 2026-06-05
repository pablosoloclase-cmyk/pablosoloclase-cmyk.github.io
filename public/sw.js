// ── EL SISTEMA — Service Worker ──
// Estrategia: network-first para HTML/JS/CSS (siempre coge la última versión)
//             cache-first para assets pesados (bgm.mp3, imágenes)

const CACHE_NAME = 'el-sistema-v4';
const STATIC_CACHE = 'el-sistema-static-v4';

// Archivos que queremos en caché para funcionar offline
const PRECACHE = ['/', '/index.html', '/manifest.json'];

// ── INSTALL: precachea lo mínimo y activa inmediatamente ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()) // activa sin esperar a que cierren las pestañas
  );
});

// ── ACTIVATE: borra cachés antiguas y toma el control de todas las pestañas ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // toma control inmediato de todas las pestañas abiertas
      .then(() => {
        // Notifica a todos los clientes que hay una actualización
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// ── FETCH: network-first para todo excepto audio ──
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Audio (bgm.mp3): cache-first — es pesado y no cambia frecuente
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // Todo lo demás: network-first
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la red responde OK, actualiza la caché y devuelve la respuesta fresca
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sin red: intenta la caché
        return caches.match(event.request)
          .then(cached => cached || caches.match('/index.html'));
      })
  );
});
