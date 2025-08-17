/**
 * Svelte hook for performance monitoring
 */
import { onMount, onDestroy } from 'svelte';
import { performanceMonitor } from '../services/performanceMonitor';

export interface PerformanceOptions {
  trackMemory?: boolean;
  trackBundleSize?: boolean;
  reportInterval?: number;
  enableLogging?: boolean;
}

/**
 * Hook to monitor component performance
 */
export function usePerformance(
  componentName: string,
  options: PerformanceOptions = {}
) {
  const {
    trackMemory = false,
    trackBundleSize = false,
    reportInterval = 60000, // 1 minute
    enableLogging = import.meta.env.DEV
  } = options;

  let mountTime: number;
  let reportTimer: NodeJS.Timeout | null = null;

  onMount(() => {
    mountTime = performance.now();
    performanceMonitor.mark(`${componentName}-mount-start`);

    // Track mount time
    requestAnimationFrame(() => {
      performanceMonitor.mark(`${componentName}-mount-end`);
      performanceMonitor.measureBetween(
        `${componentName}-mount`,
        `${componentName}-mount-start`,
        `${componentName}-mount-end`
      );
    });

    // Track memory if enabled
    if (trackMemory) {
      performanceMonitor.startMemoryTracking();
    }
    
    // Track bundle size once
    if (trackBundleSize) {
      performanceMonitor.trackBundleSize();
    }

    // Set up periodic reporting
    if (reportInterval > 0) {
      reportTimer = setInterval(() => {
        if (enableLogging) {
          console.log(`[${componentName}] Performance:`, 
            performanceMonitor.getSummary());
        }
      }, reportInterval);
    }
  });

  onDestroy(() => {
    // Track component lifetime
    const lifetime = performance.now() - mountTime;
    performanceMonitor.recordMetric(
      `${componentName}-lifetime`,
      lifetime,
      'ms'
    );

    // Clear report timer
    if (reportTimer) {
      clearInterval(reportTimer);
    }
  });

  return {
    /**
     * Measure an async operation
     */
    measureAsync: <T>(name: string, fn: () => Promise<T>) => {
      return performanceMonitor.measureAsync(
        `${componentName}-${name}`,
        fn
      );
    },

    /**
     * Measure a sync operation
     */
    measure: <T>(name: string, fn: () => T) => {
      return performanceMonitor.measure(
        `${componentName}-${name}`,
        fn
      );
    },

    /**
     * Track a custom metric
     */
    track: (name: string, value: number, unit: string = 'ms') => {
      performanceMonitor.recordMetric(
        `${componentName}-${name}`,
        value,
        unit
      );
    },

    /**
     * Mark a point in time
     */
    mark: (name: string) => {
      performanceMonitor.mark(`${componentName}-${name}`);
    },

    /**
     * Get performance summary for this component
     */
    getSummary: () => {
      const fullSummary = performanceMonitor.getSummary();
      const componentSummary: Record<string, any> = {};
      
      Object.keys(fullSummary).forEach(key => {
        if (key.includes(componentName)) {
          componentSummary[key] = fullSummary[key];
        }
      });
      
      return componentSummary;
    }
  };
}

/**
 * Hook to track TPN calculations
 */
export function useTPNPerformance() {
  return {
    trackCalculation: (type: string, fn: () => any) => {
      const start = performance.now();
      try {
        const result = fn();
        const duration = performance.now() - start;
        performanceMonitor.trackTPNCalculation(type, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        performanceMonitor.trackTPNCalculation(type, duration);
        throw error;
      }
    },

    trackAsyncCalculation: async (type: string, fn: () => Promise<any>) => {
      const start = performance.now();
      try {
        const result = await fn();
        const duration = performance.now() - start;
        performanceMonitor.trackTPNCalculation(type, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        performanceMonitor.trackTPNCalculation(type, duration);
        throw error;
      }
    }
  };
}