/**
 * Apex Racer - Service Worker
 * Lets the installed app start and run offline. Files are served from the phone's cache
 * immediately and refreshed from the web in the background, so a new version arrives
 * on the next launch after it is published (no manual version bumps needed).
 */

const CACHE_NAME = 'apex-racer-v1';

const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'vendor/three/three.min.js',
  'vendor/three/CopyShader.js',
  'vendor/three/LuminosityHighPassShader.js',
  'vendor/three/EffectComposer.js',
  'vendor/three/RenderPass.js',
  'vendor/three/ShaderPass.js',
  'vendor/three/UnrealBloomPass.js',
  'js/audio.js',
  'js/controls.js',
  'js/physics.js',
  'js/car.js',
  'js/track.js',
  'js/ai.js',
  'js/environment.js',
  'js/postprocessing.js',
  'js/hud.js',
  'js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for the game's own files
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(request, { ignoreSearch: true }).then(cached => {
        const network = fetch(request)
          .then(response => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
