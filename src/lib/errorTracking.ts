/**
 * Global Error Tracking Service
 * Centralized error tracking for medical application reliability
 */

import { logger, logError } from './logger';

export interface ErrorReport {
  id: string;
  timestamp: string;
  type: 'error' | 'warning' | 'critical';
  component?: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  isMedicalError?: boolean;
  recovered?: boolean;
  retryCount?: number;
}

export interface ErrorStats {
  totalErrors: number;
  criticalErrors: number;
  warningCount: number;
  recoveredCount: number;
  errorsByComponent: Record<string, number>;
  errorsByType: Record<string, number>;
  recentErrors: ErrorReport[];
  errorRate: number;
  lastErrorTime?: string;
}

class ErrorTrackingService {
  private errors: ErrorReport[] = [];
  private errorListeners: Set<(error: ErrorReport) => void> = new Set();
  private sessionId: string;
  private readonly MAX_STORED_ERRORS = 100;
  private readonly ERROR_REPORT_ENDPOINT = '/api/errors';
  private reportQueue: ErrorReport[] = [];
  private isReporting = false;
  
  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalHandlers();
    this.startReportingInterval();
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return;
    
    // Handle unhandled errors
    window.addEventListener('error', (event: ErrorEvent) => {
      this.trackError({
        type: 'critical',
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.trackError({
        type: 'critical',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        context: {
          promise: event.promise,
          reason: event.reason
        }
      });
    });
    
    // Track console errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      this.trackError({
        type: 'error',
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '),
        context: { consoleError: true }
      });
      originalError.apply(console, args);
    };
  }
  
  /**
   * Track an error
   */
  trackError(params: {
    type: 'error' | 'warning' | 'critical';
    message: string;
    component?: string;
    stack?: string;
    context?: Record<string, any>;
    recovered?: boolean;
    retryCount?: number;
  }): ErrorReport {
    const error: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      type: params.type,
      message: params.message,
      sessionId: this.sessionId,
      isMedicalError: this.isMedicalError(params.message, params.stack)
    };
    
    // Add optional properties only if defined
    if (params.component !== undefined) {
      error.component = params.component;
    }
    if (params.stack !== undefined) {
      error.stack = params.stack;
    }
    if (params.context !== undefined) {
      error.context = params.context;
    }
    if (navigator?.userAgent) {
      error.userAgent = navigator.userAgent;
    }
    if (window?.location?.href) {
      error.url = window.location.href;
    }
    if (params.recovered !== undefined) {
      error.recovered = params.recovered;
    }
    if (params.retryCount !== undefined) {
      error.retryCount = params.retryCount;
    }
    
    // Store error
    this.errors.push(error);
    if (this.errors.length > this.MAX_STORED_ERRORS) {
      this.errors.shift();
    }
    
    // Log based on type
    switch (params.type) {
      case 'critical':
        logger.error(`[ErrorTracking] Critical: ${params.message}`, new Error(params.stack), params.component);
        break;
      case 'error':
        logger.error(`[ErrorTracking] Error: ${params.message}`, new Error(params.stack), params.component);
        break;
      case 'warning':
        logger.warn(`[ErrorTracking] Warning: ${params.message}`, params.component);
        break;
    }
    
    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        logError('Error in error listener:', err instanceof Error ? err : new Error(String(err)));
      }
    });
    
    // Queue for reporting
    if (params.type === 'critical' || error.isMedicalError) {
      this.queueErrorReport(error);
    }
    
    return error;
  }
  
  /**
   * Check if error is medical-related
   */
  private isMedicalError(message: string, stack?: string): boolean {
    const medicalPatterns = [
      /TPN/i,
      /dosage/i,
      /calculation/i,
      /medical/i,
      /patient/i,
      /getValue/i,
      /ingredient/i,
      /reference.*range/i
    ];
    
    const combinedText = `${message} ${stack || ''}`;
    return medicalPatterns.some(pattern => pattern.test(combinedText));
  }
  
  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Queue error for reporting
   */
  private queueErrorReport(error: ErrorReport): void {
    this.reportQueue.push(error);
    
    // Immediate report for critical medical errors
    if (error.type === 'critical' && error.isMedicalError) {
      this.flushReportQueue();
    }
  }
  
  /**
   * Flush report queue
   */
  private async flushReportQueue(): Promise<void> {
    if (this.isReporting || this.reportQueue.length === 0) return;
    
    this.isReporting = true;
    const errors = [...this.reportQueue];
    this.reportQueue = [];
    
    try {
      // In production, send to error reporting endpoint
      if (!import.meta.env.DEV) {
        await fetch(this.ERROR_REPORT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ errors, sessionId: this.sessionId })
        });
      }
    } catch (err) {
      // Re-queue on failure
      this.reportQueue.unshift(...errors);
      logError('Failed to report errors:', err instanceof Error ? err : new Error(String(err)));
    } finally {
      this.isReporting = false;
    }
  }
  
  /**
   * Start periodic error reporting
   */
  private startReportingInterval(): void {
    // Report errors every 30 seconds
    setInterval(() => this.flushReportQueue(), 30000);
    
    // Report on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushReportQueue();
      });
    }
  }
  
  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    const recentErrors = this.errors.filter(e => 
      new Date(e.timestamp).getTime() > fiveMinutesAgo
    );
    
    const stats: ErrorStats = {
      totalErrors: this.errors.length,
      criticalErrors: this.errors.filter(e => e.type === 'critical').length,
      warningCount: this.errors.filter(e => e.type === 'warning').length,
      recoveredCount: this.errors.filter(e => e.recovered).length,
      errorsByComponent: {},
      errorsByType: {},
      recentErrors: recentErrors.slice(-10),
      errorRate: recentErrors.length / 5 // errors per minute
    };
    
    // Add optional lastErrorTime if exists
    const lastError = this.errors[this.errors.length - 1];
    if (lastError) {
      stats.lastErrorTime = lastError.timestamp;
    }
    
    // Count by component
    this.errors.forEach(error => {
      if (error.component) {
        stats.errorsByComponent[error.component] = 
          (stats.errorsByComponent[error.component] || 0) + 1;
      }
      stats.errorsByType[error.type] = 
        (stats.errorsByType[error.type] || 0) + 1;
    });
    
    return stats;
  }
  
  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
    logger.info('[ErrorTracking] Errors cleared');
  }
  
  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): ErrorReport[] {
    return this.errors.slice(-count);
  }
  
  /**
   * Get errors by component
   */
  getErrorsByComponent(component: string): ErrorReport[] {
    return this.errors.filter(e => e.component === component);
  }
  
  /**
   * Add error listener
   */
  addListener(listener: (error: ErrorReport) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }
  
  /**
   * Export errors for debugging
   */
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }
  
  /**
   * Import errors (for debugging)
   */
  importErrors(json: string): void {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.errors = imported;
        logger.info(`[ErrorTracking] Imported ${imported.length} errors`);
      }
    } catch (err) {
      logger.error('[ErrorTracking] Failed to import errors', err as Error);
    }
  }
}

