<script lang="ts">
  /**
   * Async Error Boundary Component
   * Handles errors in async operations and promises
   */
  
  import { onMount } from 'svelte';
  import ErrorBoundary from './ErrorBoundary.svelte';
  import { logger } from '../logger';
  
  interface Props {
    promise?: Promise<any>;
    loading?: any;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
    onError?: (error: Error) => void;
    onRetry?: () => void;
    componentName?: string;
    children?: any;
  }
  
  let {
    promise,
    loading = null,
    timeout = 30000,
    retryCount = 3,
    retryDelay = 1000,
    onError,
    onRetry,
    componentName = 'AsyncOperation',
    children
  }: Props = $props();
  
  let status = $state<'pending' | 'resolved' | 'rejected' | 'timeout'>('pending');
  let result = $state<any>(null);
  let error = $state<Error | null>(null);
  let currentRetry = $state(0);
  let timeoutId = $state<number | null>(null);
  
  // Handle promise resolution
  async function handlePromise(p: Promise<any>) {
    status = 'pending';
    error = null;
    
    // Set timeout
    if (timeout > 0) {
      timeoutId = window.setTimeout(() => {
        if (status === 'pending') {
          status = 'timeout';
          error = new Error(`Operation timed out after ${timeout}ms`);
          logger.error(`Async operation timeout in ${componentName}`, error, componentName);
          handleError(error);
        }
      }, timeout);
    }
    
    try {
      result = await p;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      status = 'resolved';
      currentRetry = 0;
    } catch (err) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      error = err as Error;
      status = 'rejected';
      handleError(err as Error);
    }
  }
  
  // Handle errors with retry logic
  async function handleError(err: Error) {
    logger.warn(`Async error in ${componentName} (retry ${currentRetry}/${retryCount})`, componentName, {
      error: err.message,
      currentRetry,
      maxRetries: retryCount
    });
    
    if (onError) {
      onError(err);
    }
    
    if (currentRetry < retryCount && promise) {
      currentRetry++;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * currentRetry));
      
      if (onRetry) {
        onRetry();
      }
      
      // Retry the promise
      handlePromise(promise);
    }
  }
  
  // Watch for promise changes
  $effect(() => {
    if (promise) {
      handlePromise(promise);
    }
  });
  
  // Manual retry function
  function retry() {
    currentRetry = 0;
    if (promise) {
      handlePromise(promise);
    }
  }
</script>

<ErrorBoundary 
  componentName="AsyncBoundary-{componentName}"
  fallback={({ error: boundaryError, resetError }) => (
    <div class="async-error-fallback">
      <h3>Async Operation Failed</h3>
      <p>{boundaryError?.message}</p>
      <button onclick={() => { resetError(); retry(); }}>Retry</button>
    </div>
  )}
>
  {#if status === 'pending'}
    {#if loading}
      {@render loading()}
    {:else}
      <div class="async-loading" aria-busy="true" aria-label="Loading">
        <div class="spinner"></div>
        <p>Loading {componentName}...</p>
      </div>
    {/if}
  {:else if status === 'resolved'}
    {#if children}
      {@render children(result)}
    {:else}
      <div>Operation completed successfully</div>
    {/if}
  {:else if status === 'rejected' || status === 'timeout'}
    <div class="async-error" role="alert">
      <div class="error-header">
        <span class="error-icon">❌</span>
        <h3>{status === 'timeout' ? 'Operation Timed Out' : 'Operation Failed'}</h3>
      </div>
      
      <div class="error-content">
        <p class="error-message">{error?.message}</p>
        
        {#if currentRetry > 0}
          <p class="retry-info">
            Retry attempt {currentRetry} of {retryCount} failed
          </p>
        {/if}
        
        <div class="error-actions">
          {#if currentRetry < retryCount}
            <button onclick={retry} class="retry-button">
              Retry Now
            </button>
          {:else}
            <button onclick={retry} class="retry-button">
              Start Over
            </button>
          {/if}
        </div>
      </div>
      
      {#if import.meta.env.DEV}
        <details class="error-stack-details">
          <summary>Stack Trace</summary>
          <pre>{error?.stack}</pre>
        </details>
      {/if}
    </div>
  {/if}
</ErrorBoundary>

<style>
  .async-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    min-height: 200px;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .async-loading p {
    margin-top: 1rem;
    color: #6c757d;
  }
  
  .async-error, .async-error-fallback {
    padding: 1.5rem;
    background: #fff5f5;
    border: 1px solid #f5c6cb;
    border-radius: 8px;
    margin: 1rem 0;
  }
  
  .error-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .error-icon {
    font-size: 1.5rem;
  }
  
  .error-header h3 {
    margin: 0;
    color: #721c24;
  }
  
  .error-content {
    color: #721c24;
  }
  
  .error-message {
    margin: 0.5rem 0;
    font-weight: 500;
  }
  
  .retry-info {
    margin: 0.5rem 0;
    color: #856404;
    background: #fff3cd;
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
  
  .error-actions {
    margin-top: 1rem;
  }
  
  .retry-button {
    padding: 0.5rem 1.5rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .retry-button:hover {
    background: #218838;
    transform: translateY(-1px);
  }
  
  .error-stack-details {
    margin-top: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 4px;
  }
  
  .error-stack-details summary {
    cursor: pointer;
    font-weight: 600;
    color: #495057;
  }
  
  .error-stack-details pre {
    margin-top: 1rem;
    padding: 1rem;
    background: #1e1e1e;
    color: #d4d4d4;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.85rem;
  }
</style>