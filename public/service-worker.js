const CACHE_NAME = 'convocue-models-v3';

const MODEL_FILES = [
  '/ort-wasm-simd-threaded.jsep.mjs',
  '/ort-wasm-simd-threaded.jsep.wasm',
  '/ort-wasm-simd-threaded.mjs',
  '/ort-wasm-simd-threaded.wasm',
  '/silero_vad_v5.onnx',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(MODEL_FILES))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('Failed to cache model files:', err))
  );
});

self.addEventListener('fetch', (event) => {
  if (MODEL_FILES.includes(event.request.url.substring(event.request.url.indexOf('/')))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
