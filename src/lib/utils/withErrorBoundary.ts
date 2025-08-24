/**
 * Higher Order Component for Error Boundaries
 * Provides easy wrapping of components with error handling
 */

import ErrorBoundary from '../components/ErrorBoundary.svelte';
import AsyncErrorBoundary from '../components/AsyncErrorBoundary.svelte';
import { logger } from '../logger';
import { trackCriticalError } from '../errorTracking';

export interface ErrorBoundaryOptions {
  componentName?: string;
  critical?: boolean;
  resetKeys?: any[];
  onError?: (error: Error, errorInfo?: any) => void;
  fallback?: any;
  isolate?: boolean;
  retryable?: boolean;
  maxRetries?: number;
}

export interface AsyncErrorBoundaryOptions extends ErrorBoundaryOptions {
  timeout?: number;
  retryDelay?: number;
  loading?: any;
}

/**
 * Wrap a component with error boundary
 */
export function withErrorBoundary<T extends Record<string, any>>(
  Component: any,
  options: ErrorBoundaryOptions = {}
): any {
  const {
    componentName = Component.name || 'Unknown',
    critical = false,
    resetKeys = [],
    onError,
    fallback,
    isolate = false,
    // retryable = true,
    // maxRetries = 3
  } = options;
  
  return {
    render: (props: T) => {
      return {
        component: ErrorBoundary,
        props: {
          componentName,
          resetKeys: [...resetKeys, ...Object.values(props)],
          onError: (error: Error, errorInfo?: any) => {
            // Track critical errors
            if (critical) {
              trackCriticalError(
                `Critical error in ${componentName}`,
                error,
                componentName
              );
            }
            
            // Call custom handler
            if (onError) {
              onError(error, errorInfo);
            }
          },
          fallback,
          isolate: critical || isolate,
          children: () => ({
            component: Component,
            props
          })
        }
      };
    }
  };
}

/**
 * Wrap an async component with error boundary
 */
export function withAsyncErrorBoundary<T extends Record<string, any>>(
  Component: any,
  options: AsyncErrorBoundaryOptions = {}
): any {
  const {
    componentName = Component.name || 'Unknown',
    critical = false,
    onError,
    timeout = 30000,
    retryDelay = 1000,
    loading,
    maxRetries = 3
  } = options;
  
  return {
    render: (props: T & { promise?: Promise<any> }) => {
      return {
        component: AsyncErrorBoundary,
        props: {
          componentName,
          promise: props.promise,
          timeout,
          retryCount: maxRetries,
          retryDelay,
          loading,
          onError: (error: Error) => {
            // Track critical errors
            if (critical) {
              trackCriticalError(
                `Critical async error in ${componentName}`,
                error,
                componentName
              );
            }
            
            // Call custom handler
            if (onError) {
              onError(error);
            }
          },
          children: (result: any) => ({
            component: Component,
            props: { ...props, data: result }
          })
        }
      };
    }
  };
}

/**
 * Create a safe version of a component
 */
export function createSafeComponent<T extends Record<string, any>>(
  Component: any,
  defaultProps?: Partial<T>,
  boundaryOptions?: ErrorBoundaryOptions
): any {
  const SafeComponent = withErrorBoundary(Component, {
    componentName: Component.name || 'SafeComponent',
    ...boundaryOptions
  });
  
  return {
    render: (props: T) => SafeComponent.render({ ...defaultProps, ...props })
  };
}

/**
 * Create a safe async component
 */
export function createSafeAsyncComponent<T extends Record<string, any>>(
  Component: any,
  defaultProps?: Partial<T>,
  boundaryOptions?: AsyncErrorBoundaryOptions
): any {
  const SafeComponent = withAsyncErrorBoundary(Component, {
    componentName: Component.name || 'SafeAsyncComponent',
    ...boundaryOptions
  });
  
  return {
    render: (props: T) => SafeComponent.render({ ...defaultProps, ...props })
  };
}

/**
 * Batch wrap multiple components
 */
export function wrapComponents(
  components: Record<string, any>,
  options: ErrorBoundaryOptions = {}
): Record<string, any> {
  const wrapped: Record<string, any> = {};
  
  for (const [name, Component] of Object.entries(components)) {
    wrapped[name] = withErrorBoundary(Component, {
      componentName: name,
      ...options
    });
  }
  
  return wrapped;
}

/**
 * Create a medical-critical component wrapper
 */
export function createMedicalComponent(
  Component: any,
  componentName: string
): any {
  return withErrorBoundary(Component, {
    componentName,
    critical: true,
    isolate: true,
    retryable: false,
    onError: (error: Error, errorInfo?: any) => {
      // Log to medical error tracking
      logger.error(`Medical component error: ${componentName}`, error, componentName, {
        ...errorInfo,
        severity: 'CRITICAL',
        requiresAudit: true,
        medicalComponent: true
      });
      
      // Track for compliance
      trackCriticalError(
        `Medical calculation error in ${componentName}`,
        error,
        componentName
      );
      
      // Alert user immediately
      alert(
        `Critical Error in Medical Component\n\n` +
        `Component: ${componentName}\n` +
        `Error: ${error.message}\n\n` +
        `This error affects medical calculations. ` +
        `Please refresh the page and contact support immediately.`
      );
    },
    fallback: ({ errorId }: { error: any; errorId: any }) => ({
      render: () => `
        <div style="
          padding: 2rem;
          background: #dc3545;
          color: white;
          border-radius: 8px;
          text-align: center;
          font-weight: bold;
        ">
          <h2>⚠️ Critical Medical Component Error</h2>
          <p>${componentName} has encountered a critical error.</p>
          <p>Error ID: ${errorId}</p>
          <p>This component cannot be recovered automatically.</p>
          <p>Please refresh the page and contact support.</p>
          <button 
            style="
              margin-top: 1rem;
              padding: 0.5rem 2rem;
              background: white;
              color: #dc3545;
              border: none;
              border-radius: 4px;
              font-weight: bold;
              cursor: pointer;
            "
            onclick="window.location.reload()"
          >
            Reload Application
          </button>
        </div>
      `
    })
  });
}

/**
 * Decorator for class components (if using class syntax)
 */
export function SafeComponent(options: ErrorBoundaryOptions = {}) {
  return function (target: any) {
    const originalRender = target.prototype.render;
    
    target.prototype.render = function (...args: any[]) {
      const component = originalRender.apply(this, args);
      return withErrorBoundary(component, {
        componentName: target.name,
        ...options
      });
    };
    
    return target;
  };
}