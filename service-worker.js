
const cacheName = 'emptydirectorylook-cache';
const filestoCache = [
    './',
    './index.html',
    './script.js',
    './style.css',
    "./assets/icon.png",
    "./manifest.json",
    'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;700&display=swap',
];
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(cacheName)
            .then(cache => cache.addAll(filestoCache))
    );
});
self.addEventListener('activate', e => self.clients.claim());
self.addEventListener('fetch', async (event) => {
    const req = event.request;
    if (req.url.indexOf("update") !== -1 || req.url.indexOf("gstatic.com") !== -1 && navigator.userAgent.indexOf("Firefox") !== -1) event.respondWith(await fetch(req)); else event.respondWith(networkFirst(req));
});

async function networkFirst(req) {
    try {
        const networkResponse = await fetch(req);
        const cache = await caches.open("emptydirectorylook-cache");
        await cache.delete(req);
        await cache.put(req, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(req);
        return cachedResponse;
    }
}