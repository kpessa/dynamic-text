import { logWarn, logError } from '$lib/logger';
/**
 * Performance Monitoring Service
 * Tracks and reports application performance metrics
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceThresholds {
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  FCP: number; // First Contentful Paint
  TTFB: number; // Time to First Byte
  bundleSize: number; // KB
  memoryUsage: number; // MB
  calculationTime: number; // ms
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private startTime: number = performance.now();
  
  private thresholds: PerformanceThresholds = {
    LCP: 2500, // 2.5s
    FID: 100, // 100ms
    CLS: 0.1, // 0.1
    FCP: 1800, // 1.8s
    TTFB: 800, // 800ms
    bundleSize: 500, // 500KB
    memoryUsage: 50, // 50MB
    calculationTime: 100 // 100ms for TPN calculations
  };

  constructor() {
    this.initializeObservers();
    this.trackMemoryUsage();
    this.trackLongTasks();
  }

  /**
   * Initialize performance observers for Web Vitals
   */
  private initializeObservers(): void {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('LCP', lastEntry.startTime, 'ms');
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        logWarn('LCP observer not supported');
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            if (entry.processingStart && entry.startTime) {
              const fid = entry.processingStart - entry.startTime;
              this.recordMetric('FID', fid, 'ms');
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        logWarn('FID observer not supported');
      }

      // Cumulative Layout Shift
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.recordMetric('CLS', clsValue, 'score');
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
        logWarn('CLS observer not supported');
      }
    }

    // Navigation timing
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        const timing = window.performance.timing;
        const ttfb = timing.responseStart - timing.fetchStart;
        const fcp = timing.domContentLoadedEventEnd - timing.fetchStart;
        const pageLoad = timing.loadEventEnd - timing.fetchStart;

        this.recordMetric('TTFB', ttfb, 'ms');
        this.recordMetric('FCP', fcp, 'ms');
        this.recordMetric('PageLoad', pageLoad, 'ms');
      });
    }
  }

  /**
   * Track memory usage
   */
  private trackMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMemoryMB = memory.usedJSHeapSize / 1048576;
        const totalMemoryMB = memory.totalJSHeapSize / 1048576;
        
        this.recordMetric('MemoryUsed', usedMemoryMB, 'MB');
        this.recordMetric('MemoryTotal', totalMemoryMB, 'MB');
        
        // Warn if memory usage is high
        if (usedMemoryMB > this.thresholds.memoryUsage) {
          logWarn(`High memory usage: ${usedMemoryMB.toFixed(2)}MB`);
        }
      }, 10000); // Check every 10 seconds
    }
  }

  /**
   * Track long tasks that might block the main thread
   */
  private trackLongTasks(): void {
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            this.recordMetric('LongTask', entry.duration, 'ms', {
              name: entry.name,
              startTime: entry.startTime
            });
            
            if (entry.duration > 50) {
              logWarn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        logWarn('Long task observer not supported');
      }
    }
  }

  /**
   * Record a performance metric
   */
  public recordMetric(
    name: string, 
    value: number, 
    unit: string = 'ms',
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata
    };
    
    this.metrics.push(metric);
    
    // Check against thresholds
    this.checkThreshold(name, value);
    
    // Keep only last 1000 metrics to prevent memory leak
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Check if metric exceeds threshold
   */
  private checkThreshold(name: string, value: number): void {
    const threshold = this.thresholds[name as keyof PerformanceThresholds];
    if (threshold && value > threshold) {
      logWarn(`Performance threshold exceeded for ${name}: ${value} > ${threshold}`, 'Ui');
      this.reportToAnalytics(name, value, true);
    }
  }

  /**
   * Measure execution time of a function
   */
  public async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'ms');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'ms', { error: true });
      throw error;
    }
  }

  /**
   * Measure execution time of a synchronous function
   */
  public measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'ms');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'ms', { error: true });
      throw error;
    }
  }

  /**
   * Mark a specific point in time
   */
  public mark(name: string): void {
    performance.mark(name);
  }

  /**
   * Measure between two marks
   */
  public measureBetween(name: string, startMark: string, endMark: string): void {
    try {
      performance.measure(name, startMark, endMark);
      const measures = performance.getEntriesByName(name, 'measure');
      const measure = measures[measures.length - 1];
      if (measure) {
        this.recordMetric(name, measure.duration, 'ms');
      }
    } catch (error) {
      logError(`Failed to measure between ${startMark} and ${endMark}:`, error, 'Validation');
    }
  }

  /**
   * Track bundle size
   */
  public trackBundleSize(): void {
    // Get all script sizes
    const scripts = performance.getEntriesByType('resource')
      .filter(entry => entry.name.endsWith('.js'));
    
    const totalSize = scripts.reduce((sum, script: any) => {
      return sum + (script.transferSize || 0);
    }, 0);
    
    const totalSizeKB = totalSize / 1024;
    this.recordMetric('BundleSize', totalSizeKB, 'KB');
    
    if (totalSizeKB > this.thresholds.bundleSize) {
      logWarn(`Bundle size exceeds threshold: ${totalSizeKB.toFixed(2)}KB`);
    }
  }

  /**
   * Track TPN calculation performance
   */
  public trackTPNCalculation(calculationType: string, duration: number): void {
    this.recordMetric(`TPN_${calculationType}`, duration, 'ms');
    
    if (duration > this.thresholds.calculationTime) {
      logWarn(`Slow TPN calculation (${calculationType}, 'Tpn'): ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get performance summary
   */
  public getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    // Group metrics by name and calculate averages
    const grouped = new Map<string, number[]>();
    this.metrics.forEach(metric => {
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, []);
      }
      grouped.get(metric.name)!.push(metric.value);
    });
    
    grouped.forEach((values, name) => {
      summary[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
        last: values[values.length - 1]
      };
    });
    
    return summary;
  }

  /**
   * Report metrics to analytics service
   */
  private reportToAnalytics(name: string, value: number, exceeded: boolean = false): void {
    // In production, this would send to your analytics service
    if (import.meta.env.PROD) {
      // Example: Google Analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'performance', {
          metric_name: name,
          value: value,
          threshold_exceeded: exceeded
        });
      }
      
      // Or custom analytics endpoint
      // fetch('/api/analytics/performance', {
      //   method: 'POST',
      //   body: JSON.stringify({ name, value, exceeded })
      // });
    }
  }

  /**
   * Generate performance report
   */
  public generateReport(): string {
    const summary = this.getSummary();
    const report = [`Performance Report (${new Date().toISOString()})\n`];
    
    Object.entries(summary).forEach(([name, stats]: [string, any]) => {
      report.push(`${name}:`);
      report.push(`  Average: ${stats.avg.toFixed(2)}`);
      report.push(`  Min: ${stats.min.toFixed(2)}`);
      report.push(`  Max: ${stats.max.toFixed(2)}`);
      report.push(`  Count: ${stats.count}`);
      report.push(`  Last: ${stats.last.toFixed(2)}\n`);
    });
    
    return report.join('\n');
  }

  /**
   * Clean up observers
   */
  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types and class for testing
export type { PerformanceMetric, PerformanceThresholds };
export { PerformanceMonitor };