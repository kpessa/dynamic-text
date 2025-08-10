/**
 * Error Service - Comprehensive error handling with retry logic, network monitoring,
 * and user-friendly error messages for medical TPN application
 */

import { FirebaseError } from 'firebase/app';

// Error types specific to TPN application
export type TPNErrorType = 
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'DATA_INTEGRITY_ERROR'
  | 'MEDICAL_SAFETY_ERROR'
  | 'CACHE_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'UNKNOWN_ERROR';

export interface TPNError extends Error {
  type: TPNErrorType;
  code?: string;
  originalError?: Error;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  technicalDetails?: string;
  retryable: boolean;
  timestamp: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: Error) => boolean;
}

export interface NetworkState {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export class ErrorService {
  private networkState: NetworkState = { isOnline: navigator.onLine };
  private errorLog: TPNError[] = [];
  private maxLogSize = 100;
  private networkStateListeners: ((state: NetworkState) => void)[] = [];

  constructor() {
    this.setupNetworkMonitoring();
  }

  /**
   * Wraps async functions with comprehensive error handling and retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    retryConfig: Partial<RetryConfig> = {},
    context?: Record<string, any>
  ): Promise<T> {
    const config: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      retryCondition: (error) => this.isRetryableError(error),
      ...retryConfig
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await this.executeWithTimeout(operation, 30000); // 30 second timeout
      } catch (error) {
        lastError = error as Error;
        const tpnError = this.convertToTPNError(lastError, context);
        
        // Log error
        this.logError(tpnError);
        
        // Check if we should retry
        if (attempt === config.maxAttempts || !config.retryCondition!(lastError)) {
          throw tpnError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );
        
        console.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${config.maxAttempts}):`, tpnError.userMessage);
        await this.delay(delay);
      }
    }
    
    throw this.convertToTPNError(lastError!, context);
  }

  /**
   * Convert various error types to standardized TPN errors
   */
  convertToTPNError(error: Error, context?: Record<string, any>): TPNError {
    let type: TPNErrorType = 'UNKNOWN_ERROR';
    let severity: TPNError['severity'] = 'medium';
    let userMessage = 'An unexpected error occurred. Please try again.';
    let technicalDetails = error.message;
    let retryable = false;
    let code: string | undefined;

    // Firebase-specific errors
    if (error.name === 'FirebaseError' || 'code' in error) {
      const firebaseError = error as FirebaseError;
      code = firebaseError.code;
      
      switch (firebaseError.code) {
        case 'unavailable':
        case 'deadline-exceeded':
          type = 'NETWORK_ERROR';
          userMessage = 'Service temporarily unavailable. Please check your connection and try again.';
          retryable = true;
          break;
          
        case 'permission-denied':
          type = 'AUTHORIZATION_ERROR';
          userMessage = 'You do not have permission to perform this action.';
          severity = 'high';
          break;
          
        case 'unauthenticated':
          type = 'AUTHENTICATION_ERROR';
          userMessage = 'Please sign in to continue.';
          severity = 'high';
          break;
          
        case 'invalid-argument':
        case 'failed-precondition':
          type = 'VALIDATION_ERROR';
          userMessage = 'Invalid data provided. Please check your input.';
          severity = 'medium';
          break;
          
        case 'resource-exhausted':
          type = 'RATE_LIMIT_ERROR';
          userMessage = 'Too many requests. Please wait a moment and try again.';
          retryable = true;
          break;
          
        case 'data-loss':
        case 'internal':
          type = 'DATA_INTEGRITY_ERROR';
          userMessage = 'A data integrity issue occurred. Please contact support.';
          severity = 'critical';
          break;
          
        default:
          technicalDetails = `Firebase error: ${firebaseError.code} - ${firebaseError.message}`;
      }
    }
    // Network errors
    else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      type = 'NETWORK_ERROR';
      userMessage = 'Network connection error. Please check your internet connection.';
      retryable = true;
    }
    // Timeout errors
    else if (error.name === 'TimeoutError') {
      type = 'TIMEOUT_ERROR';
      userMessage = 'Request timed out. Please try again.';
      retryable = true;
    }
    // Medical safety validation errors
    else if (error.message.includes('medical') || error.message.includes('TPN') || error.message.includes('dosage')) {
      type = 'MEDICAL_SAFETY_ERROR';
      userMessage = 'Medical safety validation failed. Please review the data carefully.';
      severity = 'critical';
    }