// Export singleton instance
export const errorTracking = new ErrorTrackingService();

// Export convenience functions
export function trackError(
  message: string, 
  type: 'error' | 'warning' | 'critical' = 'error',
  component?: string,
  context?: Record<string, any>
): ErrorReport {
  const params: Parameters<typeof errorTracking.trackError>[0] = {
    type,
    message
  };
  
  if (component !== undefined) {
    params.component = component;
  }
  if (context !== undefined) {
    params.context = context;
  }
  
  return errorTracking.trackError(params);
}

export function trackCriticalError(
  message: string,
  error?: Error,
  component?: string
): ErrorReport {
  const params: Parameters<typeof errorTracking.trackError>[0] = {
    type: 'critical',
    message
  };
  
  if (error?.stack !== undefined) {
    params.stack = error.stack;
  }
  if (component !== undefined) {
    params.component = component;
  }
  if (error !== undefined) {
    params.context = { originalError: error };
  }
  
  return errorTracking.trackError(params);
}

export function trackWarning(
  message: string,
  component?: string,
  context?: Record<string, any>
): ErrorReport {
  const params: Parameters<typeof errorTracking.trackError>[0] = {
    type: 'warning',
    message
  };
  
  if (component !== undefined) {
    params.component = component;
  }
  if (context !== undefined) {
    params.context = context;
  }
  
  return errorTracking.trackError(params);
}

export function getErrorStats(): ErrorStats {
  return errorTracking.getStats();
}

export function subscribeToErrors(
  listener: (error: ErrorReport) => void
): () => void {
  return errorTracking.addListener(listener);
}