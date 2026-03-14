const CACHE_NAME = 'destiny-os-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: Network First for API, Cache First for static
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Always go to network for API calls
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Cache First for everything else
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                // Cache successful GET responses
                if (event.request.method === 'GET' && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Fallback to index.html for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
