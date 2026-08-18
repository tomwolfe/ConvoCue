const SHELL_CACHE = 'convocue-shell-v3';
const MODELS_CACHE = 'convocue-models-v3';

const modelFiles = [
  '/ort-wasm-simd-threaded.jsep.mjs',
  '/ort-wasm-simd-threaded.jsep.wasm',
  '/ort-wasm-simd-threaded.mjs',
  '/ort-wasm-simd-threaded.wasm',
  '/silero_vad_v5.onnx',
];

const appShell = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => cache.addAll(appShell)),
      caches.open(MODELS_CACHE).then((cache) => {
        return cache.addAll(modelFiles).catch((err) => {
          console.warn('Some model files could not be cached:', err);
        });
      }),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== MODELS_CACHE)
          .map((key) => {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.url.includes('.wasm') || request.url.includes('.onnx') || request.url.includes('.mjs')) {
    event.respondWith(
      caches.open(MODELS_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetched = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);

          return cached || fetched;
        })
      )
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
