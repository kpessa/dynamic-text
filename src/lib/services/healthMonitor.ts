import { logError, logWarn } from '$lib/logger';
/**
 * Runtime Health Monitoring Service
 * Monitors application health and reports issues in real-time
 */

interface HealthMetrics {
  componentMountErrors: number;
  unhandledRejections: number;
  consoleErrors: number;
  navigationErrors: number;
  storeErrors: number;
  apiErrors: number;
  memoryUsage?: number;
  lastCheck: Date;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message?: string;
  timestamp: Date;
}

class HealthMonitor {
  private metrics: HealthMetrics = {
    componentMountErrors: 0,
    unhandledRejections: 0,
    consoleErrors: 0,
    navigationErrors: 0,
    storeErrors: 0,
    apiErrors: 0,
    lastCheck: new Date()
  };

  private checks: HealthCheck[] = [];
  private isMonitoring = false;
  private checkInterval: number | null = null;
  private errorListeners: Map<string, Function> = new Map();

  constructor() {
    // Auto-start monitoring in development
    if (import.meta.env.DEV) {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('[HealthMonitor] Starting runtime health monitoring...');
    
    // Monitor unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      this.metrics.unhandledRejections++;
      this.recordCheck({
        name: 'Unhandled Promise Rejection',
        status: 'error',
        message: event.reason?.toString(),
        timestamp: new Date()
      });
      logError('[HealthMonitor] Unhandled rejection:', event.reason);
    };
    window.addEventListener('unhandledrejection', rejectionHandler);
    this.errorListeners.set('unhandledrejection', rejectionHandler);
    
    // Monitor console errors
    const originalError = console.error;
    console.error = (...args) => {
      this.metrics.consoleErrors++;
      this.recordCheck({
        name: 'Console Error',
        status: 'error',
        message: args.join(' '),
        timestamp: new Date()
      });
      originalError.apply(console, args);
    };
    
    // Monitor navigation errors
    const errorHandler = (event: ErrorEvent) => {
      this.metrics.navigationErrors++;
      this.recordCheck({
        name: 'Runtime Error',
        status: 'error',
        message: `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
        timestamp: new Date()
      });
    };
    window.addEventListener('error', errorHandler);
    this.errorListeners.set('error', errorHandler);
    
    // Start periodic health checks
    this.checkInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
    
    // Perform initial check
    this.performHealthCheck();
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('[HealthMonitor] Stopping runtime health monitoring...');
    
    // Remove event listeners
    this.errorListeners.forEach((handler, event) => {
      window.removeEventListener(event, handler as EventListener);
    });
    this.errorListeners.clear();
    
    // Clear interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private performHealthCheck() {
    this.metrics.lastCheck = new Date();
    
    // Check memory usage if available
    if (performance && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1048576; // Convert to MB
      
      // Warn if memory usage is high
      if (this.metrics.memoryUsage > 100) {
        this.recordCheck({
          name: 'Memory Usage',
          status: 'warning',
          message: `High memory usage: ${this.metrics.memoryUsage.toFixed(2)} MB`,
          timestamp: new Date()
        });
      }
    }
    
    // Check error rates
    const totalErrors = this.metrics.componentMountErrors + 
                       this.metrics.unhandledRejections + 
                       this.metrics.consoleErrors + 
                       this.metrics.navigationErrors + 
                       this.metrics.storeErrors + 
                       this.metrics.apiErrors;
    
    if (totalErrors > 10) {
      this.recordCheck({
        name: 'Error Rate',
        status: 'error',
        message: `High error rate detected: ${totalErrors} total errors`,
        timestamp: new Date()
      });
    } else if (totalErrors > 5) {
      this.recordCheck({
        name: 'Error Rate',
        status: 'warning',
        message: `Moderate error rate: ${totalErrors} total errors`,
        timestamp: new Date()
      });
    } else {
      this.recordCheck({
        name: 'Application Health',
        status: 'healthy',
        message: 'Application is running normally',
        timestamp: new Date()
      });
    }
    
    // Log current metrics in development
    if (import.meta.env.DEV) {
      console.log('[HealthMonitor] Current metrics:', this.metrics);
    }
  }

  private recordCheck(check: HealthCheck) {
    this.checks.push(check);
    
    // Keep only last 100 checks
    if (this.checks.length > 100) {
      this.checks = this.checks.slice(-100);
    }
    
    // Log warnings and errors
    if (check.status !== 'healthy') {
      logWarn(`[HealthMonitor] ${check.status.toUpperCase()}: ${check.name}`, check.message);
    }
  }

  // Public API for reporting errors from components
  reportComponentError(componentName: string, error: Error) {
    this.metrics.componentMountErrors++;
    this.recordCheck({
      name: `Component Error: ${componentName}`,
      status: 'error',
      message: error.message,
      timestamp: new Date()
    });
  }

  reportStoreError(storeName: string, error: Error) {
    this.metrics.storeErrors++;
    this.recordCheck({
      name: `Store Error: ${storeName}`,
      status: 'error',
      message: error.message,
      timestamp: new Date()
    });
  }

  reportApiError(endpoint: string, error: Error) {
    this.metrics.apiErrors++;
    this.recordCheck({
      name: `API Error: ${endpoint}`,
      status: 'error',
      message: error.message,
      timestamp: new Date()
    });
  }

  // Get current health status
  getHealthStatus(): 'healthy' | 'warning' | 'error' {
    const recentChecks = this.checks.slice(-10);
    
    if (recentChecks.some(c => c.status === 'error')) {
      return 'error';
    }
    if (recentChecks.some(c => c.status === 'warning')) {
      return 'warning';
    }
    return 'healthy';
  }

  getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  getRecentChecks(limit = 10): HealthCheck[] {
    return this.checks.slice(-limit);
  }

  // Clear all metrics and checks
  reset() {
    this.metrics = {
      componentMountErrors: 0,
      unhandledRejections: 0,
      consoleErrors: 0,
      navigationErrors: 0,
      storeErrors: 0,
      apiErrors: 0,
      lastCheck: new Date()
    };
    this.checks = [];
  }

  // Export health report
  exportReport(): string {
    const report = {
      status: this.getHealthStatus(),
      metrics: this.metrics,
      recentChecks: this.getRecentChecks(20),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(report, null, 2);
  }
}

// Create singleton instance
export const healthMonitor = new HealthMonitor();

// Export for use in components
export function reportComponentError(componentName: string, error: Error) {
  healthMonitor.reportComponentError(componentName, error);
}

export function reportStoreError(storeName: string, error: Error) {
  healthMonitor.reportStoreError(storeName, error);
}

export function reportApiError(endpoint: string, error: Error) {
  healthMonitor.reportApiError(endpoint, error);
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Add health monitor to window for debugging
  (window as any).__healthMonitor = healthMonitor;
  
  // Log health status periodically in console
  setInterval(() => {
    const status = healthMonitor.getHealthStatus();
    const statusEmoji = {
      'healthy': '✅',
      'warning': '⚠️',
      'error': '❌'
    }[status];
    
    console.log(`[HealthMonitor] Status: ${statusEmoji} ${status}`);
  }, 60000); // Log every minute
}