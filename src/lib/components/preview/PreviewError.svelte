<script lang="ts">
  interface Props {
    error: Error | null;
    sectionId?: string;
    onDismiss?: () => void;
    showDetails?: boolean;
  }
  
  let { 
    error = null,
    sectionId,
    onDismiss,
    showDetails = false
  }: Props = $props();
  
  let expanded = $state(false);
  
  function getErrorType(err: Error): string {
    if (err.message.includes('SyntaxError')) return 'Syntax Error';
    if (err.message.includes('ReferenceError')) return 'Reference Error';
    if (err.message.includes('TypeError')) return 'Type Error';
    if (err.message.includes('timeout')) return 'Timeout Error';
    return 'Execution Error';
  }
  
  function getErrorLine(err: Error): number | null {
    const match = err.message.match(/line (\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }
  
  function formatStack(stack: string): string {
    // Clean up stack trace for display
    return stack
      .split('\n')
      .filter(line => !line.includes('node_modules'))
      .slice(0, 5)
      .join('\n');
  }
</script>

{#if error}
  <div class="preview-error-container" data-section={sectionId}>
    <div class="error-header">
      <span class="error-type">{getErrorType(error)}</span>
      {#if sectionId}
        <span class="error-section">Section: {sectionId}</span>
      {/if}
      {#if onDismiss}
        <button class="dismiss-btn" onclick={onDismiss} aria-label="Dismiss error">
          ✕
        </button>
      {/if}
    </div>
    
    <div class="error-message">
      {error.message}
      {#if getErrorLine(error)}
        <span class="error-line">Line {getErrorLine(error)}</span>
      {/if}
    </div>
    
    {#if showDetails && error.stack}
      <div class="error-details">
        <button 
          class="details-toggle"
          onclick={() => expanded = !expanded}
          aria-expanded={expanded}
        >
          {expanded ? '▼' : '▶'} Stack Trace
        </button>
        
        {#if expanded}
          <pre class="error-stack">{formatStack(error.stack)}</pre>
        {/if}
      </div>
    {/if}
    
    <div class="error-help">
      <strong>💡 Tips:</strong>
      <ul>
        {#if getErrorType(error) === 'Syntax Error'}
          <li>Check for missing brackets, quotes, or semicolons</li>
          <li>Ensure all parentheses and braces are balanced</li>
        {:else if getErrorType(error) === 'Reference Error'}
          <li>Check variable names are spelled correctly</li>
          <li>Ensure variables are defined before use</li>
          <li>Use <code>me.getValue('key')</code> for TPN values</li>
        {:else if getErrorType(error) === 'Type Error'}
          <li>Check that you're using the correct data types</li>
          <li>Ensure functions are called with correct arguments</li>
        {:else if getErrorType(error) === 'Timeout Error'}
          <li>Your code took too long to execute</li>
          <li>Check for infinite loops or heavy computations</li>
        {:else}
          <li>Check your code syntax and logic</li>
          <li>Ensure all required values are available</li>
        {/if}
      </ul>
    </div>
  </div>
{/if}

<style>
  .preview-error-container {
    background: #fff5f5;
    border: 1px solid #ffcccc;
    border-radius: 6px;
    padding: 1rem;
    margin: 1rem 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
  }
  
  .error-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .error-type {
    background: #ff4444;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
  }
  
  .error-section {
    color: #666;
    font-size: 0.75rem;
  }
  
  .dismiss-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    padding: 0;
    transition: color 0.2s;
  }
  
  .dismiss-btn:hover {
    color: #666;
  }
  
  .error-message {
    color: #cc0000;
    font-weight: 500;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .error-line {
    background: #ffe6e6;
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    font-size: 0.75rem;
    color: #990000;
  }
  
  .error-details {
    margin: 0.75rem 0;
  }
  
  .details-toggle {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0.25rem 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .details-toggle:hover {
    color: #333;
  }
  
  .error-stack {
    background: #f8f8f8;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 0.75rem;
    margin-top: 0.5rem;
    overflow-x: auto;
    font-size: 0.75rem;
    line-height: 1.4;
    color: #666;
  }
  
  .error-help {
    background: #fffef5;
    border: 1px solid #f0e8d0;
    border-radius: 4px;
    padding: 0.75rem;
    margin-top: 0.75rem;
  }
  
  .error-help strong {
    color: #8b7355;
    font-size: 0.875rem;
  }
  
  .error-help ul {
    margin: 0.5rem 0 0 1.25rem;
    padding: 0;
    color: #666;
  }
  
  .error-help li {
    margin: 0.25rem 0;
    font-size: 0.813rem;
  }
  
  .error-help code {
    background: #f5f5f5;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-size: 0.813rem;
    color: #333;
  }
</style>