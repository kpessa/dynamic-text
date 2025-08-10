/**
 * Service Worker for TPN Dynamic Text Editor PWA
 * Provides offline support, caching, and background sync
 */

// Version-based cache names for proper updates
const CACHE_VERSION = '2024-08-10-v2'
const CACHE_NAME = `tpn-editor-${CACHE_VERSION}`
const STATIC_CACHE = `tpn-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `tpn-dynamic-${CACHE_VERSION}`
const API_CACHE = `tpn-api-${CACHE_VERSION}`

// Cache size limits
const CACHE_LIMITS = {
  [STATIC_CACHE]: 50,    // 50 entries max
  [DYNAMIC_CACHE]: 100,  // 100 entries max  
  [API_CACHE]: 30        // 30 entries max
}

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/vite.svg',
  // Workers (if they exist)
  '/workers/tpnWorker.js',
  '/workers/codeWorker.js'
]

// Optional assets that may not exist
const OPTIONAL_ASSETS = [
  '/icons/icon.svg'
]

// Runtime cache patterns
const RUNTIME_CACHE_PATTERNS = [
  {
    urlPattern: /^https:\/\/fonts\.googleapis\.com/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'google-fonts-stylesheets',
      expiration: {
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
      }
    }
  },
  {
    urlPattern: /^https:\/\/fonts\.gstatic\.com/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-webfonts',
      expiration: {
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
      }
    }
  }
]

// API patterns for caching
const API_PATTERNS = [
  /\/api\//,
  /firebase/,
  /firestore/
]

// Skip caching for these patterns
const SKIP_CACHE_PATTERNS = [
  /\/api\/auth/,
  /\/api\/user/,
  /hot-update/,
  /sockjs-node/,
  /__vite_ping/,
  /\/@vite/,
  /\?.*t=\d+/, // Skip Vite HMR requests
  /chrome-extension:/,
  /localhost:\d+\/.*\.map$/ // Skip source maps in dev
]

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
}

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker version:', CACHE_VERSION)
  
  event.waitUntil(
    Promise.resolve()
      .then(async () => {
        const cache = await caches.open(STATIC_CACHE)
        console.log('[SW] Caching static assets')
        
        // Cache required assets
        const requiredPromises = STATIC_ASSETS.map(async (asset) => {
          try {
            // Test if asset exists before caching
            const response = await fetch(asset, { method: 'HEAD' })
            if (response.ok) {
              await cache.add(asset)
              console.log('[SW] Cached:', asset)
            } else {
              console.warn('[SW] Required asset not found:', asset)
            }
          } catch (error) {
            console.warn('[SW] Failed to cache required asset:', asset, error.message)
          }
        })

        // Cache optional assets (don't fail if missing)
        const optionalPromises = OPTIONAL_ASSETS.map(async (asset) => {
          try {
            const response = await fetch(asset, { method: 'HEAD' })
            if (response.ok) {
              await cache.add(asset)
              console.log('[SW] Cached optional asset:', asset)
            }
          } catch (error) {
            // Silent fail for optional assets
            console.debug('[SW] Optional asset not available:', asset)
          }
        })

        const cachePromises = [...requiredPromises, ...optionalPromises]
        
        await Promise.allSettled(cachePromises)
        console.log('[SW] Static assets caching completed')
        
        // Force activation to take control immediately
        await self.skipWaiting()
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error)
        throw error
      })
  )
})

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker version:', CACHE_VERSION)
  
  event.waitUntil(
    Promise.resolve()
      .then(async () => {
        // Get all cache names
        const cacheNames = await caches.keys()
        const currentCaches = new Set([STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, 'google-fonts-stylesheets', 'google-fonts-webfonts'])
        
        // Delete old caches
        const deletePromises = cacheNames
          .filter(cacheName => !currentCaches.has(cacheName))
          .map(async (cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName)
            await caches.delete(cacheName)
          })
        
        await Promise.all(deletePromises)
        
        // Clean up existing caches if they exceed limits
        await Promise.all([
          cleanupCache(STATIC_CACHE, CACHE_LIMITS[STATIC_CACHE]),
          cleanupCache(DYNAMIC_CACHE, CACHE_LIMITS[DYNAMIC_CACHE]),
          cleanupCache(API_CACHE, CACHE_LIMITS[API_CACHE])
        ])
        
        // Take control of all clients
        await self.clients.claim()
        
        console.log('[SW] Service worker activated successfully')
        
        // Notify clients of activation
        const clients = await self.clients.matchAll({ type: 'window' })
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: CACHE_VERSION
          })
        })
      })
      .catch(error => {
        console.error('[SW] Failed to activate service worker:', error)
      })
  )
})

// Cache cleanup utility
async function cleanupCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    
    if (keys.length > maxEntries) {
      // Remove oldest entries (FIFO)
      const keysToDelete = keys.slice(0, keys.length - maxEntries)
      await Promise.all(keysToDelete.map(key => cache.delete(key)))
      console.log(`[SW] Cleaned up ${keysToDelete.length} entries from ${cacheName}`)
    }
  } catch (error) {
    console.error(`[SW] Failed to cleanup cache ${cacheName}:`, error)
  }
}

// Fetch event - handle requests with appropriate strategy
self.addEventListener('fetch', event => {
  const { request } = event
  
  try {
    const url = new URL(request.url)
    
    // Skip browser extension requests completely
    if (url.protocol === 'chrome-extension:' || 
        url.protocol === 'moz-extension:' ||
        url.protocol === 'extension:') {
      return
    }
    
    // Skip non-GET requests and certain patterns
    if (request.method !== 'GET' || shouldSkipCache(url)) {
      return
    }
    
    // Determine cache strategy based on request type
    const strategy = getCacheStrategy(url)
    
    event.respondWith(
      handleRequest(request, strategy)
        .catch(error => {
          console.error('[SW] Request failed:', request.url, error.message)
          return handleOfflineError(request)
        })
    )
  } catch (error) {
    console.error('[SW] Fetch event error:', error)
    // Let browser handle the request if SW fails
  }
})

// Determine if request should skip caching
function shouldSkipCache(url) {
  return SKIP_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))
}

// Get appropriate cache strategy for URL
function getCacheStrategy(url) {
  // API requests - network first with cache fallback
  if (API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return CACHE_STRATEGIES.NETWORK_FIRST
  }
  
  // Static assets - cache first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ttf|eot)$/)) {
    return CACHE_STRATEGIES.CACHE_FIRST
  }
  
  // HTML pages - stale while revalidate
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE
  }
  
  // Default to network first
  return CACHE_STRATEGIES.NETWORK_FIRST
}

// Handle requests with specified strategy
async function handleRequest(request, strategy) {
  const url = new URL(request.url)
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return handleCacheFirst(request)
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return handleNetworkFirst(request)
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return handleStaleWhileRevalidate(request)
    
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request)
    
    case CACHE_STRATEGIES.CACHE_ONLY:
      return caches.match(request)
    
    default:
      return handleNetworkFirst(request)
  }
}

// Cache first strategy
async function handleCacheFirst(request) {
  try {
    // Skip caching for browser extension URLs
    const url = new URL(request.url)
    if (url.protocol === 'chrome-extension:' || 
        url.protocol === 'moz-extension:' ||
        url.protocol === 'extension:') {
      return fetch(request)
    }
    
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    const response = await fetch(request)
    
    if (response.ok && response.status < 400) {
      const cache = await caches.open(getAppropriateCache(request.url))
      // Clone response before caching
      const responseClone = response.clone()
      await cache.put(request, responseClone)
    }
    
    return response
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', request.url, error)
    throw error
  }
}

// Network first strategy
async function handleNetworkFirst(request) {
  try {
    const networkPromise = fetch(request)
    const response = await networkPromise
    
    if (response.ok && response.status < 400) {
      const cache = await caches.open(getAppropriateCache(request.url))
      // Cache the response asynchronously to avoid blocking
      cache.put(request, response.clone()).catch(error => {
        console.warn('[SW] Failed to cache response:', request.url, error)
      })
    }
    
    return response
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url)
    
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    throw error
  }
}

// Stale while revalidate strategy
async function handleStaleWhileRevalidate(request) {
  const cache = await caches.open(getAppropriateCache(request.url))
  const cachedResponse = await cache.match(request)
  
  // Start network request regardless of cache status
  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok && response.status < 400) {
        // Update cache in background
        cache.put(request, response.clone()).catch(error => {
          console.warn('[SW] Failed to update cache:', request.url, error)
        })
      }
      return response
    })
    .catch(error => {
      console.log('[SW] Network update failed for:', request.url, error.message)
      return null
    })
  
  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || networkPromise
}

// Get appropriate cache name for URL
function getAppropriateCache(url) {
  if (API_PATTERNS.some(pattern => pattern.test(url))) {
    return API_CACHE
  }
  
  if (STATIC_ASSETS.includes(new URL(url).pathname)) {
    return STATIC_CACHE
  }
  
  return DYNAMIC_CACHE
}

// Handle offline errors
async function handleOfflineError(request) {
  // For navigation requests, return offline page
  if (request.destination === 'document') {
    const offlineResponse = await caches.match('/offline.html')
    if (offlineResponse) {
      return offlineResponse
    }
  }
  
  // For other requests, return a generic offline response
  return new Response(
    JSON.stringify({ 
      error: 'Offline', 
      message: 'This content is not available offline' 
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    }
  )
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  } else if (event.tag === 'cache-cleanup') {
    event.waitUntil(performCacheCleanup())
  }
})

// Perform background sync
async function doBackgroundSync() {
  try {
    console.log('[SW] Starting background sync...')
    
    // Get pending actions from IndexedDB or other storage
    const pendingActions = await getPendingActions()
    
    let syncedCount = 0
    let failedCount = 0
    
    for (const action of pendingActions) {
      try {
        await syncAction(action)
        await markActionSynced(action.id)
        syncedCount++
      } catch (error) {
        console.error('[SW] Failed to sync action:', action, error)
        failedCount++
      }
    }
    
    console.log(`[SW] Background sync completed: ${syncedCount} synced, ${failedCount} failed`)
    
    // Notify clients of sync completion
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        syncedCount,
        failedCount
      })
    })
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// Periodic cache cleanup
async function performCacheCleanup() {
  try {
    console.log('[SW] Performing scheduled cache cleanup...')
    
    await Promise.all([
      cleanupCache(STATIC_CACHE, CACHE_LIMITS[STATIC_CACHE]),
      cleanupCache(DYNAMIC_CACHE, CACHE_LIMITS[DYNAMIC_CACHE]),
      cleanupCache(API_CACHE, CACHE_LIMITS[API_CACHE])
    ])
    
    console.log('[SW] Scheduled cache cleanup completed')
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error)
  }
}

// Get pending actions (placeholder - implement based on your data model)
async function getPendingActions() {
  // This would typically read from IndexedDB
  return []
}

// Sync individual action (placeholder)
async function syncAction(action) {
  // Implement actual sync logic here
  console.log('[SW] Syncing action:', action)
}

// Mark action as synced (placeholder)
async function markActionSynced(actionId) {
  // Implement marking logic here
  console.log('[SW] Action synced:', actionId)
}

// Handle push notifications (if needed)
self.addEventListener('push', event => {
  if (!event.data) {
    return
  }
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: data.data,
    actions: data.actions || []
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})

// Message handling for communication with main thread
self.addEventListener('message', event => {
  const { type, payload } = event.data || {}
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] Received skip waiting request')
      self.skipWaiting()
      break
    
    case 'GET_VERSION':
      event.ports?.[0]?.postMessage({ version: CACHE_VERSION })
      break
    
    case 'CLEAR_CACHE':
      console.log('[SW] Clearing all caches on request')
      clearAllCaches().then(() => {
        event.ports?.[0]?.postMessage({ success: true })
      }).catch(error => {
        event.ports?.[0]?.postMessage({ success: false, error: error.message })
      })
      break
    
    case 'CACHE_RESOURCE':
      if (payload?.url) {
        cacheResource(payload.url).then(success => {
          event.ports?.[0]?.postMessage({ success })
        })
      }
      break
    
    case 'GET_CACHE_INFO':
      getCacheInfo().then(info => {
        event.ports?.[0]?.postMessage({ info })
      })
      break
    
    default:
      console.log('[SW] Unknown message type:', type, event.data)
  }
})

// Cache specific resource on demand
async function cacheResource(url) {
  try {
    const response = await fetch(url)
    if (response.ok) {
      const cache = await caches.open(getAppropriateCache(url))
      await cache.put(url, response)
      return true
    }
    return false
  } catch (error) {
    console.error('[SW] Failed to cache resource:', url, error)
    return false
  }
}

// Get cache information
async function getCacheInfo() {
  try {
    const cacheNames = await caches.keys()
    const info = {}
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      info[cacheName] = {
        entries: keys.length,
        urls: keys.slice(0, 10).map(req => req.url) // First 10 for debugging
      }
    }
    
    return {
      version: CACHE_VERSION,
      caches: info,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('[SW] Failed to get cache info:', error)
    return { error: error.message }
  }
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  )
  console.log('[SW] All caches cleared')
}

// Runtime caching for external resources
function applyRuntimeCaching() {
  RUNTIME_CACHE_PATTERNS.forEach(({ urlPattern, handler, options }) => {
    // This would typically integrate with Workbox for more sophisticated runtime caching
    console.log(`[SW] Runtime caching configured for pattern: ${urlPattern}`)
  })
}

// Global error handling
self.addEventListener('error', event => {
  console.error('[SW] Global service worker error:', event.error)
})

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled promise rejection:', event.reason)
  // Prevent the default rejection handling
  event.preventDefault()
})

// Initialize runtime features
applyRuntimeCaching()

console.log(`[SW] Service Worker loaded successfully - Version: ${CACHE_VERSION}`)

// Report readiness to any connected clients
self.addEventListener('activate', () => {
  setTimeout(async () => {
    const clients = await self.clients.matchAll({ type: 'window' })
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_READY',
        version: CACHE_VERSION,
        cacheNames: [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE]
      })
    })
  }, 1000)
})