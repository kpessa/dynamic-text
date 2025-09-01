export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  excellent: number;
  good: number;
  needsImprovement: number;
}

export interface PerformanceReport {
  totalOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  excellentCount: number;
  goodCount: number;
  needsImprovementCount: number;
  poorCount: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeOperations: Map<string, number> = new Map();
  private readonly maxMetricsPerOperation = 100;
  
  private readonly defaultThresholds: PerformanceThresholds = {
    excellent: 100,        // < 100ms
    good: 500,            // < 500ms
    needsImprovement: 2000 // < 2000ms
  };
  
  /**
   * Start timing an operation
   */
  start(operationId: string): void {
    this.activeOperations.set(operationId, performance.now());
  }
  
  /**
   * End timing and record metric
   */
  end(operationId: string, metadata?: Record<string, any>): PerformanceMetric | null {
    const startTime = this.activeOperations.get(operationId);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationId}`);
      return null;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const metric: PerformanceMetric = {
      operation: operationId,
      startTime,
      endTime,
      duration,
      metadata
    };
    
    this.recordMetric(operationId, metric);
    this.activeOperations.delete(operationId);
    
    // Log to console
    this.logMetric(metric);
    
    return metric;
  }
  
  /**
   * Measure async operation
   */
  async measure<T>(
    operationId: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(operationId);
    
    try {
      const result = await fn();
      this.end(operationId, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.end(operationId, { ...metadata, success: false, error: String(error) });
      throw error;
    }
  }
  
  /**
   * Measure sync operation
   */
  measureSync<T>(
    operationId: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    this.start(operationId);
    
    try {
      const result = fn();
      this.end(operationId, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.end(operationId, { ...metadata, success: false, error: String(error) });
      throw error;
    }
  }
  
  /**
   * Record a metric
   */
  private recordMetric(operation: string, metric: PerformanceMetric): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const metrics = this.metrics.get(operation)!;
    metrics.push(metric);
    
    // Keep only recent metrics
    if (metrics.length > this.maxMetricsPerOperation) {
      metrics.shift();
    }
  }
  
  /**
   * Log metric to console
   */
  private logMetric(metric: PerformanceMetric): void {
    const rating = this.ratePerformance(metric.duration);
    const emoji = this.getPerformanceEmoji(rating);
    
    console.log(
      `${emoji} Performance [${metric.operation}]: ${metric.duration.toFixed(2)}ms`,
      metric.metadata || ''
    );
  }
  
  /**
   * Rate performance based on duration
   */
  private ratePerformance(duration: number): 'excellent' | 'good' | 'needs-improvement' | 'poor' {
    if (duration < this.defaultThresholds.excellent) return 'excellent';
    if (duration < this.defaultThresholds.good) return 'good';
    if (duration < this.defaultThresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  }
  
  /**
   * Get emoji for performance rating
   */
  private getPerformanceEmoji(rating: string): string {
    switch (rating) {
      case 'excellent': return '🚀';
      case 'good': return '✅';
      case 'needs-improvement': return '⚠️';
      case 'poor': return '🐌';
      default: return '📊';
    }
  }
  
  /**
   * Get metrics for a specific operation
   */
  getMetrics(operation: string): PerformanceMetric[] {
    return this.metrics.get(operation) || [];
  }
  
  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }
  
  /**
   * Generate report for an operation
   */
  generateReport(operation: string): PerformanceReport | null {
    const metrics = this.getMetrics(operation);
    if (metrics.length === 0) return null;
    
    const durations = metrics.map(m => m.duration);
    const total = durations.reduce((sum, d) => sum + d, 0);
    
    let excellentCount = 0;
    let goodCount = 0;
    let needsImprovementCount = 0;
    let poorCount = 0;
    
    durations.forEach(duration => {
      const rating = this.ratePerformance(duration);
      switch (rating) {
        case 'excellent': excellentCount++; break;
        case 'good': goodCount++; break;
        case 'needs-improvement': needsImprovementCount++; break;
        case 'poor': poorCount++; break;
      }
    });
    
    return {
      totalOperations: metrics.length,
      averageDuration: total / metrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      excellentCount,
      goodCount,
      needsImprovementCount,
      poorCount
    };
  }
  
  /**
   * Clear metrics for an operation
   */
  clearMetrics(operation?: string): void {
    if (operation) {
      this.metrics.delete(operation);
    } else {
      this.metrics.clear();
    }
  }
  
  /**
   * Set custom thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    Object.assign(this.defaultThresholds, thresholds);
  }
  
  /**
   * Log summary of all operations
   */
  logSummary(): void {
    console.log('=== Performance Summary ===');
    
    this.metrics.forEach((metrics, operation) => {
      const report = this.generateReport(operation);
      if (report) {
        console.log(`\n${operation}:`);
        console.log(`  Total: ${report.totalOperations} operations`);
        console.log(`  Average: ${report.averageDuration.toFixed(2)}ms`);
        console.log(`  Min: ${report.minDuration.toFixed(2)}ms`);
        console.log(`  Max: ${report.maxDuration.toFixed(2)}ms`);
        console.log(`  Distribution:`);
        console.log(`    🚀 Excellent: ${report.excellentCount}`);
        console.log(`    ✅ Good: ${report.goodCount}`);
        console.log(`    ⚠️  Needs Improvement: ${report.needsImprovementCount}`);
        console.log(`    🐌 Poor: ${report.poorCount}`);
      }
    });
    
    console.log('========================');
  }
  
  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    const data: Record<string, any> = {};
    
    this.metrics.forEach((metrics, operation) => {
      data[operation] = {
        metrics,
        report: this.generateReport(operation)
      };
    });
    
    return JSON.stringify(data, null, 2);
  }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return performanceMonitor.measure(operation, fn, metadata);
}

export function startMeasure(operation: string): void {
  performanceMonitor.start(operation);
}

export function endMeasure(operation: string, metadata?: Record<string, any>): void {
  performanceMonitor.end(operation, metadata);
}