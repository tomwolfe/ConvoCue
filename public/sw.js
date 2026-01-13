const CACHE_NAME = 'convocue-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/main.css',
  '/static/js/main.js',
  '/ort-wasm-simd-threaded.jsep.mjs',
  '/ort-wasm-simd-threaded.jsep.wasm',
  '/ort-wasm-simd-threaded.mjs',
  '/ort-wasm-simd-threaded.wasm',
  '/silero_vad_v5.onnx'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available, otherwise fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});