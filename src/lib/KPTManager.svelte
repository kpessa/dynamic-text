<script lang="ts">
  import type { KPTFunction } from './kptPersistence';
  import { KPTPersistence } from './kptPersistence';
  import KPTFunctionEditor from './KPTFunctionEditor.svelte';
  
  let { 
    isVisible = false,
    onClose = () => {}
  } = $props();
  
  // Panel state
  let panelWidth = $state(400);
  let isMinimized = $state(false);
  let isResizing = $state(false);
  
  // State management
  let customFunctions = $state<KPTFunction[]>([]);
  let selectedCategory = $state('ALL');
  let searchQuery = $state('');
  let showEditor = $state(false);
  let editingFunction = $state<KPTFunction | null>(null);
  let showImportDialog = $state(false);
  let importText = $state('');
  let importResult = $state<{ success: boolean; imported: number; errors: string[] } | null>(null);
  let showOneLinerDialog = $state(false);
  let oneLinerText = $state('');
  let oneLinerFunctionName = $state('');
  const minPanelWidth = 280;
  const maxPanelWidth = 800;
  
  // Built-in function categories for reference
  const builtInCategories = [
    'TEXT_FORMATTING',
    'NUMBER_FORMATTING', 
    'TPN_FORMATTING',
    'CONDITIONAL',
    'VALIDATION',
    'HTML_BUILDERS',
    'UTILITIES',
    'MATH',
    'ALIASES'
  ];
  
  // Load functions on mount and when visibility changes
  $effect(() => {
    if (isVisible) {
      loadCustomFunctions();
      // Add padding to body to prevent content overlap
      document.body.style.paddingRight = `${panelWidth}px`;
      document.body.style.transition = 'padding-right var(--transition-normal)';
    } else {
      // Remove padding when panel is closed
      document.body.style.paddingRight = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.paddingRight = '';
    };
  });
  
  // Subscribe to function changes (both local and from other tabs)
  let unsubscribe: (() => void) | null = null;
  
  $effect(() => {
    if (isVisible && !unsubscribe) {
      // Subscribe to changes from KPTPersistence
      unsubscribe = KPTPersistence.subscribe((functions) => {
        // Only update if the functions actually changed to prevent loops
        if (JSON.stringify(functions) !== JSON.stringify(customFunctions)) {
          customFunctions = [...functions];
        }
      });
    }
    
    return () => {
      if (unsubscribe) {
        console.log('[KPT Manager] Cleaning up subscription...');
        unsubscribe();
        unsubscribe = null;
      }
    };
  });
  
  // Listen for localStorage changes from other tabs
  $effect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'kpt_custom_functions' && isVisible) {
        loadCustomFunctions();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  });
  
  function loadCustomFunctions() {
    const loaded = KPTPersistence.loadFunctions();
    // Only update if different to prevent subscription loops
    if (JSON.stringify(loaded) !== JSON.stringify(customFunctions)) {
      customFunctions = [...loaded];
    }
  }
  
  // Get all categories (built-in + custom)
  let categories = $derived.by(() => {
    const customCategories = [...new Set(customFunctions.map(f => f.category || 'CUSTOM').filter(Boolean))];
    const allCategories = ['ALL', 'CUSTOM', ...builtInCategories, ...customCategories.filter(cat => !builtInCategories.includes(cat) && cat !== 'CUSTOM')];
    return [...new Set(allCategories)]; // Remove duplicates
  });
  
  // Filter functions
  let filteredFunctions = $derived.by(() => {
    let functions = [...customFunctions];
    
    // Filter by category
    if (selectedCategory !== 'ALL') {
      functions = functions.filter(func => func.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      functions = functions.filter(func => 
        func.name.toLowerCase().includes(query) ||
        func.description.toLowerCase().includes(query) ||
        func.parameters.toLowerCase().includes(query)
      );
    }
    
    // Sort by name
    return functions.sort((a, b) => a.name.localeCompare(b.name));
  });
  
  function handleNewFunction() {
    editingFunction = null;
    showEditor = true;
  }
  
  function handleEditFunction(func: KPTFunction) {
    editingFunction = func;
    showEditor = true;
  }
  
  function handleDeleteFunction(functionName: string) {
    if (confirm(`Are you sure you want to delete the function "${functionName}"?`)) {
      if (KPTPersistence.deleteFunction(functionName)) {
        console.log('[KPT Manager] Function deleted:', functionName);
        // The delete function doesn't trigger notifications, so reload manually
        loadCustomFunctions();
      } else {
        alert('Function not found or could not be deleted.');
      }
    }
  }
  
  function handleSaveFunction(func: KPTFunction) {
    console.log('[KPT Manager] Function saved, updating list...', func.name);
    
    // The KPTPersistence.saveFunction will trigger our subscription
    // So we don't need to manually update the local state here
    
    showEditor = false;
    editingFunction = null;
    
    console.log('[KPT Manager] Function save handled, editor closed');
  }
  
  function handleCancelEdit() {
    showEditor = false;
    editingFunction = null;
  }
  
  function handleExportFunctions() {
    try {
      const exportData = KPTPersistence.exportFunctions();
      navigator.clipboard.writeText(exportData);
      alert('Functions exported to clipboard!');
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  }
  
  function handleImportFunctions() {
    try {
      importResult = KPTPersistence.importFunctions(importText);
      if (importResult.success) {
        console.log('[KPT Manager] Import successful:', importResult.imported, 'functions');
        importText = '';
        if (importResult.errors.length === 0) {
          setTimeout(() => {
            showImportDialog = false;
            importResult = null;
          }, 2000);
        }
        // Don't call loadCustomFunctions() - the saveFunction calls in import will trigger our subscription
      }
    } catch (error) {
      importResult = {
        success: false,
        imported: 0,
        errors: [`Import failed: ${error.message}`]
      };
    }
  }
  
  function handleGenerateOneLiner(functionName: string) {
    try {
      const oneLiner = KPTPersistence.generateOneLinerExport(functionName);
      oneLinerText = oneLiner;
      oneLinerFunctionName = functionName;
      showOneLinerDialog = true;
      // Also copy to clipboard automatically
      navigator.clipboard.writeText(oneLiner);
    } catch (error) {
      alert(`Failed to generate one-liner: ${error.message}`);
    }
  }
  
  function handleGenerateAllOneLiner() {
    try {
      const oneLiner = KPTPersistence.generateAllFunctionsOneLiner();
      oneLinerText = oneLiner;
      oneLinerFunctionName = 'All Functions';
      showOneLinerDialog = true;
      // Also copy to clipboard automatically
      navigator.clipboard.writeText(oneLiner);
    } catch (error) {
      alert(`Failed to generate all functions one-liner: ${error.message}`);
    }
  }
  
  function copyOneLinerToClipboard() {
    navigator.clipboard.writeText(oneLinerText);
    // Show brief confirmation
    const button = document.querySelector('.copy-oneliner-btn');
    if (button) {
      const originalText = button.textContent;
      button.textContent = '✅ Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    }
  }
  
  function getCategoryLabel(category: string) {
    if (category === 'ALL') return 'All Functions';
    return category.replace(/_/g, ' ').toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  }
  
  function formatDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  // Panel resize functionality
  function startResize(e: MouseEvent) {
    isResizing = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    function handleMouseMove(e: MouseEvent) {
      const deltaX = startX - e.clientX; // Negative because panel is on the right
      const newWidth = Math.min(maxPanelWidth, Math.max(minPanelWidth, startWidth + deltaX));
      panelWidth = newWidth;
      // Update body padding during resize
      if (isVisible) {
        document.body.style.paddingRight = `${newWidth}px`;
      }
    }

    function handleMouseUp() {
      isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
  }
</script>

{#if isVisible}
<div class="kpt-manager-panel" class:panel-open={isVisible}>
  <div class="panel-resize-handle" 
       onmousedown={startResize}
       role="separator" 
       aria-valuenow={panelWidth}
       aria-valuemin={280}
       aria-valuemax={800}
       aria-label="Resize function manager panel"
       tabindex="0">
  </div>
  <div class="kpt-manager" style="width: {panelWidth}px">
    <div class="manager-header">
      <h2>KPT Function Manager</h2>
      <div class="header-actions">
        <button class="minimize-btn" onclick={toggleMinimize} title="Minimize panel" aria-pressed={isMinimized}>
          {isMinimized ? '⬜' : '➖'}
        </button>
        <button class="close-btn" onclick={onClose} title="Close manager">
          ×
        </button>
      </div>
    </div>
    
    <div class="manager-toolbar" class:minimized={isMinimized}>
      <div class="search-controls">
        <input 
          type="text" 
          bind:value={searchQuery}
          placeholder="Search functions..."
          class="search-input"
        />
        
        <select bind:value={selectedCategory} class="category-select">
          {#each categories as category}
            <option value={category}>{getCategoryLabel(category)}</option>
          {/each}
        </select>
      </div>
      
      <div class="action-buttons">
        <button onclick={handleNewFunction} class="primary-btn">
          ➕ New Function
        </button>
        
        <button onclick={() => showImportDialog = true} class="secondary-btn">
          📥 Import
        </button>
        
        <button onclick={handleExportFunctions} class="secondary-btn" disabled={customFunctions.length === 0}>
          📤 Export
        </button>
        
        <button onclick={handleGenerateAllOneLiner} class="export-btn" disabled={customFunctions.length === 0} title="Generate one-liner for all custom functions">
          🔗 Export One-Liner
        </button>
      </div>
    </div>
    
    <div class="manager-content" class:minimized={isMinimized}>
      {#if customFunctions.length === 0}
        <div class="empty-state">
          <div class="empty-icon">🛠️</div>
          <h3>No Custom Functions</h3>
          <p>Create your first custom KPT function to get started!</p>
          <button onclick={handleNewFunction} class="primary-btn">
            ➕ Create Function
          </button>
        </div>
      {:else}
        <div class="functions-grid">
          {#each filteredFunctions as func (func.name)}
            <div class="function-card">
              <div class="function-header">
                <h4 class="function-name">{func.name}</h4>
                <div class="function-category">
                  {getCategoryLabel(func.category || 'CUSTOM')}
                </div>
              </div>
              
              {#if func.description}
                <p class="function-description">{func.description}</p>
              {/if}
              
              <div class="function-details">
                <div class="function-signature">
                  <strong>Signature:</strong>
                  <code>{func.name}({func.parameters || ''})</code>
                </div>
                
                <div class="function-dates">
                  <small>
                    Created: {formatDate(func.createdAt)}<br>
                    Modified: {formatDate(func.modifiedAt)}
                  </small>
                </div>
              </div>
              
              <div class="function-actions">
                <button onclick={() => handleEditFunction(func)} class="edit-btn" title="Edit function">
                  ✏️ Edit
                </button>
                
                <button onclick={() => handleGenerateOneLiner(func.name)} class="export-single-btn" title="Generate one-liner">
                  🔗 One-Liner
                </button>
                
                <button onclick={() => handleDeleteFunction(func.name)} class="delete-btn" title="Delete function">
                  🗑️ Delete
                </button>
              </div>
            </div>
          {/each}
        </div>
        
        {#if filteredFunctions.length === 0 && customFunctions.length > 0}
          <div class="no-results">
            <p>No functions match your search criteria.</p>
            <button onclick={() => { searchQuery = ''; selectedCategory = 'ALL'; }} class="secondary-btn">
              Clear Filters
            </button>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>
{/if}

<!-- Function Editor Modal -->
<KPTFunctionEditor 
  bind:functionData={editingFunction}
  isVisible={showEditor}
  onSave={handleSaveFunction}
  onCancel={handleCancelEdit}
/>

<!-- Import Dialog -->
{#if showImportDialog}
<div class="import-dialog-overlay">
  <div class="import-dialog">
    <div class="dialog-header">
      <h3>Import KPT Functions</h3>
      <button onclick={() => { showImportDialog = false; importResult = null; }} class="close-btn">
        ×
      </button>
    </div>
    
    <div class="dialog-content">
      <p>Paste the exported JSON data of KPT functions:</p>
      
      <textarea 
        bind:value={importText}
        placeholder="Paste JSON data here..."
        rows="10"
        class="import-textarea"
      ></textarea>
      
      {#if importResult}
        <div class="import-result {importResult.success ? 'success' : 'error'}">
          {#if importResult.success}
            <p>✅ Successfully imported {importResult.imported} function(s)!</p>
          {:else}
            <p>❌ Import failed</p>
          {/if}
          
          {#if importResult.errors.length > 0}
            <div class="error-list">
              <strong>Errors:</strong>
              <ul>
                {#each importResult.errors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}
    </div>
    
    <div class="dialog-actions">
      <button onclick={() => { showImportDialog = false; importResult = null; }} class="cancel-btn">
        Cancel
      </button>
      <button onclick={handleImportFunctions} class="primary-btn" disabled={!importText.trim()}>
        Import Functions
      </button>
    </div>
  </div>
</div>
{/if}

<!-- One-Liner Dialog -->
{#if showOneLinerDialog}
<div class="import-dialog-overlay">
  <div class="import-dialog">
    <div class="dialog-header">
      <h3>One-Liner Export: {oneLinerFunctionName}</h3>
      <button onclick={() => { showOneLinerDialog = false; }} class="close-btn">
        ×
      </button>
    </div>
    
    <div class="dialog-content">
      <p>The one-liner code has been copied to your clipboard. You can also copy it from below:</p>
      
      <div class="oneliner-container">
        <textarea 
          value={oneLinerText}
          readonly
          rows="6"
          class="oneliner-textarea"
          onclick={(e) => e.currentTarget.select()}
        ></textarea>
      </div>
      
      <div class="oneliner-info">
        <p><strong>Usage:</strong> Paste this code into a dynamic section in your TPN configuration to define the function(s).</p>
        <p><strong>Note:</strong> The code is wrapped with <code>[f( ... )]</code> delimiters for proper integration.</p>
      </div>
    </div>
    
    <div class="dialog-actions">
      <button onclick={() => { showOneLinerDialog = false; }} class="cancel-btn">
        Close
      </button>
      <button onclick={copyOneLinerToClipboard} class="primary-btn copy-oneliner-btn">
        📋 Copy to Clipboard
      </button>
    </div>
  </div>
</div>
{/if}

<style>
  .kpt-manager-panel {
    position: fixed;
    top: 0;
    right: -400px; /* Hidden initially */
    bottom: 0;
    z-index: var(--z-modal);
    transition: right var(--transition-normal);
    will-change: right;
  }

  .kpt-manager-panel.panel-open {
    right: 0;
  }

  .panel-resize-handle {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 4px;
    background: var(--color-border);
    cursor: col-resize;
    transition: background-color var(--transition-fast);
    z-index: 1;
  }

  .panel-resize-handle:hover,
  .panel-resize-handle:focus {
    background: var(--color-primary);
    outline: none;
  }

  .panel-resize-handle:focus {
    box-shadow: -2px 0 0 2px var(--color-focus);
  }
  
  .kpt-manager {
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    box-shadow: var(--shadow-xl);
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  
  .manager-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-elevated);
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
    min-height: 64px;
  }
  
  .manager-header h2 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  
  .manager-header h2::before {
    content: '🛠️';
    font-size: var(--font-size-lg);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .minimize-btn,
  .close-btn {
    background: none;
    border: 1px solid transparent;
    font-size: var(--font-size-lg);
    cursor: pointer;
    color: var(--color-text-muted);
    padding: var(--space-2);
    border-radius: var(--radius-md);
    min-width: var(--min-touch-target);
    min-height: var(--min-touch-target);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }
  
  .minimize-btn:hover,
  .minimize-btn:focus,
  .close-btn:hover,
  .close-btn:focus {
    background: var(--color-state-hover);
    border-color: var(--color-border-light);
    color: var(--color-text-primary);
    outline: none;
    transform: scale(1.05);
  }

  .minimize-btn:focus,
  .close-btn:focus {
    outline: var(--focus-ring);
    outline-offset: var(--focus-ring-offset);
  }
  
  .close-btn:hover {
    background: var(--color-danger-100);
    color: var(--color-danger-600);
    border-color: var(--color-danger-200);
  }
  
  .manager-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border-light);
    background: var(--color-surface);
    flex-wrap: wrap;
  }
  
  .search-controls {
    display: flex;
    gap: var(--space-3);
    flex: 1;
    min-width: 300px;
    align-items: center;
  }
  
  .search-input {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--color-surface);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-xs);
    transition: all var(--transition-fast);
  }
  
  .search-input:hover {
    border-color: var(--color-border-medium);
    box-shadow: var(--shadow-sm);
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 
      0 0 0 3px var(--color-focus-ring),
      var(--shadow-sm);
  }
  
  .search-input::placeholder {
    color: var(--color-text-muted);
  }
  
  .category-select {
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--color-surface);
    color: var(--color-text-primary);
    min-width: 150px;
    box-shadow: var(--shadow-xs);
    transition: all var(--transition-fast);
    cursor: pointer;
  }
  
  .category-select:hover {
    border-color: var(--color-border-medium);
    box-shadow: var(--shadow-sm);
  }
  
  .category-select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 
      0 0 0 3px var(--color-focus-ring),
      var(--shadow-sm);
  }
  
  .action-buttons {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    align-items: center;
  }
  
  .primary-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast);
    min-height: var(--min-touch-target);
  }
  
  .primary-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  .primary-btn:focus {
    outline: var(--focus-ring);
    outline-offset: var(--focus-ring-offset);
  }
  
  .secondary-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    box-shadow: var(--shadow-xs);
    transition: all var(--transition-fast);
    min-height: var(--min-touch-target);
  }
  
  .secondary-btn:hover:not(:disabled) {
    background: var(--color-state-hover);
    border-color: var(--color-border-medium);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
  
  .secondary-btn:focus {
    outline: var(--focus-ring);
    outline-offset: var(--focus-ring-offset);
  }
  
  .export-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-success-500);
    color: var(--color-text-inverse);
    border: 1px solid var(--color-success-500);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast);
    min-height: var(--min-touch-target);
  }
  
  .export-btn:hover:not(:disabled) {
    background: var(--color-success-600);
    border-color: var(--color-success-600);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  .export-btn:focus {
    outline: var(--focus-ring);
    outline-offset: var(--focus-ring-offset);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .export-btn:hover:not(:disabled) {
    background: #218838;
  }
  
  .primary-btn:disabled,
  .secondary-btn:disabled,
  .export-btn:disabled {
    background: #dee2e6;
    color: #6c757d;
    cursor: not-allowed;
  }
  
  .manager-toolbar {
    flex-shrink: 0;
    transition: opacity var(--transition-normal), max-height var(--transition-normal);
  }

  .manager-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
    transition: opacity var(--transition-normal), max-height var(--transition-normal);
  }

  .manager-content.minimized,
  .manager-toolbar.minimized {
    opacity: 0;
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    overflow: hidden;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 20px;
    color: #6c757d;
  }
  
  .empty-icon {
    font-size: 4rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .empty-state h3 {
    margin: 0 0 8px 0;
    color: #495057;
  }
  
  .empty-state p {
    margin: 0 0 24px 0;
    max-width: 300px;
  }
  
  .functions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }
  
  .function-card {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: box-shadow 0.2s;
  }
  
  .function-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .function-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  
  .function-name {
    margin: 0;
    color: #007bff;
    font-size: 1.1rem;
    font-weight: 600;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }
  
  .function-category {
    background: #007bff;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    white-space: nowrap;
  }
  
  .function-description {
    margin: 0;
    color: #495057;
    font-size: 14px;
    line-height: 1.4;
  }
  
  .function-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .function-signature {
    font-size: 13px;
    color: #495057;
  }
  
  .function-signature code {
    background: #e9ecef;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
    color: #d63384;
  }
  
  .function-dates {
    color: #6c757d;
    font-size: 11px;
  }
  
  .function-actions {
    display: flex;
    gap: 6px;
    margin-top: 4px;
  }
  
  .edit-btn {
    padding: 6px 10px;
    background: #ffc107;
    color: #212529;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }
  
  .edit-btn:hover {
    background: #e0a800;
  }
  
  .export-single-btn {
    padding: 6px 10px;
    background: #17a2b8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }
  
  .export-single-btn:hover {
    background: #138496;
  }
  
  .delete-btn {
    padding: 6px 10px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }
  
  .delete-btn:hover {
    background: #c82333;
  }
  
  .no-results {
    text-align: center;
    padding: 40px 20px;
    color: #6c757d;
  }
  
  /* Import Dialog Styles */
  .import-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }
  
  .import-dialog {
    background: white;
    border-radius: 8px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e9ecef;
    background: #f8f9fa;
  }
  
  .dialog-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .dialog-content {
    padding: 20px;
    flex: 1;
    overflow-y: auto;
  }
  
  .import-textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    resize: vertical;
    margin-bottom: 16px;
  }
  
  .import-textarea:focus {
    outline: none;
    border-color: #646cff;
    box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.1);
  }
  
  .import-result {
    padding: 12px;
    border-radius: 6px;
    border-left: 4px solid;
    margin-top: 12px;
  }
  
  .import-result.success {
    background: #d4edda;
    border-color: #28a745;
    color: #155724;
  }
  
  .import-result.error {
    background: #f8d7da;
    border-color: #dc3545;
    color: #721c24;
  }
  
  .error-list {
    margin-top: 8px;
  }
  
  .error-list ul {
    margin: 4px 0;
    padding-left: 20px;
  }
  
  .error-list li {
    margin: 2px 0;
    font-size: 13px;
  }
  
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid #e9ecef;
    background: #f8f9fa;
  }
  
  .cancel-btn {
    padding: 8px 16px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .cancel-btn:hover {
    background: #5a6268;
  }
  
  /* One-Liner Dialog Styles */
  .oneliner-container {
    margin: 16px 0;
  }
  
  .oneliner-textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    background: #f8f9fa;
    color: #212529;
    resize: vertical;
    cursor: text;
    word-break: break-all;
    white-space: pre-wrap;
  }
  
  .oneliner-textarea:focus {
    outline: none;
    border-color: #646cff;
    box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.1);
    background: #ffffff;
  }
  
  .oneliner-info {
    background: #e7f4ff;
    border-left: 4px solid #007bff;
    padding: 12px;
    border-radius: 4px;
    margin-top: 16px;
  }
  
  .oneliner-info p {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #004085;
  }
  
  .oneliner-info p:last-child {
    margin-bottom: 0;
  }
  
  .oneliner-info code {
    background: #ffffff;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 12px;
    color: #d63384;
  }
  
  .copy-oneliner-btn {
    min-width: 140px;
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .kpt-manager-panel {
      right: -100vw;
    }

    .kpt-manager-panel.panel-open {
      right: 0;
      left: 0;
    }

    .kpt-manager {
      width: 100vw !important;
      box-shadow: none;
      border-left: none;
    }

    .panel-resize-handle {
      display: none;
    }
    
    .manager-toolbar {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
    }
    
    .search-controls {
      min-width: auto;
    }
    
    .action-buttons {
      justify-content: center;
    }
    
    .functions-grid {
      grid-template-columns: 1fr;
    }
    
    .function-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .function-actions {
      flex-wrap: wrap;
    }
    
    .import-dialog {
      width: 95%;
      max-height: 90vh;
    }
  }
</style>