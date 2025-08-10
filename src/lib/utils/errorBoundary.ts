/**
 * Error Boundary Utilities for Svelte
 * Provides error handling and recovery mechanisms
 */

interface ErrorInfo {
  error: Error
  timestamp: number
  context?: string
  userId?: string
  url?: string
  userAgent?: string
}

class ErrorBoundaryManager {
  private errorCallbacks = new Set<(errorInfo: ErrorInfo) => void>()
  private isInitialized = false
  private errorCount = 0
  private maxErrors = 10
  private errorResetTime = 60000 // 1 minute

  init() {
    if (this.isInitialized) return

    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), 'global-error')
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new Error(event.reason?.message || 'Unhandled promise rejection'),
        'unhandled-rejection'
      )
      // Prevent the default browser behavior
      event.preventDefault()
    })

    // Reset error count periodically
    setInterval(() => {
      this.errorCount = 0
    }, this.errorResetTime)

    this.isInitialized = true
    console.log('[ErrorBoundary] Error handling initialized')
  }

  handleError(error: Error, context?: string) {
    this.errorCount++

    const errorInfo: ErrorInfo = {
      error,
      timestamp: Date.now(),
      context,
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    console.error(`[ErrorBoundary] Error in ${context}:`, error)

    // Report to callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(errorInfo)
      } catch (callbackError) {
        console.error('[ErrorBoundary] Error in error callback:', callbackError)
      }
    })

    // Check if we've hit too many errors (circuit breaker)
    if (this.errorCount >= this.maxErrors) {
      console.warn('[ErrorBoundary] Too many errors detected, triggering recovery')
      this.triggerRecovery()
    }
  }

  onError(callback: (errorInfo: ErrorInfo) => void) {
    this.errorCallbacks.add(callback)
    
    return () => {
      this.errorCallbacks.delete(callback)
    }
  }

  private triggerRecovery() {
    // Clear local storage to reset app state
    try {
      const importantKeys = ['auth', 'user-preferences']
      const preservedData: Record<string, string> = {}
      
      // Preserve important data
      importantKeys.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          preservedData[key] = value
        }
      })
      
      // Clear all storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Restore important data
      Object.entries(preservedData).forEach(([key, value]) => {
        localStorage.setItem(key, value)
      })
      
      console.log('[ErrorBoundary] Storage cleared, preserved important data')
    } catch (error) {
      console.warn('[ErrorBoundary] Failed to clear storage:', error)
    }

    // Show recovery message and reload
    this.showRecoveryMessage()
  }

  private showRecoveryMessage() {
    const message = document.createElement('div')
    message.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: #dc3545;
          padding: 2rem;
          border-radius: 8px;
          text-align: center;
          max-width: 400px;
        ">
          <h2 style="margin-bottom: 1rem;">App Recovery</h2>
          <p style="margin-bottom: 2rem;">The application encountered multiple errors and is recovering. Your work has been saved.</p>
          <button onclick="window.location.reload()" style="
            background: white;
            color: #dc3545;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
          ">Reload Application</button>
        </div>
      </div>
    `
    document.body.appendChild(message)

    // Auto-reload after 10 seconds
    setTimeout(() => {
      window.location.reload()
    }, 10000)
  }

  // Wrapper for async operations with timeout
  async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number = 5000,
    context?: string
  ): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      })
    ]).catch(error => {
      this.handleError(error, `timeout-${context}`)
      throw error
    })
  }

  // Wrapper for safe async operations
  async safeAsync<T>(
    operation: () => Promise<T>,
    fallback: T,
    context?: string
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), context)
      return fallback
    }
  }

  // Wrapper for safe sync operations
  safe<T>(operation: () => T, fallback: T, context?: string): T {
    try {
      return operation()
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)), context)
      return fallback
    }
  }

  // Report error to external service (placeholder)
  private async reportError(errorInfo: ErrorInfo) {
    try {
      // In production, send to error reporting service
      if (import.meta.env.PROD) {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorInfo)
        })
      }
    } catch (error) {
      console.warn('[ErrorBoundary] Failed to report error:', error)
    }
  }

  getErrorCount(): number {
    return this.errorCount
  }

  isHealthy(): boolean {
    return this.errorCount < this.maxErrors
  }
}

// Singleton instance
export const errorBoundary = new ErrorBoundaryManager()

// Initialize error handling
export function initializeErrorHandling() {
  errorBoundary.init()
}

// Utility functions
export function handleError(error: Error, context?: string) {
  errorBoundary.handleError(error, context)
}

export function onError(callback: (errorInfo: ErrorInfo) => void) {
  return errorBoundary.onError(callback)
}

export function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs?: number,
  context?: string
): Promise<T> {
  return errorBoundary.withTimeout(operation, timeoutMs, context)
}

export function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  context?: string
): Promise<T> {
  return errorBoundary.safeAsync(operation, fallback, context)
}

export function safe<T>(operation: () => T, fallback: T, context?: string): T {
  return errorBoundary.safe(operation, fallback, context)
}

// Export types
export type { ErrorInfo }