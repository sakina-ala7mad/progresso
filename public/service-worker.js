const CACHE_NAME = 'progresso-app-shell-v1'
const APP_SHELL = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        const manifestResponse = await fetch('/precache-manifest.json')
        if (!manifestResponse.ok) throw new Error('Could not load the Progresso offline asset list.')
        const { assets = [] } = await manifestResponse.json()
        await cache.addAll([...new Set([APP_SHELL, ...assets, '/timer-notification.mp3'])])
      })
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('progresso-app-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL, copy))
          }
          return response
        })
        .catch(async () => (await caches.match(APP_SHELL)) || Response.error()),
    )
    return
  }

  const isAppAsset = url.pathname.startsWith('/assets/') || url.pathname === '/timer-notification.mp3'
  if (!isAppAsset) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  })())
})
