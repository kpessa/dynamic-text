<script lang="ts">
  import { sanitizeHTML, executeWithTPNContext } from '$lib/services/secureCodeExecution';
  import { debounce } from '$lib/services/uiHelpers';
  import type { Section } from '$lib/types';
  
  interface Props {
    sections: Section[];
    ingredientValues?: Record<string, any>;
    activeTestCase?: Record<string, any>;
    debounceDelay?: number;
    onError?: (error: Error) => void;
  }
  
  let { 
    sections = [],
    ingredientValues = {},
    activeTestCase = {},
    debounceDelay = 300,
    onError = () => {}
  }: Props = $props();
  
  // State for preview HTML and loading
  let previewHTML = $state('');
  let isUpdating = $state(false);
  let lastError = $state<Error | null>(null);
  
  // Performance tracking
  let lastUpdateTime = $state(0);
  let updateCount = $state(0);
  
  // Cache for static sections
  const staticCache = new Map<string, string>();
  
  /**
   * Process a single section and return its HTML
   */
  async function processSection(section: Section): Promise<string> {
    try {
      if (section.type === 'static') {
        // Check cache first
        const cacheKey = `${section.id}-${section.content}`;
        if (staticCache.has(cacheKey)) {
          return staticCache.get(cacheKey)!;
        }
        
        // Process and cache static content
        const html = sanitizeHTML(section.content.replace(/\n/g, '<br>'));
        staticCache.set(cacheKey, html);
        
        // Limit cache size
        if (staticCache.size > 100) {
          const firstKey = staticCache.keys().next().value;
          staticCache.delete(firstKey);
        }
        
        return html;
      } else if (section.type === 'dynamic') {
        // Get test case variables for this section
        const testVars = activeTestCase[section.id]?.variables || {};
        
        // Execute dynamic code with TPN context
        const result = await executeWithTPNContext(
          section.content,
          { ...ingredientValues, ...testVars },
          ingredientValues
        );
        
        // Handle line breaks in dynamic content
        return sanitizeHTML((result || '').toString().replace(/\n/g, '<br>'));
      }
      
      return '';
    } catch (error) {
      console.error(`Error processing section ${section.id}:`, error);
      lastError = error as Error;
      onError(error as Error);
      
      // Return error display
      return `<div class="preview-error" data-section="${section.id}">
        <span style="color: red;">Error in section: ${(error as Error).message}</span>
      </div>`;
    }
  }
  
  /**
   * Update the preview HTML for all sections
   */
  async function updatePreview() {
    const startTime = performance.now();
    isUpdating = true;
    lastError = null;
    
    try {
      // Process all sections in parallel for performance
      const htmlParts = await Promise.all(
        sections.map(section => processSection(section))
      );
      
      // Join with line breaks
      previewHTML = htmlParts.filter(html => html).join('<br>');
      
      // Track performance
      lastUpdateTime = performance.now() - startTime;
      updateCount++;
      
      // Log performance if it's slow
      if (lastUpdateTime > 100) {
        console.warn(`Preview update took ${lastUpdateTime.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('Preview update failed:', error);
      lastError = error as Error;
      onError(error as Error);
    } finally {
      isUpdating = false;
    }
  }
  
  // Create debounced update function
  const debouncedUpdate = debounce(updatePreview, debounceDelay);
  
  // Watch for changes and update preview
  $effect(() => {
    // Create dependencies on reactive values
    const deps = {
      sectionCount: sections.length,
      sectionContent: sections.map(s => s.content).join(''),
      ingredientVals: JSON.stringify(ingredientValues),
      testCases: JSON.stringify(activeTestCase)
    };
    
    // Trigger debounced update
    debouncedUpdate();
  });
  
  // Immediate update function for external triggers
  export function forceUpdate() {
    updatePreview();
  }
  
  // Clear cache function
  export function clearCache() {
    staticCache.clear();
  }
</script>

<div class="live-preview" class:updating={isUpdating}>
  {#if isUpdating}
    <div class="update-indicator">
      <span class="spinner"></span>
      Updating preview...
    </div>
  {/if}
  
  {#if lastError}
    <div class="preview-error-banner">
      <strong>Preview Error:</strong> {lastError.message}
      <button onclick={() => lastError = null}>✕</button>
    </div>
  {/if}
  
  <div class="preview-content">
    {@html previewHTML}
  </div>
  
  {#if import.meta.env.DEV}
    <div class="preview-debug">
      <small>
        Updates: {updateCount} | 
        Last: {lastUpdateTime.toFixed(1)}ms | 
        Cache: {staticCache.size} items
      </small>
    </div>
  {/if}
</div>

<style>
  .live-preview {
    position: relative;
    height: 100%;
    overflow: auto;
  }
  
  .live-preview.updating {
    opacity: 0.95;
  }
  
  .update-indicator {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: var(--color-surface-elevated);
    border-radius: 4px;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .preview-error-banner {
    background: var(--color-error-bg, #fee);
    color: var(--color-error, #c00);
    padding: 0.75rem;
    margin-bottom: 1rem;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .preview-error-banner button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    padding: 0;
  }
  
  .preview-content {
    padding: 1rem;
    line-height: 1.6;
  }
  
  .preview-error {
    padding: 0.5rem;
    background: #fef5f5;
    border-left: 3px solid #f00;
    margin: 0.5rem 0;
  }
  
  .preview-debug {
    position: fixed;
    bottom: 0;
    right: 0;
    padding: 0.25rem 0.5rem;
    background: rgba(0, 0, 0, 0.05);
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }
</style>