/**
 * Performance Monitoring Service for TPN Dynamic Text Editor
 * Implements comprehensive performance tracking, Web Vitals monitoring,
 * and real user monitoring (RUM) for medical application optimization.
 */

interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  fcp?: number // First Contentful Paint
  ttfb?: number // Time to First Byte
  tti?: number // Time to Interactive
  
  // Custom metrics
  tpnCalculationTime?: number
  sectionRenderTime?: number
  codeExecutionTime?: number
  firebaseQueryTime?: number
  
  // Resource metrics
  bundleSize?: number
  resourceLoadTime?: number
  memoryUsage?: MemoryUsage
  
  // User interaction metrics
  interactionLatency?: number
  scrollPerformance?: number
}

interface MemoryUsage {
  used: number
  total: number
  limit: number
}

interface ConnectionInfo {
  effectiveType: string
  downlink: number
  rtt: number
  saveData: boolean
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {}
  private observers: PerformanceObserver[] = []
  private isInitialized = false
  private reportingInterval: number | null = null
  private serviceWorker: ServiceWorkerRegistration | null = null
  
  constructor() {
    // Don't auto-initialize - wait for explicit call
  }
  
  async init() {
    if (this.isInitialized) return
    
    console.log('[Performance] Initializing performance monitoring')
    
    // Initialize Web Vitals monitoring
    this.observeWebVitals()
    
    // Initialize custom metrics
    this.observeCustomMetrics()
    
    // Initialize resource monitoring
    this.observeResources()
    
    // Initialize user interaction monitoring
    this.observeUserInteractions()
    
    // Register service worker for offline performance tracking
    await this.registerServiceWorker()
    
    // Start periodic reporting
    this.startPeriodicReporting()
    
    this.isInitialized = true
    console.log('[Performance] Monitoring initialized')
  }
  
  // Generic async measurement wrapper
  async measureAsync<T>(asyncFn: () => Promise<T>, metricName: string): Promise<T> {
    const start = performance.now()
    const result = await asyncFn()
    const end = performance.now()
    
    this.reportMetric(metricName, end - start)
    return result
  }
  
