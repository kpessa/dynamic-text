<script lang="ts">
  /**
   * Error Boundary Component for Svelte 5
   * Catches and handles errors in child components for medical-grade reliability
   */
  
  import { onMount, onDestroy } from 'svelte';
  import { logger } from '../logger';
  
  interface Props {
    fallback?: any;
    onError?: (error: Error, errorInfo?: any) => void;
    resetKeys?: any[];
    resetOnPropsChange?: boolean;
    isolate?: boolean;
    componentName?: string;
    children?: any;
  }
  
  let { 
    fallback = null,
    onError,
    resetKeys = [],
    resetOnPropsChange = true,
    isolate = false,
    componentName = 'Unknown',
    children
  }: Props = $props();
  
  let hasError = $state(false);
  let error = $state<Error | null>(null);
  let errorInfo = $state<any>(null);
  let errorId = $state<string>('');
  let previousResetKeys = $state<any[]>([]);
  
  // Error recovery attempts tracking
  let recoveryAttempts = $state(0);
  const MAX_RECOVERY_ATTEMPTS = 3;
  
  // Track if this is a critical medical calculation error
  function isCriticalError(err: Error): boolean {
    const criticalPatterns = [
      /TPN/i,
      /calculation/i,
      /dosage/i,
      /medical/i,
      /getValue/i,
      /undefined.*cannot read/i
    ];
    
    return criticalPatterns.some(pattern => 
      pattern.test(err.message) || pattern.test(err.stack || '')
    );
  }
  
  // Generate unique error ID for tracking
  function generateErrorId(): string {
    return `${componentName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Reset error state
  function resetError() {
    hasError = false;
    error = null;
    errorInfo = null;
    errorId = '';
    recoveryAttempts = 0;
    logger.info('Error boundary reset', componentName);
  }
  
  // Handle caught errors
  function handleError(err: Error, info?: any) {
    errorId = generateErrorId();
    error = err;
    errorInfo = info;
    hasError = true;
    
    const errorDetails = {
      errorId,
      component: componentName,
      message: err.message,
      stack: err.stack,
      info,
      isCritical: isCriticalError(err),
      recoveryAttempts,
      timestamp: new Date().toISOString()
    };
    
    // Log based on severity
    if (isCriticalError(err)) {
      logger.error(`Critical error in ${componentName}`, err, componentName, errorDetails);
    } else {
      logger.warn(`Error caught in ${componentName}`, componentName, errorDetails);
    }
    
    // Call custom error handler
    if (onError) {
      try {
        onError(err, errorDetails);
      } catch (handlerError) {
        logger.error('Error in custom error handler', handlerError, componentName);
      }
    }
    
    // Attempt automatic recovery for non-critical errors
    if (!isCriticalError(err) && recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
      recoveryAttempts++;
      setTimeout(() => {
        logger.info(`Attempting recovery (${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})`, componentName);
        resetError();
      }, 1000 * recoveryAttempts);
    }
  }
  
  // Watch for reset key changes
  $effect(() => {
    if (resetOnPropsChange && JSON.stringify(resetKeys) !== JSON.stringify(previousResetKeys)) {
      previousResetKeys = [...resetKeys];
      if (hasError) {
        logger.info('Resetting error due to prop change', componentName);
        resetError();
      }
    }
  });
  
  // Set up global error handlers if isolate is false
  let unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  let errorHandler: ((event: ErrorEvent) => void) | null = null;
  
  onMount(() => {
    if (!isolate) {
      // Catch unhandled promise rejections
      unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        handleError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
          type: 'unhandledRejection',
          promise: event.promise,
          reason: event.reason
        });
        event.preventDefault();
      };
      
      // Catch global errors
      errorHandler = (event: ErrorEvent) => {
        handleError(event.error || new Error(event.message), {
          type: 'globalError',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
        event.preventDefault();
      };
      
      window.addEventListener('unhandledrejection', unhandledRejectionHandler);
      window.addEventListener('error', errorHandler);
    }
  });
  
  onDestroy(() => {
    if (unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    }
    if (errorHandler) {
      window.removeEventListener('error', errorHandler);
    }
  });
  
  // Render children safely
  const renderChildren = $derived(() => {
    if (!hasError && children) {
      return children;
    }
    return null;
  });
</script>

{#if hasError}
  {#if fallback}
    {@render fallback({ error, errorInfo, resetError, errorId })}
  {:else}
    <div class="error-boundary-fallback" role="alert" aria-live="assertive">
      <div class="error-icon">⚠️</div>
      <h2>Something went wrong</h2>
      
      {#if isCriticalError(error)}
        <div class="critical-error-notice">
          <strong>Critical Error Detected</strong>
          <p>This error affects medical calculations. Please refresh the page and contact support if the problem persists.</p>
        </div>
      {/if}
      
      <details class="error-details">
        <summary>Error Details</summary>
        <div class="error-info">
          <p><strong>Component:</strong> {componentName}</p>
          <p><strong>Error ID:</strong> <code>{errorId}</code></p>
          <p><strong>Message:</strong> {error?.message}</p>
          {#if import.meta.env.DEV && error?.stack}
            <pre class="error-stack">{error.stack}</pre>
          {/if}
        </div>
      </details>
      
      <div class="error-actions">
        <button 
          onclick={resetError} 
          class="reset-button"
          disabled={recoveryAttempts >= MAX_RECOVERY_ATTEMPTS}
        >
          {recoveryAttempts >= MAX_RECOVERY_ATTEMPTS ? 'Max retries reached' : 'Try Again'}
        </button>
        
        <button 
          onclick={() => window.location.reload()} 
          class="reload-button"
        >
          Reload Page
        </button>
      </div>
      
      {#if recoveryAttempts > 0}
        <p class="recovery-status">
          Recovery attempts: {recoveryAttempts}/{MAX_RECOVERY_ATTEMPTS}
        </p>
      {/if}
    </div>
  {/if}
{:else if renderChildren()}
  {@render renderChildren()}
{/if}

<style>
  .error-boundary-fallback {
    padding: 2rem;
    margin: 1rem;
    border: 2px solid #dc3545;
    border-radius: 8px;
    background: #fff5f5;
    text-align: center;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  h2 {
    color: #dc3545;
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
  }
  
  .critical-error-notice {
    background: #dc3545;
    color: white;
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
  }
  
  .critical-error-notice strong {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }
  
  .error-details {
    margin: 1.5rem 0;
    text-align: left;
    background: white;
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }
  
  .error-details summary {
    cursor: pointer;
    font-weight: 600;
    padding: 0.5rem;
    margin: -0.5rem;
    border-radius: 4px;
  }
  
  .error-details summary:hover {
    background: #f8f9fa;
  }
  
  .error-info {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #dee2e6;
  }
  
  .error-info p {
    margin: 0.5rem 0;
    word-break: break-word;
  }
  
  .error-info code {
    background: #f8f9fa;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
  }
  
  .error-stack {
    margin-top: 1rem;
    padding: 1rem;
    background: #1e1e1e;
    color: #d4d4d4;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.85rem;
    white-space: pre-wrap;
    word-break: break-all;
  }
  
  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1.5rem;
  }
  
  button {
    padding: 0.5rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .reset-button {
    background: #28a745;
    color: white;
  }
  
  .reset-button:hover:not(:disabled) {
    background: #218838;
    transform: translateY(-1px);
  }
  
  .reset-button:disabled {
    background: #6c757d;
    cursor: not-allowed;
    opacity: 0.6;
  }
  
  .reload-button {
    background: #007bff;
    color: white;
  }
  
  .reload-button:hover {
    background: #0056b3;
    transform: translateY(-1px);
  }
  
  .recovery-status {
    margin-top: 1rem;
    color: #6c757d;
    font-size: 0.9rem;
  }
  
  @media (max-width: 640px) {
    .error-boundary-fallback {
      padding: 1rem;
      margin: 0.5rem;
    }
    
    .error-actions {
      flex-direction: column;
    }
    
    button {
      width: 100%;
    }
  }
</style>