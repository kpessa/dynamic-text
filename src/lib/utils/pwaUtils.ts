/**
 * PWA Utilities
 * Helper functions for PWA features and debugging
 */

export interface PWACapabilities {
  serviceWorker: boolean
  webAppManifest: boolean
  installPrompt: boolean
  notifications: boolean
  backgroundSync: boolean
  standalone: boolean
  offline: boolean
}

export interface PWAInstallPrompt {
  available: boolean
  prompt?: any
  install: () => Promise<boolean>
}

/**
 * Check PWA capabilities and support
 */
export function checkPWACapabilities(): PWACapabilities {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    webAppManifest: 'BeforeInstallPromptEvent' in window,
    installPrompt: 'BeforeInstallPromptEvent' in window,
    notifications: 'Notification' in window,
    backgroundSync: 'serviceWorker' in navigator && 'SyncManager' in window,
    standalone: isStandalone(),
    offline: !navigator.onLine
  }
}

/**
 * Check if app is running in standalone mode (installed)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

/**
 * Install prompt manager
 */
export class PWAInstallManager {
  private installPrompt: any = null
  private callbacks: Set<(available: boolean) => void> = new Set()

  constructor() {
    this.setupListeners()
  }

  private setupListeners() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.installPrompt = e
      this.notifyCallbacks(true)
    })

    window.addEventListener('appinstalled', () => {
      this.installPrompt = null
      this.notifyCallbacks(false)
    })
  }

  private notifyCallbacks(available: boolean) {
    this.callbacks.forEach(callback => {
      try {
        callback(available)
      } catch (error) {
        console.error('PWA install callback error:', error)
      }
    })
  }

  /**
   * Listen for install prompt availability changes
   */
  onInstallAvailable(callback: (available: boolean) => void) {
    this.callbacks.add(callback)
    
    // Notify immediately if prompt is already available
    if (this.installPrompt) {
      setTimeout(() => callback(true), 0)
    }
    
    return () => this.callbacks.delete(callback)
  }

  /**
   * Check if install prompt is available
   */
  isInstallAvailable(): boolean {
    return this.installPrompt !== null
  }

  /**
   * Trigger install prompt
   */
  async install(): Promise<boolean> {
    if (!this.installPrompt) {
      console.warn('Install prompt not available')
      return false
    }

    try {
      this.installPrompt.prompt()
      const choiceResult = await this.installPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA installation')
        this.installPrompt = null
        return true
      } else {
        console.log('User dismissed PWA installation')
        return false
      }
    } catch (error) {
      console.error('Install prompt failed:', error)
      return false
    }
  }
}

/**
 * Network status manager
 */
export class NetworkStatusManager {
  private callbacks: Set<(online: boolean) => void> = new Set()
  private _isOnline: boolean = navigator.onLine

  constructor() {
    this.setupListeners()
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      this._isOnline = true
      this.notifyCallbacks(true)
    })

    window.addEventListener('offline', () => {
      this._isOnline = false
      this.notifyCallbacks(false)
    })
  }

  private notifyCallbacks(online: boolean) {
    this.callbacks.forEach(callback => {
      try {
        callback(online)
      } catch (error) {
        console.error('Network status callback error:', error)
      }
    })
  }

  /**
   * Listen for network status changes
   */
  onStatusChange(callback: (online: boolean) => void) {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  /**
   * Get current network status
   */
  get isOnline(): boolean {
    return this._isOnline
  }

  /**
   * Test actual connectivity (not just navigator.onLine)
   */
  async testConnectivity(timeout = 5000): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      return false
    }
  }
}

/**
 * PWA performance metrics
 */
export interface PWAMetrics {
  loadTime: number
  cacheHitRate: number
  serviceWorkerStatus: string
  installationStatus: string
  networkStatus: string
}

export function collectPWAMetrics(): PWAMetrics {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const loadTime = navigation ? navigation.loadEventEnd - navigation.fetchStart : 0
  
  return {
    loadTime,
    cacheHitRate: 0, // Would need SW communication to get actual data
    serviceWorkerStatus: navigator.serviceWorker?.controller ? 'active' : 'inactive',
    installationStatus: isStandalone() ? 'installed' : 'browser',
    networkStatus: navigator.onLine ? 'online' : 'offline'
  }
}

/**
 * PWA debug information collector
 */
export async function collectPWADebugInfo() {
  const capabilities = checkPWACapabilities()
  const metrics = collectPWAMetrics()
  
  let swInfo = null
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      // Try to get SW info via message
      const messageChannel = new MessageChannel()
      const swInfoPromise = new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => resolve(event.data)
        setTimeout(() => resolve(null), 2000) // Timeout after 2s
      })
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_INFO' },
        [messageChannel.port2]
      )
      
      swInfo = await swInfoPromise
    } catch (error) {
      console.warn('Could not get SW info:', error)
    }
  }
  
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: location.href,
    capabilities,
    metrics,
    serviceWorkerInfo: swInfo,
    cacheInfo: swInfo?.info || null
  }
}

/**
 * Export singleton instances
 */
export const pwaInstallManager = new PWAInstallManager()
export const networkStatusManager = new NetworkStatusManager()

/**
 * Utility functions for easy import
 */
export async function showInstallPrompt(): Promise<boolean> {
  return pwaInstallManager.install()
}

export function onInstallAvailable(callback: (available: boolean) => void) {
  return pwaInstallManager.onInstallAvailable(callback)
}

export function onNetworkChange(callback: (online: boolean) => void) {
  return networkStatusManager.onStatusChange(callback)
}

export function isOnline(): boolean {
  return networkStatusManager.isOnline
}

export async function testConnectivity(): Promise<boolean> {
  return networkStatusManager.testConnectivity()
}