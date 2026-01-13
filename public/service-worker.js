// Service Worker for caching WASM and ONNX models
const CACHE_NAME = 'convocue-models-v1';
const MODEL_FILES = [
    '/ort-wasm-simd-threaded.jsep.mjs',
    '/ort-wasm-simd-threaded.jsep.wasm',
    '/ort-wasm-simd-threaded.mjs',
    '/ort-wasm-simd-threaded.wasm',
    '/silero_vad_v5.onnx'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching model files...');
                return cache.addAll(MODEL_FILES);
            })
            .then(() => {
                console.log('Model files cached successfully');
                self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('Failed to cache model files:', error);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Handle requests for model files
    if (MODEL_FILES.includes(event.request.url.substring(event.request.url.indexOf('/')))) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Return cached version if available
                    if (response) {
                        console.log('Serving from cache:', event.request.url);
                        return response;
                    }
                    
                    // Otherwise fetch from network
                    return fetch(event.request);
                })
        );
    }
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(
        clients.claim() // Take control of all pages
    );
});