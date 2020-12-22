importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.0.2/workbox-sw.js');

const CACHE_NAME = 'offline-html';
const FALLBACK_HTML_URL = '/offline.html';
self.addEventListener('install', async (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.add(FALLBACK_HTML_URL))
    );
});

workbox.navigationPreload.enable();

const networkOnly = new workbox.strategies.NetworkOnly();
const navigationHandler = async (params) => {
    try {
        return await networkOnly.handle(params);
    } catch (error) {
        return caches.match(FALLBACK_HTML_URL, {
            cacheName: CACHE_NAME,
        });
    }
};

workbox.routing.registerRoute(
    new workbox.routing.NavigationRoute(navigationHandler)
);

workbox.routing.registerRoute(
    ({
        request
    }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: 'static-resources',
    })
);