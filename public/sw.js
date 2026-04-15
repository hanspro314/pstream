/* PStream Service Worker — Caches app shell for offline PWA experience */

const CACHE_NAME = 'pstream-v2';
const VIDEO_CACHE_NAME = 'pstream-video-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Video streaming cache limits
const VIDEO_CACHE_MAX_MB = 200; // Cache up to 200MB of video data
const VIDEO_CACHE_MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Some assets may fail (e.g. HTML pages served by Next.js)
        // Cache what we can
        return Promise.allSettled(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch(() => { /* cache miss ok */ })
          )
        );
      });
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME && name !== VIDEO_CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ─── Video streaming cache: cache-first with network fallback ───
// Video range requests are cacheable — the same byte range always returns
// the same data. By caching 206 responses in the SW, we eliminate the
// proxy round-trip entirely for already-buffered chunks.
// On seek backward or buffer refill after a hiccup, the SW serves from
// cache instantly instead of waiting 200-400ms for the proxy hop.
async function handleVideoRequest(event) {
  const { request } = event;

  // Only cache streaming mode (not downloads)
  const url = new URL(request.url);
  if (url.searchParams.get('download') === '1') {
    return; // Let download requests pass through without caching
  }

  // Try cache first for range requests (seeks + buffer refills)
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Cache miss — fetch from network
  try {
    const networkResponse = await fetch(request);

    // Only cache successful responses (200 and 206)
    if (networkResponse.ok || networkResponse.status === 206) {
      const clone = networkResponse.clone();

      // Check if we should cache this response
      const contentLength = parseInt(networkResponse.headers.get('Content-Length') || '0', 10);
      if (contentLength > 0 && contentLength <= 10 * 1024 * 1024) { // Only cache chunks <= 10MB
        caches.open(VIDEO_CACHE_NAME).then(async (cache) => {
          // Enforce cache size limit
          await pruneVideoCache();
          cache.put(request, clone);
        });
      }
    }

    return networkResponse;
  } catch (error) {
    // Network failed — try to serve a partial range from cache as fallback
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      // Extract the requested byte range
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        // Try to find any cached response that covers this range
        const allCache = await caches.open(VIDEO_CACHE_NAME);
        const keys = await allCache.keys();
        for (const key of keys) {
          const cached = await allCache.match(key);
          if (cached) {
            const cachedRange = cached.headers.get('Content-Range');
            if (cachedRange) {
              const rangeMatch = cachedRange.match(/bytes (\d+)-(\d+)/);
              if (rangeMatch) {
                const cachedStart = parseInt(rangeMatch[1], 10);
                const cachedEnd = parseInt(rangeMatch[2], 10);
                if (start >= cachedStart && start <= cachedEnd) {
                  // We have a cached chunk that overlaps — return it
                  return cached;
                }
              }
            }
          }
        }
      }
    }
    // No cached fallback available — fail gracefully
    return new Response('Network error', { status: 503 });
  }
}

// Prune video cache to stay under size limit
async function pruneVideoCache() {
  try {
    if (!self.navigator.storage || !self.navigator.storage.estimate) return;
    const estimate = await self.navigator.storage.estimate();
    if (!estimate.usage || !estimate.quota) return;
    // If we're using more than VIDEO_CACHE_MAX_MB, clear the video cache
    if (estimate.usage > VIDEO_CACHE_MAX_MB * 1024 * 1024) {
      await caches.delete(VIDEO_CACHE_NAME);
    }
  } catch {
    // Storage estimation not available — skip pruning
  }
}

// Fetch: network-first strategy for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // API routes: always go to network (never cache API responses)
  if (url.pathname.startsWith('/api/')) {
    // EXCEPTION: Video proxy gets SW-level caching for smooth streaming
    if (url.pathname === '/api/stream/video') {
      event.respondWith(handleVideoRequest(event));
    }
    return;
  }

  // For image CDN URLs and external resources: network-first with cache fallback
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses for 24 hours
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails and we have a cache, use it
          if (cached) return cached;
          // Return a minimal offline fallback for navigation
          if (request.mode === 'navigate') {
            return new Response(
              '<!DOCTYPE html><html><body style="background:#0A0A0A;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif"><div style="text-align:center"><h1>PStream</h1><p>You are offline. Please check your connection.</p></div></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
          return new Response('Offline', { status: 503 });
        });

      return cached || fetchPromise;
    })
  );
});

// Handle download events from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
