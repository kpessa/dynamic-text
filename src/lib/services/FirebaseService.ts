/**
 * Firebase Service - Main orchestrator for optimized Firebase operations
 * Provides unified interface to domain services with monitoring and health checks
 */

import { onSnapshot, connectionsCount } from 'firebase/firestore';
import { db } from '../firebase';

// Base services
import { cacheService } from './base/CacheService';
import { errorService } from './base/ErrorService';
import { syncService } from './base/SyncService';

// Domain services
import { ingredientService } from './domain/IngredientService';
import { referenceService } from './domain/ReferenceService';
import { configService } from './domain/ConfigService';

// Re-export all services for easy access
export {
  cacheService,
  errorService,
  syncService,
  ingredientService,
  referenceService,
  configService
};

// Re-export helper functions
export { 
  formatIngredientName, 
  normalizeIngredientId 
} from './domain/IngredientService';

export { 
  generateReferenceId 
} from './domain/ReferenceService';

export { 
  normalizeConfigId, 
  versionToPopulationType 
} from './domain/ConfigService';

export interface FirebaseServiceHealth {
  isOnline: boolean;
  cacheHitRatio: number;
  activeSubscriptions: number;
  errorRate: number;
  lastHealthCheck: number;
  performance: {
    avgResponseTime: number;
    totalOperations: number;
    failedOperations: number;
  };
}

export interface ServiceMetrics {
  cache: {
    hits: number;
    misses: number;
    hitRatio: number;
    size: number;
    evictions: number;
  };
  sync: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalUpdates: number;
    errors: number;
  };
  errors: {
    total: number;
    last24h: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  network: {
    isOnline: boolean;
    connectionType?: string;
    effectiveType?: string;
  };
}

/**
 * Main Firebase Service orchestrator
 * Provides health monitoring, performance metrics, and unified service access
 */
export class FirebaseService {
  private healthCheckInterval: number | null = null;
  private performanceMetrics = {
    totalOperations: 0,
    failedOperations: 0,
    responseTimes: [] as number[],
    maxResponseTimeHistory: 100
  };

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Initialize Firebase services with optimization
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing optimized Firebase services...');
      
      // Services are already initialized via imports
      // This method can be used for any additional setup
      
