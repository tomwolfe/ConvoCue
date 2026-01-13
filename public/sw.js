const CACHE_NAME = 'convocue-v2';
const ASSETS_CACHE = 'convocue-assets-v2';
const MODELS_CACHE = 'convocue-models-v2';

const staticAssets = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/main.css',
  '/static/js/main.js'
];

const modelFiles = [
  '/ort-wasm-simd-threaded.jsep.mjs',
  '/ort-wasm-simd-threaded.jsep.wasm',
  '/ort-wasm-simd-threaded.mjs',
  '/ort-wasm-simd-threaded.wasm',
  '/silero_vad_v5.onnx'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(ASSETS_CACHE)
        .then(cache => {
          console.log('Caching static assets');
          return cache.addAll(staticAssets);
        }),
      caches.open(MODELS_CACHE)
        .then(cache => {
          console.log('Caching model files');
          return cache.addAll(modelFiles);
        })
    ]).then(() => {
      console.log('All caches populated');
      self.skipWaiting(); // Activate immediately
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== ASSETS_CACHE && cacheName !== MODELS_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event with different strategies for different resources
self.addEventListener('fetch', event => {
  const { request } = event;

  // For model files (large, critical files), use cache-first with background update
  if (request.url.includes('.wasm') || request.url.includes('.onnx') || request.url.includes('.mjs')) {
    event.respondWith(
      caches.open(MODELS_CACHE).then(cache => {
        return cache.match(request).then(response => {
          // If found in cache, return it but also update in background
          if (response) {
            // Update cache in background for next time
            fetch(request).then(networkResponse => {
              if (networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
            }).catch(err => {
              console.log('Background update failed for:', request.url, err);
            });

            return response;
          }

          // If not in cache, fetch from network and cache for next time
          return fetch(request).then(networkResponse => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
  }
  // For static assets, use cache-first strategy
  else if (request.destination === 'document' || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(networkResponse => {
          // Cache the response for future requests
          if (networkResponse.status === 200) {
            caches.open(ASSETS_CACHE).then(cache => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        });
      })
    );
  }
  // For other requests, use network-first with fallback to cache
  else {
    event.respondWith(
      fetch(request).then(networkResponse => {
        // Update cache in background
        if (networkResponse.status === 200) {
          caches.open(ASSETS_CACHE).then(cache => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to cache if network fails
        return caches.match(request);
      })
    );
  }
});