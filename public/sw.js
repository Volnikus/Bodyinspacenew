// Offline support for Body in Space. Pages are fetched fresh when a network exists and
// served from the cache when it does not; built assets and NASA data files are cached on first use.
const CACHE = 'body-in-space-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['./', './favicon.svg', './manifest.webmanifest'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  const store = (response) => {
    if (response.ok) {
      const copy = response.clone()
      caches.open(CACHE).then((cache) => cache.put(request, copy))
    }
    return response
  }

  if (request.mode === 'navigate') {
    // Network first, so a new deployment shows up; the cached page is the offline fallback.
    event.respondWith(
      fetch(request)
        .then(store)
        .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? caches.match('./'))),
    )
    return
  }

  // Hashed assets, fonts and data files never change under the same address.
  event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request).then(store)))
})