  private observeWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as PerformanceEntry
        this.metrics.lcp = (lastEntry as any).renderTime || (lastEntry as any).loadTime
        this.reportMetric('LCP', this.metrics.lcp)
      })
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)
      } catch (e) {
        console.warn('[Performance] LCP not supported')
      }
    }
    
    // First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.metrics.fid = entry.processingStart - entry.startTime
          this.reportMetric('FID', this.metrics.fid)
        })
      })
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.push(fidObserver)
      } catch (e) {
        console.warn('[Performance] FID not supported')
      }
    }
    
    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as any
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value
          }
        }
        this.metrics.cls = clsValue
        this.reportMetric('CLS', clsValue)
      })
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(clsObserver)
      } catch (e) {
        console.warn('[Performance] CLS not supported')
      }
    }
    
    // First Contentful Paint (FCP) & Time to First Byte (TTFB)
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        const [navigation] = list.getEntriesByType('navigation') as PerformanceNavigationTiming[]
        if (navigation) {
          this.metrics.ttfb = navigation.responseStart - navigation.requestStart
          this.reportMetric('TTFB', this.metrics.ttfb)
        }
      })
      
      try {
        navigationObserver.observe({ entryTypes: ['navigation'] })
        this.observers.push(navigationObserver)
      } catch (e) {
        console.warn('[Performance] Navigation timing not supported')
      }
      
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime
            this.reportMetric('FCP', this.metrics.fcp)
          }
        })
      })
      
      try {
        paintObserver.observe({ entryTypes: ['paint'] })
        this.observers.push(paintObserver)
      } catch (e) {
        console.warn('[Performance] Paint timing not supported')
      }
    }
  }
  
  private observeCustomMetrics() {
    // Time to Interactive (TTI) approximation
    if ('PerformanceObserver' in window && 'PerformanceLongTaskTiming' in window) {
      let lastLongTask = 0
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          lastLongTask = entry.startTime + entry.duration
        }
        // TTI is approximated as 5 seconds after the last long task
        this.metrics.tti = lastLongTask + 5000
      })
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] })
        this.observers.push(longTaskObserver)
      } catch (e) {
        console.warn('[Performance] Long task timing not supported')
      }
    }
  }
  
  private observeResources() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[]
        
        entries.forEach((entry) => {
          // Track specific resource loading times
          if (entry.name.includes('codemirror')) {
            console.log(`[Performance] CodeMirror loaded in ${entry.duration}ms`)
          }
          if (entry.name.includes('firebase')) {
            console.log(`[Performance] Firebase loaded in ${entry.duration}ms`)
          }
        })
      })
      
      try {
        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.push(resourceObserver)
      } catch (e) {
        console.warn('[Performance] Resource timing not supported')
      }
    }
  }
  
  private observeUserInteractions() {
    // Monitor scroll performance
    let lastScrollTime = Date.now()
    let scrollSamples: number[] = []
    
    const scrollHandler = () => {
      const now = Date.now()
      const scrollTime = now - lastScrollTime
      scrollSamples.push(scrollTime)
      
      // Keep only recent samples
      if (scrollSamples.length > 10) {
        scrollSamples = scrollSamples.slice(-10)
      }
      
      // Calculate average scroll performance
      if (scrollSamples.length >= 5) {
        const avgScrollTime = scrollSamples.reduce((a, b) => a + b) / scrollSamples.length
        this.metrics.scrollPerformance = avgScrollTime
      }
      
      lastScrollTime = now
    }
    
    window.addEventListener('scroll', scrollHandler, { passive: true })
    
    // Monitor click responsiveness
    let clickStart: number
    
    document.addEventListener('mousedown', () => {
      clickStart = performance.now()
    })
    
    document.addEventListener('click', () => {
      if (clickStart) {
        const clickLatency = performance.now() - clickStart
        this.metrics.interactionLatency = clickLatency
        
        if (clickLatency > 100) {
          console.warn(`[Performance] Slow click response: ${clickLatency}ms`)
        }
      }
    })
  }
  
  // TPN-specific performance tracking
  public measureTPNCalculation<T>(calculationFn: () => T): T {
    const start = performance.now()
    const result = calculationFn()
    const end = performance.now()
    
    this.metrics.tpnCalculationTime = end - start
    this.reportMetric('TPN_CALCULATION', this.metrics.tpnCalculationTime)
    
    if (this.metrics.tpnCalculationTime > 100) {
      console.warn(`[Performance] Slow TPN calculation: ${this.metrics.tpnCalculationTime}ms`)
    }
    
    return result
  }
  
  // Async TPN calculation measurement
  public async measureTPNCalculationAsync<T>(calculationFn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    const result = await calculationFn()
    const end = performance.now()
    
    this.metrics.tpnCalculationTime = end - start
    this.reportMetric('TPN_CALCULATION_ASYNC', this.metrics.tpnCalculationTime)
    
    return result
  }
  
  // Section rendering performance
  public measureSectionRender<T>(renderFn: () => T): T {
    const start = performance.now()
    const result = renderFn()
    const end = performance.now()
    
    this.metrics.sectionRenderTime = end - start
    this.reportMetric('SECTION_RENDER', this.metrics.sectionRenderTime)
    
    return result
  }
  
  // Code execution performance
  public measureCodeExecution<T>(executionFn: () => T): T {
    const start = performance.now()
    const result = executionFn()
    const end = performance.now()
    
    this.metrics.codeExecutionTime = end - start
    this.reportMetric('CODE_EXECUTION', this.metrics.codeExecutionTime)
    
    return result
  }
  
  // Firebase query performance
  public measureFirebaseQuery<T>(queryFn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    
    return queryFn().then(result => {
      const end = performance.now()
      this.metrics.firebaseQueryTime = end - start
      this.reportMetric('FIREBASE_QUERY', this.metrics.firebaseQueryTime)
      
      if (this.metrics.firebaseQueryTime > 1000) {
        console.warn(`[Performance] Slow Firebase query: ${this.metrics.firebaseQueryTime}ms`)
      }
      
      return result
    })
  }
  
  // Memory usage tracking
  public getMemoryUsage(): MemoryUsage | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      }
    }
    return null
  }
  
  // Connection information
  public getConnectionInfo(): ConnectionInfo | null {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      }
    }
    return null
  }
  
  // Service Worker registration removed
  private async registerServiceWorker() {
    // Service worker functionality disabled
    console.log('[Performance] Service worker disabled')
  }
  
  // Cache statistics disabled
  public async getCacheStats(): Promise<any> {
    return null
  }
  
  // Prefetch functionality disabled
  public prefetchResource(url: string) {
    console.log('[Performance] Prefetch disabled for:', url)
  }
  
  // Report individual metrics
  private reportMetric(name: string, value: number) {
    // Send to analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance', {
        metric_name: name,
        value: Math.round(value),
        metric_value: value
      })
    }
    
    // Console logging in development
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${Math.round(value)}ms`)
    }
    
    // Store for batch reporting
    this.storeMetricForBatch(name, value)
  }
  
  // Store metrics for batch reporting
  private metricsBuffer: Array<{ name: string, value: number, timestamp: number }> = []
  
  private storeMetricForBatch(name: string, value: number) {
    this.metricsBuffer.push({
      name,
      value,
      timestamp: Date.now()
    })
    
    // Keep buffer size reasonable
    if (this.metricsBuffer.length > 100) {
      this.metricsBuffer = this.metricsBuffer.slice(-50)
    }
  }
  
  // Start periodic reporting
  private startPeriodicReporting() {
    this.reportingInterval = window.setInterval(() => {
      this.sendBatchReport()
    }, 30000) // Report every 30 seconds
  }
  
  // Send batch report
  private async sendBatchReport() {
    if (this.metricsBuffer.length === 0) return
    
    const report = {
      metrics: { ...this.metrics },
      memoryUsage: this.getMemoryUsage(),
      connectionInfo: this.getConnectionInfo(),
      cacheStats: await this.getCacheStats(),
      bufferedMetrics: [...this.metricsBuffer],
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }
    
    // Clear buffer
    this.metricsBuffer = []
    
    // Send to monitoring endpoint if available
    this.sendToMonitoringService(report)
    
    console.log('[Performance] Batch report:', report)
  }
  
  // Send to external monitoring service
  private async sendToMonitoringService(report: any) {
    try {
      // In production, this would send to a monitoring service like DataDog, New Relic, etc.
      if (import.meta.env.PROD && typeof window !== 'undefined') {
        await fetch('/api/performance-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        })
      }
    } catch (error) {
      console.warn('[Performance] Failed to send metrics:', error)
    }
  }
  
  // Get comprehensive performance report
  public getPerformanceReport() {
    return {
      webVitals: {
        lcp: this.metrics.lcp,
        fid: this.metrics.fid,
        cls: this.metrics.cls,
        fcp: this.metrics.fcp,
        ttfb: this.metrics.ttfb,
        tti: this.metrics.tti
      },
      customMetrics: {
        tpnCalculationTime: this.metrics.tpnCalculationTime,
        sectionRenderTime: this.metrics.sectionRenderTime,
        codeExecutionTime: this.metrics.codeExecutionTime,
        firebaseQueryTime: this.metrics.firebaseQueryTime
      },
      userExperience: {
        interactionLatency: this.metrics.interactionLatency,
        scrollPerformance: this.metrics.scrollPerformance
      },
      systemInfo: {
        memoryUsage: this.getMemoryUsage(),
        connectionInfo: this.getConnectionInfo()
      },
      timestamp: Date.now()
    }
  }
  
  // Performance budget checking
  public checkPerformanceBudget() {
    const budgets = {
      lcp: 2500,      // 2.5s
      fid: 100,       // 100ms
      cls: 0.1,       // 0.1
      tpnCalculation: 100, // 100ms for TPN calculations
      sectionRender: 50,   // 50ms for section rendering
    }
    
    const violations: string[] = []
    
    if (this.metrics.lcp && this.metrics.lcp > budgets.lcp) {
      violations.push(`LCP: ${this.metrics.lcp}ms > ${budgets.lcp}ms`)
    }
    
    if (this.metrics.fid && this.metrics.fid > budgets.fid) {
      violations.push(`FID: ${this.metrics.fid}ms > ${budgets.fid}ms`)
    }
    
    if (this.metrics.cls && this.metrics.cls > budgets.cls) {
      violations.push(`CLS: ${this.metrics.cls} > ${budgets.cls}`)
    }
    
    if (this.metrics.tpnCalculationTime && this.metrics.tpnCalculationTime > budgets.tpnCalculation) {
      violations.push(`TPN Calculation: ${this.metrics.tpnCalculationTime}ms > ${budgets.tpnCalculation}ms`)
    }
    
    if (this.metrics.sectionRenderTime && this.metrics.sectionRenderTime > budgets.sectionRender) {
      violations.push(`Section Render: ${this.metrics.sectionRenderTime}ms > ${budgets.sectionRender}ms`)
    }
    
    if (violations.length > 0) {
      console.warn('[Performance] Budget violations:', violations)
    }
    
    return {
      passed: violations.length === 0,
      violations
    }
  }
  
  // Clean up observers
  public destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval)
      this.reportingInterval = null
    }
    
    console.log('[Performance] Performance monitoring destroyed')
  }
}

// Lazy initialization
let _performanceMonitor: PerformanceMonitor | null = null

// Get or create singleton instance
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!_performanceMonitor) {
    _performanceMonitor = new PerformanceMonitor()
  }
  return _performanceMonitor
}

// Legacy export for backward compatibility
export const performanceMonitor = new Proxy({} as PerformanceMonitor, {
  get(target, prop) {
    return getPerformanceMonitor()[prop as keyof PerformanceMonitor]
  }
})

// Optional initialization function
export async function initializePerformanceMonitoring(): Promise<boolean> {
  if (typeof window === 'undefined') {
    console.warn('[Performance] Performance monitoring not available in server environment')
    return false
  }

  try {
    const monitor = getPerformanceMonitor()
    await monitor.init()
    console.log('[Performance] Performance monitoring initialized')
    return true
  } catch (error) {
    console.warn('[Performance] Failed to initialize performance monitoring:', error)
    return false
  }
}

// Utility functions for easy access - now lazy
export function measureTPNCalculation<T>(calculationFn: () => T): T {
  return getPerformanceMonitor().measureTPNCalculation(calculationFn)
}

export async function measureTPNCalculationAsync<T>(calculationFn: () => Promise<T>): Promise<T> {
  return getPerformanceMonitor().measureTPNCalculationAsync(calculationFn)
}

export function measureSectionRender<T>(renderFn: () => T): T {
  return getPerformanceMonitor().measureSectionRender(renderFn)
}

export function measureCodeExecution<T>(executionFn: () => T): T {
  return getPerformanceMonitor().measureCodeExecution(executionFn)
}

export function measureFirebaseQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  return getPerformanceMonitor().measureFirebaseQuery(queryFn)
}

export function getPerformanceReport() {
  return getPerformanceMonitor().getPerformanceReport()
}

export function checkPerformanceBudget() {
  return getPerformanceMonitor().checkPerformanceBudget()
}

// Cleanup function
export function destroyPerformanceMonitoring(): void {
  if (_performanceMonitor) {
    _performanceMonitor.destroy()
    _performanceMonitor = null
    console.log('[Performance] Performance monitoring destroyed')
  }
}