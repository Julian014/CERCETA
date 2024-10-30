// Escucha el evento de instalación del Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('v1').then(cache => {
            return cache.addAll([
                '/', // Página de inicio o principal
                '/login', // Ruta del login que carga la vista Handlebars
                '/styles.css', // Archivo de estilos global
                '/app.js', // Archivo de JavaScript global
                '/manifest.json', // Archivo de manifest para PWA
                '/imagenes/logo%20pestaña.PNG', // Asegúrate de que el espacio se codifique correctamente
                '/imagenes/logo%20pestaña.PNG', // Asegúrate de que el espacio se codifique correctamente
            ]);
        })
    );
});

// Escucha el evento de fetch para manejar las solicitudes de red
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Si hay una respuesta en la caché, devuélvela; si no, realiza la solicitud a la red
            return response || fetch(event.request);
        })
    );
});
