/**
 * Service Worker Registration and Management
 * Handles PWA service worker lifecycle and updates
 */

interface ServiceWorkerUpdate {
  available: boolean
  waiting: ServiceWorker | null
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private updateCallbacks: Set<(update: ServiceWorkerUpdate) => void> = new Set()
  private isInitialized = false

  async register(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[SW] Service Workers not supported')
      return false
    }

    if (this.isInitialized) {
      console.log('[SW] Service Worker already initialized')
      return true
    }

    try {
      console.log('[SW] Registering service worker...')
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('[SW] Service Worker registered successfully:', this.registration.scope)

      // Listen for updates
      this.setupUpdateListener()

      // Handle controller change (new SW took over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] New service worker took control')
        window.location.reload()
      })

      this.isInitialized = true
      return true

    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error)
      return false
    }
  }

  private setupUpdateListener() {
    if (!this.registration) return

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event)
    })

    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing
      console.log('[SW] New service worker installing')

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New SW is available
              console.log('[SW] New service worker ready')
              this.notifyUpdateCallbacks({
                available: true,
                waiting: newWorker
              })
            } else {
              // First time install
              console.log('[SW] Service worker installed for first time')
            }
          }
        })
      }
    })
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, ...data } = event.data || {}
    
    switch (type) {
      case 'SW_ACTIVATED':
        console.log('[SW] Service worker activated with version:', data.version)
        break
      
      case 'SW_READY':
        console.log('[SW] Service worker ready:', data)
        break
      
      case 'BACKGROUND_SYNC_COMPLETE':
        console.log('[SW] Background sync completed:', data)
        break
      
      case 'CACHE_UPDATED':
        console.log('[SW] Cache updated')
        break
      
      default:
        console.log('[SW] Unknown message from service worker:', event.data)
    }
  }

  onUpdateAvailable(callback: (update: ServiceWorkerUpdate) => void) {
    this.updateCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback)
    }
  }

  private notifyUpdateCallbacks(update: ServiceWorkerUpdate) {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(update)
      } catch (error) {
        console.error('[SW] Update callback error:', error)
      }
    })
  }

  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      console.warn('[SW] No waiting service worker to skip')
      return
    }

    console.log('[SW] Skipping waiting and activating new service worker')
    
    // Send skip waiting message to new SW
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  async update(): Promise<boolean> {
    if (!this.registration) {
      console.warn('[SW] No registration available for update')
      return false
    }

    try {
      console.log('[SW] Checking for service worker updates...')
      await this.registration.update()
      console.log('[SW] Update check completed')
      return true
    } catch (error) {
      console.error('[SW] Update check failed:', error)
      return false
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return true
    }

    try {
      const result = await this.registration.unregister()
      console.log('[SW] Service worker unregistered:', result)
      this.registration = null
      this.isInitialized = false
      return result
    } catch (error) {
      console.error('[SW] Failed to unregister service worker:', error)
      return false
    }
  }

  isRegistered(): boolean {
    return this.isInitialized && this.registration !== null
  }

  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration
  }

  // Get SW version/info
  async getServiceWorkerInfo() {
    if (!this.registration) return null

    return {
      scope: this.registration.scope,
      updateViaCache: this.registration.updateViaCache,
      active: this.registration.active?.state,
      waiting: this.registration.waiting?.state,
      installing: this.registration.installing?.state
    }
  }

  // Clear all caches (useful for debugging)
  async clearAllCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
      console.log('[SW] All caches cleared')
    } catch (error) {
      console.error('[SW] Failed to clear caches:', error)
    }
  }

  // Check if app is running standalone (installed as PWA)
  isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')
    )
  }

  // Send message to service worker
  async sendMessage(type: string, payload?: any): Promise<any> {
    if (!this.registration?.active) {
      console.warn('[SW] No active service worker to send message to')
      return null
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data)
      }

      messageChannel.port1.onmessageerror = (error) => {
        reject(error)
      }

      this.registration!.active!.postMessage(
        { type, payload },
        [messageChannel.port2]
      )

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Service worker message timeout'))
      }, 5000)
    })
  }

  // Get cache information from service worker
  async getCacheInfo() {
    try {
      return await this.sendMessage('GET_CACHE_INFO')
    } catch (error) {
      console.error('[SW] Failed to get cache info:', error)
      return null
    }
  }

  // Cache specific resource
  async cacheResource(url: string): Promise<boolean> {
    try {
      const result = await this.sendMessage('CACHE_RESOURCE', { url })
      return result?.success || false
    } catch (error) {
      console.error('[SW] Failed to cache resource:', error)
      return false
    }
  }

  // Get service worker version
  async getVersion(): Promise<string | null> {
    try {
      const result = await this.sendMessage('GET_VERSION')
      return result?.version || null
    } catch (error) {
      console.error('[SW] Failed to get version:', error)
      return null
    }
  }

  // Force clear all caches
  async forceClearAllCaches(): Promise<boolean> {
    try {
      const result = await this.sendMessage('CLEAR_CACHE')
      return result?.success || false
    } catch (error) {
      console.error('[SW] Failed to clear caches:', error)
      return false
    }
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerManager()

// Utility functions
export async function registerServiceWorker(): Promise<boolean> {
  return serviceWorkerManager.register()
}

export function onServiceWorkerUpdate(callback: (update: ServiceWorkerUpdate) => void) {
  return serviceWorkerManager.onUpdateAvailable(callback)
}

export async function updateServiceWorker(): Promise<void> {
  await serviceWorkerManager.skipWaiting()
}

export function isAppInstalled(): boolean {
  return serviceWorkerManager.isStandalone()
}

export async function getCacheInfo() {
  return serviceWorkerManager.getCacheInfo()
}

export async function cacheResource(url: string): Promise<boolean> {
  return serviceWorkerManager.cacheResource(url)
}

export async function getServiceWorkerVersion(): Promise<string | null> {
  return serviceWorkerManager.getVersion()
}

export async function clearAllCaches(): Promise<boolean> {
  return serviceWorkerManager.forceClearAllCaches()
}

export function getServiceWorkerManager() {
  return serviceWorkerManager
}

// Export types
export type { ServiceWorkerUpdate }