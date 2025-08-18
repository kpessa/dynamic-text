<script lang="ts">
  /**
   * Safe Component Wrapper
   * Wraps components with error boundaries for medical-grade reliability
   */
  
  import ErrorBoundary from './ErrorBoundary.svelte';
  import AsyncErrorBoundary from './AsyncErrorBoundary.svelte';
  import { logger } from '../logger';
  
  interface Props {
    componentName: string;
    component: any;
    props?: Record<string, any>;
    async?: boolean;
    promise?: Promise<any>;
    critical?: boolean;
    resetKeys?: any[];
    onError?: (error: Error) => void;
    fallback?: any;
    loading?: any;
    retryable?: boolean;
  }
  
  let {
    componentName,
    component,
    props = {},
    async = false,
    promise,
    critical = false,
    resetKeys = [],
    onError,
    fallback,
    loading,
    retryable = true
  }: Props = $props();
  
  // Default error handler
  function handleError(error: Error, errorInfo?: any) {
    logger.error(`Component error in ${componentName}`, error, componentName, errorInfo);
    
    // Alert for critical medical components
    if (critical) {
      alert(`Critical error in ${componentName}: ${error.message}\n\nPlease refresh the page and contact support if the issue persists.`);
    }
    
    // Call custom handler
    if (onError) {
      onError(error);
    }
  }
  
  // Default fallback for critical components
  const criticalFallback = ({ error, resetError }) => ({
    render: () => `
      <div class="critical-component-error">
        <h3>⚠️ Critical Component Error</h3>
        <p><strong>${componentName}</strong> encountered an error and cannot continue.</p>
        <p class="error-message">${error?.message}</p>
        <div class="error-actions">
          ${retryable ? `<button onclick="${resetError}">Retry</button>` : ''}
          <button onclick="window.location.reload()">Reload Page</button>
        </div>
      </div>
    `
  });
  
  // Default loading component
  const defaultLoading = () => ({
    render: () => `
      <div class="component-loading">
        <div class="spinner"></div>
        <p>Loading ${componentName}...</p>
      </div>
    `
  });
</script>

{#if async && promise}
  <!-- Async component with promise -->
  <AsyncErrorBoundary
    {promise}
    componentName={componentName}
    loading={loading || defaultLoading}
    onError={handleError}
    retryable={retryable}
  >
    {@render component(props)}
  </AsyncErrorBoundary>
{:else}
  <!-- Sync component -->
  <ErrorBoundary
    componentName={componentName}
    onError={handleError}
    resetKeys={resetKeys}
    fallback={critical ? criticalFallback : fallback}
    isolate={critical}
  >
    {@render component(props)}
  </ErrorBoundary>
{/if}

<style>
  .critical-component-error {
    padding: 2rem;
    background: #fff5f5;
    border: 2px solid #dc3545;
    border-radius: 8px;
    text-align: center;
    margin: 1rem;
  }
  
  .critical-component-error h3 {
    color: #dc3545;
    margin: 0 0 1rem 0;
  }
  
  .error-message {
    background: white;
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
    font-family: monospace;
    word-break: break-word;
  }
  
  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
  }
  
  .error-actions button {
    padding: 0.5rem 1.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .error-actions button:first-child {
    background: #28a745;
    color: white;
  }
  
  .error-actions button:last-child {
    background: #007bff;
    color: white;
  }
  
  .component-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    min-height: 100px;
  }
  
  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .component-loading p {
    margin-top: 1rem;
    color: #6c757d;
  }
</style>