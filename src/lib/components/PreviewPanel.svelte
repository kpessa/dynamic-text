<script>
  import { sectionStore } from '../../stores/sectionStore.svelte.ts';
  import { uiStore } from '../../stores/uiStore.svelte.ts';
  import { sectionService } from '../services/sectionService.js';
  import OutputPanel from './OutputPanel.svelte';
  
  // Reactive state
  const sections = $derived(sectionStore.sections);
  const activeTestCase = $derived(sectionStore.activeTestCase);
  const previewCollapsed = $derived(uiStore.previewCollapsed);
  const showOutput = $derived(uiStore.showOutput);
  const previewMode = $derived(uiStore.previewMode);
  
  // Generate preview HTML
  const previewHTML = $derived.by(() => {
    return sectionService.generatePreviewHTML(sections, activeTestCase);
  });
  
  function togglePreviewCollapse() {
    uiStore.togglePreviewCollapsed();
  }
</script>

<div class="preview-panel {previewCollapsed ? 'collapsed' : ''}">
  <div class="panel-header">
    <div class="header-left">
      <button 
        class="collapse-btn"
        onclick={togglePreviewCollapse}
        title={previewCollapsed ? 'Expand preview' : 'Collapse preview'}
      >
        {previewCollapsed ? '◀' : '▶'}
      </button>
      {#if !previewCollapsed}
        <h2>Preview</h2>
        <div class="mode-toggle">
          <button 
            class="mode-btn {previewMode === 'preview' ? 'active' : ''}"
            onclick={() => uiStore.setPreviewMode('preview')}
          >
            Preview
          </button>
          <button 
            class="mode-btn {previewMode === 'output' ? 'active' : ''}"
            onclick={() => uiStore.setPreviewMode('output')}
          >
            Output
          </button>
        </div>
      {/if}
    </div>
  </div>
  
  {#if !previewCollapsed}
    <div class="preview-content">
      {#if previewMode === 'preview'}
        <div class="html-preview">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html previewHTML}
        </div>
      {:else}
        <OutputPanel />
      {/if}
    </div>
  {/if}
</div>

<style>
  .preview-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border-left: 1px solid #e0e0e0;
    transition: all 0.3s ease;
    min-width: 300px;
  }
  
  .preview-panel.collapsed {
    min-width: 40px;
    max-width: 40px;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
    min-height: 60px;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }
  
  .collapse-btn {
    padding: 0.5rem;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
    min-width: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .collapse-btn:hover {
    background: #f8f9fa;
    border-color: #007bff;
  }
  
  .preview-panel.collapsed .panel-header {
    padding: 1rem 0.5rem;
    justify-content: center;
  }
  
  .preview-panel.collapsed h2,
  .preview-panel.collapsed .mode-toggle {
    display: none;
  }
  
  h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #495057;
  }
  
  .mode-toggle {
    display: flex;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    overflow: hidden;
    margin-left: auto;
  }
  
  .mode-btn {
    padding: 0.5rem 1rem;
    background: white;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
    color: #6c757d;
  }
  
  .mode-btn:first-child {
    border-right: 1px solid #dee2e6;
  }
  
  .mode-btn:hover {
    background: #f8f9fa;
  }
  
  .mode-btn.active {
    background: #007bff;
    color: white;
  }
  
  .preview-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .html-preview {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    background: white;
    
    /* Force light theme for preview */
    color: #000 !important;
    
    /* Style the preview content */
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
  }
  
  /* Style content within preview */
  .html-preview :global(h1),
  .html-preview :global(h2),
  .html-preview :global(h3),
  .html-preview :global(h4),
  .html-preview :global(h5),
  .html-preview :global(h6) {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
    color: #1a1a1a !important;
  }
  
  .html-preview :global(p) {
    margin-bottom: 1rem;
    color: #333 !important;
  }
  
  .html-preview :global(ul),
  .html-preview :global(ol) {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }
  
  .html-preview :global(li) {
    margin-bottom: 0.25rem;
    color: #333 !important;
  }
  
  .html-preview :global(strong) {
    font-weight: 600;
    color: #1a1a1a !important;
  }
  
  .html-preview :global(em) {
    font-style: italic;
  }
  
  .html-preview :global(code) {
    background: #f8f9fa;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
    font-size: 0.9em;
    color: #e83e8c !important;
  }
  
  .html-preview :global(pre) {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin-bottom: 1rem;
  }
  
  .html-preview :global(.dynamic-output) {
    background: #f8f9ff;
    border: 1px solid #e7e3ff;
    border-radius: 4px;
    padding: 0.75rem;
    margin: 0.5rem 0;
    font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
    color: #495057 !important;
  }
  
  .html-preview :global(.error) {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24 !important;
    border-radius: 4px;
    padding: 0.75rem;
    margin: 0.5rem 0;
    font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
  }
  
  .html-preview :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }
  
  .html-preview :global(th),
  .html-preview :global(td) {
    border: 1px solid #dee2e6;
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  
  .html-preview :global(th) {
    background: #f8f9fa;
    font-weight: 600;
    color: #495057 !important;
  }
  
  .html-preview :global(td) {
    color: #333 !important;
  }
</style>