      console.log('Firebase services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase services:', error);
      throw errorService.convertToTPNError(error as Error, { operation: 'initialize' });
    }
  }

  /**
   * Perform comprehensive health check
   */
  async healthCheck(): Promise<FirebaseServiceHealth> {
    try {
      const networkState = errorService.getNetworkState();
      const cacheStats = cacheService.getStats();
      const syncStats = syncService.getStats();
      const errorStats = errorService.getErrorStats();
      
      const avgResponseTime = this.performanceMetrics.responseTimes.length > 0
        ? this.performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.responseTimes.length
        : 0;
      
      const errorRate = this.performanceMetrics.totalOperations > 0
        ? this.performanceMetrics.failedOperations / this.performanceMetrics.totalOperations
        : 0;

      return {
        isOnline: networkState.isOnline,
        cacheHitRatio: cacheStats.hits > 0 ? cacheStats.hits / (cacheStats.hits + cacheStats.misses) : 0,
        activeSubscriptions: syncStats.activeSubscriptions,
        errorRate,
        lastHealthCheck: Date.now(),
        performance: {
          avgResponseTime,
          totalOperations: this.performanceMetrics.totalOperations,
          failedOperations: this.performanceMetrics.failedOperations
        }
      };
    } catch (error) {
      console.error('Health check failed:', error);
      throw errorService.convertToTPNError(error as Error, { operation: 'healthCheck' });
    }
  }

  /**
   * Get comprehensive service metrics
   */
  getMetrics(): ServiceMetrics {
    const cacheStats = cacheService.getStats();
    const syncStats = syncService.getStats();
    const errorStats = errorService.getErrorStats();
    const networkState = errorService.getNetworkState();

    return {
      cache: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRatio: cacheService.getHitRatio(),
        size: cacheStats.size,
        evictions: cacheStats.evictions
      },
      sync: {
        totalSubscriptions: syncStats.totalSubscriptions,
        activeSubscriptions: syncStats.activeSubscriptions,
        totalUpdates: syncStats.totalUpdates,
        errors: syncStats.errors
      },
      errors: {
        total: errorStats.total,
        last24h: errorStats.last24h,
        byType: errorStats.byType,
        bySeverity: errorStats.bySeverity
      },
      network: {
        isOnline: networkState.isOnline,
        connectionType: networkState.connectionType,
        effectiveType: networkState.effectiveType
      }
    };
  }

  /**
   * Optimize performance by cleaning up resources
   */
  async optimizePerformance(): Promise<void> {
    try {
      console.log('Starting performance optimization...');
      
      // Clear old caches
      const beforeCacheSize = cacheService.getStats().size;
      // Cache service handles its own cleanup automatically
      
      // Clean up stale subscriptions
      const activeSubscriptionsBefore = syncService.getStats().activeSubscriptions;
      // Sync service handles its own cleanup automatically
      
      // Clear old error logs
      const errorLogSizeBefore = errorService.getErrorLog().length;
      if (errorLogSizeBefore > 50) {
        errorService.clearErrorLog();
      }
      
      console.log('Performance optimization completed:', {
        cacheSize: { before: beforeCacheSize, after: cacheService.getStats().size },
        activeSubscriptions: { before: activeSubscriptionsBefore, after: syncService.getStats().activeSubscriptions },
        errorLogSize: { before: errorLogSizeBefore, after: errorService.getErrorLog().length }
      });
    } catch (error) {
      console.error('Performance optimization failed:', error);
      throw errorService.convertToTPNError(error as Error, { operation: 'optimizePerformance' });
    }
  }

  /**
   * Emergency shutdown - cleanup all resources
   */
  async shutdown(): Promise<void> {
    try {
      console.log('Shutting down Firebase services...');
      
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      // Unsubscribe all active subscriptions
      const unsubscribedCount = syncService.unsubscribeAll();
      console.log(`Unsubscribed ${unsubscribedCount} active subscriptions`);
      
      // Clear all caches
      cacheService.clear();
      
      console.log('Firebase services shutdown completed');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw errorService.convertToTPNError(error as Error, { operation: 'shutdown' });
    }
  }

  /**
   * Record operation performance metrics
   */
  recordOperation(responseTime: number, success: boolean): void {
    this.performanceMetrics.totalOperations++;
    
    if (!success) {
      this.performanceMetrics.failedOperations++;
    }
    
    // Keep rolling average of response times
    this.performanceMetrics.responseTimes.push(responseTime);
    if (this.performanceMetrics.responseTimes.length > this.performanceMetrics.maxResponseTimeHistory) {
      this.performanceMetrics.responseTimes.shift();
    }
  }

  /**
   * Force cache invalidation for performance testing
   */
  invalidateAllCaches(): void {
    cacheService.clear();
    console.log('All caches invalidated');
  }

  /**
   * Get active subscriptions for debugging
   */
  getActiveSubscriptions() {
    return syncService.getActiveSubscriptions();
  }

  /**
   * Get error log for debugging
   */
  getErrorLog() {
    return errorService.getErrorLog();
  }

  /**
   * Test Firebase connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      // Simple test to verify Firebase connectivity
      const startTime = Date.now();
      
      // Try to read a small amount of data
      await ingredientService.getAllIngredients();
      
      const responseTime = Date.now() - startTime;
      this.recordOperation(responseTime, true);
      
      return true;
    } catch (error) {
      this.recordOperation(0, false);
      console.error('Connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Perform health check every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        
        // Log warnings for poor performance
        if (health.errorRate > 0.1) {
          console.warn(`High error rate detected: ${(health.errorRate * 100).toFixed(1)}%`);
        }
        
        if (health.cacheHitRatio < 0.5) {
          console.warn(`Low cache hit ratio: ${(health.cacheHitRatio * 100).toFixed(1)}%`);
        }
        
        if (health.performance.avgResponseTime > 5000) {
          console.warn(`Slow response times: ${health.performance.avgResponseTime.toFixed(0)}ms average`);
        }
        
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 5 * 60 * 1000) as any; // 5 minutes
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();

// Auto-initialize when imported
firebaseService.initialize().catch(error => {
  console.error('Failed to auto-initialize Firebase services:', error);
});

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    firebaseService.shutdown().catch(error => {
      console.error('Error during page unload cleanup:', error);
    });
  });
}