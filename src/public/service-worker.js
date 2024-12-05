const CACHE_NAME = 'app-cache-v1';
const urlsToCache = [
    '/',                  // Página raíz
    '/login',             // Página de login
    '/styles.css',        // Archivo CSS principal
    '/app.js',            // Archivo JavaScript principal
    '/manifest.json',     // Manifesto de la aplicación
    'imagenes/apk192.png' // Iconos
];

// Instalación del Service Worker
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(urlsToCache).catch((error) => {
                console.error('Error al almacenar en caché:', error);
            });
        }).then(() => self.skipWaiting()) // Forzar la activación del nuevo Service Worker
    );
});

// Activación del Service Worker (limpiar cachés antiguas)
self.addEventListener('activate', function (event) {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log(`Eliminando caché antigua: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Tomar el control de la aplicación
    );
});

// Interceptor de solicitudes (fetch)
self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request).then(function (response) {
            if (response) {
                return response; // Responder desde la caché
            }
            return fetch(event.request).catch((error) => {
                console.error('Error al hacer fetch:', error);
            });
        })
    );
});