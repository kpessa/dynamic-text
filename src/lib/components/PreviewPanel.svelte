<script>
  import { sanitizeHTML } from '$lib/services/secureCodeExecution';
  
  let { 
    previewHTML = '',
    jsonOutput = [],
    showJSON = false,
    onCopyJSON = () => {},
    onExport = () => {}
  } = $props();
  
  let activeTab = $state('preview');
</script>

<div class="preview-panel">
  <div class="preview-header">
    <div class="preview-tabs">
      <button 
        class="tab {activeTab === 'preview' ? 'active' : ''}"
        onclick={() => activeTab = 'preview'}
      >
        Preview
      </button>
      <button 
        class="tab {activeTab === 'json' ? 'active' : ''}"
        onclick={() => activeTab = 'json'}
      >
        JSON Output
      </button>
    </div>
    
    <div class="preview-actions">
      {#if activeTab === 'json'}
        <button class="btn btn-sm" onclick={onCopyJSON}>
          Copy JSON
        </button>
      {/if}
      <button class="btn btn-sm btn-primary" onclick={onExport}>
        Export
      </button>
    </div>
  </div>
  
  <div class="preview-content">
    {#if activeTab === 'preview'}
      <div class="preview-html">
        {@html previewHTML}
      </div>
    {:else if activeTab === 'json'}
      <div class="json-output">
        <pre>{JSON.stringify(jsonOutput, null, 2)}</pre>
      </div>
    {/if}
  </div>
</div>

<style>
  .preview-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface);
    border-radius: 8px;
    overflow: hidden;
  }
  
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-surface-elevated);
    border-bottom: 1px solid var(--color-border);
  }
  
  .preview-tabs {
    display: flex;
    gap: 0.25rem;
  }
  
  .tab {
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .tab:hover {
    color: var(--color-text-primary);
  }
  
  .tab.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }
  
  .preview-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .preview-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
  
  .preview-html {
    line-height: 1.6;
    color: var(--color-text-primary);
  }
  
  .json-output {
    background: var(--color-surface-soft);
    border-radius: 6px;
    padding: 1rem;
  }
  
  .json-output pre {
    margin: 0;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--color-text-primary);
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--color-surface-elevated);
    color: var(--color-text-primary);
  }
  
  .btn:hover {
    background: var(--color-surface-soft);
  }
  
  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.813rem;
  }
  
  .btn-primary {
    background: var(--color-primary);
    color: white;
  }
  
  .btn-primary:hover {
    background: var(--color-primary-dark);
  }
</style>