    const tpnError: TPNError = {
      name: 'TPNError',
      message: userMessage,
      type,
      code,
      originalError: error,
      context,
      severity,
      userMessage,
      technicalDetails,
      retryable,
      timestamp: Date.now()
    };

    return tpnError;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Don't retry if offline
    if (!this.networkState.isOnline) {
      return false;
    }
    
    // Firebase retryable errors
    if ('code' in error) {
      const retryableCodes = [
        'unavailable',
        'deadline-exceeded',
        'resource-exhausted',
        'aborted',
        'internal'
      ];
      return retryableCodes.includes((error as any).code);
    }
    
    // Network errors are generally retryable
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }
    
    // Timeout errors are retryable
    if (error.name === 'TimeoutError') {
      return true;
    }
    
    return false;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const timeoutError = new Error(`Operation timed out after ${timeoutMs}ms`);
        timeoutError.name = 'TimeoutError';
        reject(timeoutError);
      }, timeoutMs);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log errors with size management
   */
  private logError(error: TPNError): void {
    this.errorLog.unshift(error);
    
    // Keep only recent errors
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
    
    // Log to console based on severity
    switch (error.severity) {
      case 'critical':
        console.error('[CRITICAL]', error.userMessage, error.technicalDetails, error.context);
        break;
      case 'high':
        console.error('[HIGH]', error.userMessage, error.technicalDetails);
        break;
      case 'medium':
        console.warn('[MEDIUM]', error.userMessage);
        break;
      case 'low':
        console.info('[LOW]', error.userMessage);
        break;
    }
  }

  /**
   * Set up network state monitoring
   */
  private setupNetworkMonitoring(): void {
    // Basic online/offline detection
    window.addEventListener('online', () => {
      this.networkState.isOnline = true;
      this.notifyNetworkStateListeners();
    });
    
    window.addEventListener('offline', () => {
      this.networkState.isOnline = false;
      this.notifyNetworkStateListeners();
    });
    
    // Enhanced network information if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionInfo = () => {
        this.networkState.connectionType = connection.type;
        this.networkState.effectiveType = connection.effectiveType;
        this.networkState.downlink = connection.downlink;
        this.networkState.rtt = connection.rtt;
        this.notifyNetworkStateListeners();
      };
      
      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo(); // Initial update
    }
  }

  /**
   * Subscribe to network state changes
   */
  onNetworkStateChange(listener: (state: NetworkState) => void): () => void {
    this.networkStateListeners.push(listener);
    listener(this.networkState); // Call immediately with current state
    
    return () => {
      this.networkStateListeners = this.networkStateListeners.filter(l => l !== listener);
    };
  }

  private notifyNetworkStateListeners(): void {
    this.networkStateListeners.forEach(listener => listener(this.networkState));
  }

  /**
   * Get current network state
   */
  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  /**
   * Get recent error log
   */
  getErrorLog(): TPNError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const last24h = this.errorLog.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000);
    
    const byType: Record<TPNErrorType, number> = {} as any;
    const bySeverity: Record<TPNError['severity'], number> = {} as any;
    
    last24h.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });
    
    return {
      total: this.errorLog.length,
      last24h: last24h.length,
      byType,
      bySeverity,
      retryableCount: this.errorLog.filter(e => e.retryable).length
    };
  }
}

// Global error service instance
export const errorService = new ErrorService();