<script>
  let { 
    showSidebar = $bindable(false),
    tpnMode = $bindable(false),
    showOutput = $bindable(false),
    outputMode = $bindable('json'),
    showKeyReference = $bindable(false),
    showKPTReference = $bindable(false),
    currentReferenceName = '',
    currentIngredient = '',
    hasUnsavedChanges = false,
    lastSavedTime = null,
    onNewDocument = () => {},
    onExport = () => {},
    onOpenIngredientManager = () => {},
    onOpenMigrationTool = () => {},
    onOpenPreferences = () => {},
    onOpenDiffViewer = () => {},
    onSave = () => {},
    copied = false,
    firebaseEnabled = false
  } = $props();
  
  const modes = [
    { id: 'editor', label: 'Editor', icon: '✏️' },
    { id: 'tpn', label: 'TPN Mode', icon: '🧪' }
  ];
  
  const views = [
    { id: 'sections', label: 'Sections', icon: '📄' },
    { id: 'preview', label: 'Preview', icon: '👁️' },
    { id: 'output', label: 'Output', icon: '📊' },
    { id: 'references', label: 'References', icon: '📚' }
  ];
</script>

<nav class="navbar" role="banner" aria-label="Main navigation">
  <div class="navbar-top">
    <div class="navbar-left">
      <button 
        class="sidebar-toggle"
        onclick={() => showSidebar = !showSidebar}
        title="{showSidebar ? 'Hide' : 'Show'} Sidebar"
        aria-label="{showSidebar ? 'Hide' : 'Show'} sidebar navigation"
        aria-expanded={showSidebar}
        aria-controls="sidebar-panel"
      >
        <span aria-hidden="true">{showSidebar ? '◀' : '▶'}</span>
        <span class="sr-only">{showSidebar ? 'Hide' : 'Show'} sidebar</span>
      </button>
      
      <h1 class="app-title" id="app-title">TPN Dynamic Text Editor</h1>
      
      {#if currentReferenceName}
        <div class="document-info">
          <span class="doc-name">{currentReferenceName}</span>
          <span class="save-status {hasUnsavedChanges ? 'unsaved' : 'saved'}">
            {hasUnsavedChanges ? '●' : '✓'}
          </span>
        </div>
      {/if}
    </div>
    
    {#if currentReferenceName}
      <div class="navbar-center">
        <div class="mode-selector">
          <label class="mode-toggle">
            <input 
              type="checkbox" 
              bind:checked={tpnMode}
              onchange={() => {
                if (tpnMode && !showKeyReference) {
                  showKeyReference = true;
                }
              }}
            />
            <span class="toggle-slider"></span>
            <span class="mode-label">{tpnMode ? 'TPN Mode' : 'Normal Mode'}</span>
          </label>
        </div>
        
        {#if tpnMode && currentIngredient}
          <div class="current-ingredient">
            <span class="ingredient-icon">🧪</span>
            <span class="ingredient-name">{currentIngredient}</span>
          </div>
        {/if}
      </div>
    {/if}
    
    <div class="navbar-right">
      <div class="view-toggles">
        {#if tpnMode}
          <button 
            class="view-toggle {showKeyReference ? 'active' : ''}"
            onclick={() => showKeyReference = !showKeyReference}
            title="Toggle key reference"
          >
            🔑 Keys
          </button>
        {/if}
        
        <button 
          class="view-toggle {showKPTReference ? 'active' : ''}"
          onclick={() => showKPTReference = !showKPTReference}
          title="Toggle KPT function reference"
        >
          🛠️ KPT
        </button>
      </div>
      
      <div class="navbar-actions">
        {#if firebaseEnabled}
          <button 
            class="action-btn ingredients-btn"
            onclick={onOpenIngredientManager}
            title="Open Ingredient Manager"
            aria-label="Open ingredient manager"
            data-action="ingredients"
          >
            <span class="btn-icon" aria-hidden="true">📦</span>
            <span class="btn-text">Ingredients</span>
          </button>
          
          {#if currentIngredient}
            <button 
              class="action-btn diff-btn"
              onclick={onOpenDiffViewer}
              title="Compare versions of {currentIngredient}"
            >
              <span class="btn-icon">🔍</span>
              <span class="btn-text">Compare</span>
            </button>
          {/if}
          
          <button 
            class="action-btn migration-btn"
            onclick={onOpenMigrationTool}
            title="Migrate localStorage to Firebase"
          >
            <span class="btn-icon">🚀</span>
            <span class="btn-text">Migrate</span>
          </button>
        {/if}
        
        <button 
          class="action-btn new-btn"
          onclick={onNewDocument}
          title="Start new document"
          aria-label="Create new document"
          data-action="new"
        >
          <span class="btn-icon" aria-hidden="true">➕</span>
          <span class="btn-text">New</span>
        </button>
        
        {#if hasUnsavedChanges && firebaseEnabled}
          <button 
            class="action-btn save-btn"
            onclick={onSave}
            title="Save changes (Ctrl+S)"
            aria-label="Save changes (Ctrl+S)"
            data-action="save"
          >
            <span class="btn-icon" aria-hidden="true">💾</span>
            <span class="btn-text">Save</span>
          </button>
        {/if}
        
        <button 
          class="action-btn export-btn {copied ? 'copied' : ''}"
          onclick={onExport}
          title="Export to clipboard"
          aria-label="{copied ? 'Successfully copied to clipboard' : 'Export content to clipboard'}"
          data-action="export"
        >
          <span class="btn-icon" aria-hidden="true">{copied ? '✓' : '📋'}</span>
          <span class="btn-text">{copied ? 'Copied!' : 'Export'}</span>
        </button>
        
        <button 
          class="action-btn preferences-btn"
          onclick={onOpenPreferences}
          title="Preferences"
          aria-label="Open preferences"
          data-action="preferences"
        >
          <span class="btn-icon" aria-hidden="true">⚙️</span>
          <span class="btn-text">Preferences</span>
        </button>
        
        <button 
          class="action-btn shortcuts-btn"
          onclick={() => document.dispatchEvent(new CustomEvent('show-shortcuts'))}
          title="Keyboard Shortcuts (Press ? key)"
          aria-label="Show keyboard shortcuts"
          data-action="shortcuts"
        >
          <span class="btn-icon" aria-hidden="true">⌨️</span>
          <span class="btn-text">Shortcuts</span>
        </button>
      </div>
    </div>
  </div>
</nav>

<style>
  .navbar {
    background-color: #f8f9fa;
    color: #333;
    border-bottom: 1px solid #dee2e6;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .navbar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    gap: 1rem;
  }
  
  .navbar-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }
  
  .sidebar-toggle {
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    background-color: #fff;
    color: #333;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .sidebar-toggle:hover {
    background-color: #f8f9fa;
    border-color: #adb5bd;
  }
  
  .app-title {
    font-size: 1.25rem;
    margin: 0;
    color: #646cff;
    font-weight: 600;
  }
  
  .document-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background-color: #e9ecef;
    border-radius: 6px;
  }
  
  .doc-name {
    font-size: 0.9rem;
    color: #495057;
  }
  
  .save-status {
    font-size: 0.8rem;
  }
  
  .save-status.saved {
    color: #28a745;
  }
  
  .save-status.unsaved {
    color: #dc3545;
  }
  
  .navbar-center {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .mode-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .mode-toggle {
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  
  .mode-toggle input {
    position: absolute;
    opacity: 0;
  }
  
  .toggle-slider {
    width: 48px;
    height: 24px;
    background-color: #dee2e6;
    border-radius: 12px;
    position: relative;
    transition: background-color 0.3s;
    margin-right: 0.5rem;
  }
  
  .toggle-slider::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.3s;
  }
  
  .mode-toggle input:checked + .toggle-slider {
    background-color: #646cff;
  }
  
  .mode-toggle input:checked + .toggle-slider::after {
    transform: translateX(24px);
  }
  
  .mode-label {
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .current-ingredient {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background-color: #e9ecef;
    border-radius: 6px;
  }
  
  .ingredient-icon {
    font-size: 1rem;
  }
  
  .ingredient-name {
    font-size: 0.9rem;
    color: #0066cc;
    font-weight: 500;
  }
  
  .navbar-right {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    justify-content: flex-end;
  }
  
  .view-toggles {
    display: flex;
    gap: 0.5rem;
  }
  
  .view-toggle {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    background-color: #fff;
    color: #495057;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .view-toggle:hover {
    background-color: #f8f9fa;
    color: #333;
    border-color: #adb5bd;
  }
  
  .view-toggle.active {
    background-color: #646cff;
    color: white;
    border-color: #646cff;
  }
  
  .navbar-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }
  
  .new-btn {
    background-color: #28a745;
    color: white;
  }
  
  .new-btn:hover {
    background-color: #218838;
  }
  
  .save-btn {
    background-color: #007bff;
    color: white;
  }
  
  .save-btn:hover {
    background-color: #0056b3;
  }
  
  .export-btn {
    background-color: #646cff;
    color: white;
  }
  
  .export-btn:hover {
    background-color: #535bf2;
  }
  
  .export-btn.copied {
    background-color: #28a745;
  }
  
  .ingredients-btn {
    background-color: #ff6b6b;
    color: white;
  }
  
  .ingredients-btn:hover {
    background-color: #ee5a24;
  }
  
  .migration-btn {
    background-color: #17a2b8;
    color: white;
  }
  
  .migration-btn:hover {
    background-color: #138496;
  }
  
  .diff-btn {
    background-color: #6f42c1;
    color: white;
  }
  
  .diff-btn:hover {
    background-color: #5a32a3;
  }
  
  .btn-icon {
    font-size: 1rem;
  }
  
  .btn-text {
    font-size: 0.9rem;
  }
  
  .shortcuts-btn {
    background-color: #495057;
    color: white;
  }
  
  .shortcuts-btn:hover {
    background-color: #343a40;
  }
  
  /* Mobile-first responsive design */
  @media (max-width: 767px) {
    .navbar {
      background-color: rgba(248, 249, 250, 0.95);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      padding-top: max(0.75rem, env(safe-area-inset-top));
    }
    
    .navbar-top {
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
    }
    
    .navbar-left {
      flex: 0 1 auto;
      gap: 0.5rem;
    }
    
    .app-title {
      display: none;
    }
    
    .document-info {
      font-size: 0.8rem;
      padding: 0.125rem 0.5rem;
    }
    
    .navbar-center {
      order: 3;
      flex-basis: 100%;
      justify-content: center;
      margin-top: 0.5rem;
    }
    
    .mode-toggle {
      transform: scale(0.9);
    }
    
    .current-ingredient {
      font-size: 0.8rem;
      padding: 0.125rem 0.5rem;
    }
    
    .navbar-right {
      flex: 1;
      justify-content: flex-end;
    }
    
    .navbar-actions {
      gap: 0.25rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    
    .action-btn {
      padding: 0.5rem;
      min-width: var(--touch-target-medium);
      min-height: var(--touch-target-medium);
      border-radius: 8px;
    }
    
    .btn-text {
      display: none;
    }
    
    .btn-icon {
      font-size: 1.1rem;
    }
    
    .view-toggle {
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
    }
    
    .sidebar-toggle {
      padding: 0.5rem;
      font-size: 1.1rem;
      min-width: var(--touch-target-medium);
      min-height: var(--touch-target-medium);
    }
  }
  
  /* Tablet optimization */
  @media (min-width: 768px) and (max-width: 1024px) {
    .navbar-top {
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    
    .app-title {
      font-size: 1.1rem;
    }
    
    .action-btn {
      padding: 0.5rem 0.75rem;
    }
    
    .btn-text {
      font-size: 0.8rem;
    }
  }
  
  /* Desktop */
  @media (min-width: 1025px) {
    .navbar-top {
      flex-wrap: nowrap;
    }
  }
  
  /* Landscape phone adjustments */
  @media (max-width: 767px) and (orientation: landscape) {
    .navbar {
      padding-top: max(0.5rem, env(safe-area-inset-top));
    }
    
    .navbar-top {
      padding: 0.25rem 1rem;
    }
    
    .navbar-center {
      margin-top: 0.25rem;
    }
  }
  
  /* Touch-friendly hover states */
  @media (hover: none) and (pointer: coarse) {
    .action-btn:hover,
    .sidebar-toggle:hover,
    .view-toggle:hover {
      transform: scale(1.05);
      transition: transform 0.1s ease;
    }
    
    .action-btn:active,
    .sidebar-toggle:active,
    .view-toggle:active {
      transform: scale(0.95);
      transition: transform 0.05s ease;
    }
  }
</style>