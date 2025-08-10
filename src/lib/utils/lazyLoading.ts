/**
 * Lazy Loading Utilities for TPN Dynamic Text Editor
 * Provides dynamic imports and lazy loading strategies for heavy components
 */

// Type declarations for browser APIs not in standard DOM types
interface RequestIdleCallbackHandle extends Number {}
interface RequestIdleCallbackOptions {
  timeout?: number;
}
interface RequestIdleCallbackDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

declare global {
  interface Window {
    requestIdleCallback?(
      callback: (deadline: RequestIdleCallbackDeadline) => void,
      opts?: RequestIdleCallbackOptions,
    ): RequestIdleCallbackHandle;
    cancelIdleCallback?(handle: RequestIdleCallbackHandle): void;
  }
}

// Remove auto-importing performanceMonitor to prevent blocking initialization
// import { performanceMonitor } from '../services/performanceService'

// Cache for loaded modules
const moduleCache = new Map<string, Promise<any>>()

// Loading states tracking
const loadingStates = new Map<string, boolean>()

/**
 * Generic dynamic import with performance tracking and caching
 */
export async function lazyImport<T>(
  importFn: () => Promise<T>,
  moduleName: string,
  options: {
    preload?: boolean
    timeout?: number
    fallback?: T
  } = {}
): Promise<T> {
  const { preload = false, timeout = 10000, fallback } = options
  
  // Check cache first
  if (moduleCache.has(moduleName)) {
    return moduleCache.get(moduleName)!
  }
  
  // Track loading state
  loadingStates.set(moduleName, true)
  
  // Use simple performance measurement without blocking dependencies
  const startTime = performance.now()
  
  const loadPromise = (async () => {
    try {
      console.log(`[LazyLoad] Loading ${moduleName}...`)
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout loading ${moduleName}`)), timeout)
      })
      
      // Race import against timeout
      const module = await Promise.race([importFn(), timeoutPromise])
      
      const endTime = performance.now()
      console.log(`[LazyLoad] Successfully loaded ${moduleName} in ${Math.round(endTime - startTime)}ms`)
      
      // Optionally report to performance monitor if available
      if (typeof window !== 'undefined' && (window as any).__performanceMonitor) {
        (window as any).__performanceMonitor.reportMetric(`LAZY_LOAD_${moduleName.toUpperCase()}`, endTime - startTime)
      }
      
      return module
    } catch (error) {
      console.error(`[LazyLoad] Failed to load ${moduleName}:`, error)
      
      if (fallback) {
        console.log(`[LazyLoad] Using fallback for ${moduleName}`)
        return fallback
      }
      
      throw error
    } finally {
      loadingStates.set(moduleName, false)
    }
  })()
  
  // Cache the promise
  moduleCache.set(moduleName, loadPromise)
  
  return loadPromise
}

/**
 * Lazy load heavy libraries
 */
export const LazyLibraries = {
  // CodeMirror lazy loading
  async loadCodeMirror() {
    return lazyImport(
      () => import('codemirror'),
      'CODEMIRROR',
      { timeout: 5000 }
    )
  },
  
  async loadCodeMirrorLanguages() {
    return lazyImport(async () => {
      const [html, javascript] = await Promise.all([
        import('@codemirror/lang-html'),
        import('@codemirror/lang-javascript')
      ])
      return { html, javascript }
    }, 'CODEMIRROR_LANGUAGES')
  },
  
  // Firebase lazy loading
  async loadFirebase() {
    return lazyImport(
      () => import('firebase/app'),
      'FIREBASE',
      { timeout: 8000 }
    )
  },
  
  async loadFirebaseAuth() {
    return lazyImport(
      () => import('firebase/auth'),
      'FIREBASE_AUTH'
    )
  },
  
  async loadFirebaseFirestore() {
    return lazyImport(
      () => import('firebase/firestore'),
      'FIREBASE_FIRESTORE'
    )
  },
  
  // AI/ML libraries
  async loadGeminiAI() {
    return lazyImport(
      () => import('@google/generative-ai'),
      'GEMINI_AI',
      { timeout: 10000 }
    )
  },
  
  // Babel for code execution
  async loadBabel() {
    return lazyImport(
      () => import('@babel/standalone'),
      'BABEL_STANDALONE',
      { timeout: 5000 }
    )
  },
  
  // Diff utilities
  async loadDiffUtils() {
    return lazyImport(async () => {
      const [diff, diff2html] = await Promise.all([
        import('diff'),
        import('diff2html')
      ])
      return { diff, diff2html }
    }, 'DIFF_UTILS')
  }
}

/**
 * Lazy load Svelte components
 */
export const LazyComponents = {
  // Heavy modal components
  async loadIngredientManager() {
    return lazyImport(
      () => import('../IngredientManager.svelte'),
      'INGREDIENT_MANAGER'
    )
  },
  
  async loadDataMigrationTool() {
    return lazyImport(
      () => import('../DataMigrationTool.svelte'),
      'DATA_MIGRATION_TOOL'
    )
  },
  
  async loadAIWorkflowInspector() {
    return lazyImport(
      () => import('../AIWorkflowInspector.svelte'),
      'AI_WORKFLOW_INSPECTOR'
    )
  },
  
  async loadTestGeneratorModal() {
    return lazyImport(
      () => import('../TestGeneratorModal.svelte'),
      'TEST_GENERATOR_MODAL'
    )
  },
  
  async loadIngredientDiffViewer() {
    return lazyImport(
      () => import('../IngredientDiffViewer.svelte'),
      'INGREDIENT_DIFF_VIEWER'
    )
  }
}

/**
 * Preload critical modules based on user behavior
 */
class PreloadManager {
  private preloadedModules = new Set<string>()
  private intersectionObserver?: IntersectionObserver
  private idleCallback?: RequestIdleCallbackHandle
  
  constructor() {
    this.setupIntersectionObserver()
    this.scheduleIdlePreloading()
  }
  
  private setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      try {
        this.intersectionObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const trigger = entry.target.getAttribute('data-preload')
              if (trigger) {
                this.preloadModule(trigger)
              }
            }
          })
        }, {
          rootMargin: '50px'
        })
      } catch (error) {
        console.warn('[Preload] IntersectionObserver setup failed:', error)
      }
    }
  }
  
  private scheduleIdlePreloading() {
    if ('requestIdleCallback' in window && window.requestIdleCallback) {
      try {
        this.idleCallback = window.requestIdleCallback(() => {
          this.preloadCriticalModules()
        }, { timeout: 5000 })
      } catch (error) {
        console.warn('[Preload] requestIdleCallback failed:', error)
        setTimeout(() => this.preloadCriticalModules(), 2000)
      }
    } else {
      setTimeout(() => this.preloadCriticalModules(), 2000)
    }
  }
  
  private async preloadCriticalModules() {
    const criticalModules = [
      'CODEMIRROR',
      'BABEL_STANDALONE'
    ]
    
    for (const module of criticalModules) {
      if (!this.preloadedModules.has(module)) {
        await this.preloadModule(module)
      }
    }
  }
  
  private async preloadModule(moduleName: string) {
    if (this.preloadedModules.has(moduleName)) {
      return
    }
    
    this.preloadedModules.add(moduleName)
    
    try {
      switch (moduleName) {
        case 'CODEMIRROR':
          await LazyLibraries.loadCodeMirror()
          break
        case 'CODEMIRROR_LANGUAGES':
          await LazyLibraries.loadCodeMirrorLanguages()
          break
        case 'FIREBASE':
          await LazyLibraries.loadFirebase()
          break
        case 'BABEL_STANDALONE':
          await LazyLibraries.loadBabel()
          break
        case 'GEMINI_AI':
          await LazyLibraries.loadGeminiAI()
          break
        default:
          console.warn(`[Preload] Unknown module: ${moduleName}`)
      }
      
      console.log(`[Preload] Successfully preloaded ${moduleName}`)
    } catch (error) {
      console.warn(`[Preload] Failed to preload ${moduleName}:`, error)
    }
  }
  
  // Add element to preloading observation
  observeElement(element: Element, moduleName: string) {
    if (this.intersectionObserver) {
      element.setAttribute('data-preload', moduleName)
      this.intersectionObserver.observe(element)
    }
  }
  
  // Manual preload trigger
  async preload(moduleName: string) {
    await this.preloadModule(moduleName)
  }
  
  // Get loading states
  getLoadingStates() {
    return Object.fromEntries(loadingStates)
  }
  
  // Check if module is loaded
  isLoaded(moduleName: string) {
    return moduleCache.has(moduleName) && !loadingStates.get(moduleName)
  }
  
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
    }
    
    if (this.idleCallback && 'cancelIdleCallback' in window && window.cancelIdleCallback) {
      try {
        window.cancelIdleCallback(this.idleCallback)
      } catch (error) {
        console.warn('[Preload] cancelIdleCallback failed:', error)
      }
    }
  }
}

// Singleton preload manager
export const preloadManager = new PreloadManager()

/**
 * Virtual scrolling implementation for large lists
 */
export class VirtualScrollManager {
  private container: HTMLElement
  private items: any[]
  private itemHeight: number
  private visibleCount: number
  private scrollTop = 0
  private startIndex = 0
  private endIndex = 0
  
  constructor(
    container: HTMLElement,
    items: any[],
    itemHeight: number = 50
  ) {
    this.container = container
    this.items = items
    this.itemHeight = itemHeight
    this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2
    
    this.setupScrolling()
    this.updateVisibleRange()
  }
  
  private setupScrolling() {
    this.container.addEventListener('scroll', () => {
      this.scrollTop = this.container.scrollTop
      this.updateVisibleRange()
    })
  }
  
  private updateVisibleRange() {
    this.startIndex = Math.floor(this.scrollTop / this.itemHeight)
    this.endIndex = Math.min(
      this.startIndex + this.visibleCount,
      this.items.length
    )
  }
  
  getVisibleItems() {
    return this.items.slice(this.startIndex, this.endIndex)
  }
  
  getStartIndex() {
    return this.startIndex
  }
  
  getTotalHeight() {
    return this.items.length * this.itemHeight
  }
  
  getOffsetY() {
    return this.startIndex * this.itemHeight
  }
  
  updateItems(newItems: any[]) {
    this.items = newItems
    this.updateVisibleRange()
  }
}

/**
 * Debounced and throttled function utilities
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = window.setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Image lazy loading with blur placeholder
 */
export function setupImageLazyLoading() {
  const images = document.querySelectorAll('img[data-src]')
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          img.src = img.dataset.src!
          img.removeAttribute('data-src')
          img.classList.add('loaded')
          imageObserver.unobserve(img)
        }
      })
    }, {
      rootMargin: '50px'
    })
    
    images.forEach(img => imageObserver.observe(img))
  } else {
    // Fallback for older browsers
    images.forEach((img: any) => {
      img.src = img.dataset.src
      img.removeAttribute('data-src')
    })
  }
}

/**
 * Resource hints for preloading
 */
export function addResourceHints() {
  const hints = [
    // Preconnect to external domains
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://firebaseapp.com' },
    
    // DNS prefetch for likely domains
    { rel: 'dns-prefetch', href: 'https://googleapis.com' },
    { rel: 'dns-prefetch', href: 'https://gstatic.com' }
  ]
  
  hints.forEach(hint => {
    const link = document.createElement('link')
    link.rel = hint.rel
    link.href = hint.href
    if (hint.rel === 'preconnect') {
      link.crossOrigin = 'anonymous'
    }
    document.head.appendChild(link)
  })
}

// Initialize resource hints when module loads
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    addResourceHints()
    setupImageLazyLoading()
  })
}