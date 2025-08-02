<script>
  let { 
    showSidebar = $bindable(false),
    tpnMode = $bindable(false),
    showOutput = $bindable(false),
    outputMode = $bindable('json'),
    showKeyReference = $bindable(false),
    currentReferenceName = '',
    currentIngredient = '',
    hasUnsavedChanges = false,
    lastSavedTime = null,
    onNewDocument = () => {},
    onExport = () => {},
    onOpenIngredientManager = () => {},
    onOpenMigrationTool = () => {},
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

<nav class="navbar">
  <div class="navbar-top">
    <div class="navbar-left">
      <button 
        class="sidebar-toggle"
        onclick={() => showSidebar = !showSidebar}
        title="{showSidebar ? 'Hide' : 'Show'} Sidebar"
      >
        {showSidebar ? '◀' : '▶'}
      </button>
      
      <h1 class="app-title">Dynamic Text Editor</h1>
      
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
      </div>
      
      <div class="navbar-actions">
        {#if firebaseEnabled}
          <button 
            class="action-btn ingredients-btn"
            onclick={onOpenIngredientManager}
            title="Open Ingredient Manager"
          >
            <span class="btn-icon">📦</span>
            <span class="btn-text">Ingredients</span>
          </button>
          
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
        >
          <span class="btn-icon">➕</span>
          <span class="btn-text">New</span>
        </button>
        
        <button 
          class="action-btn export-btn {copied ? 'copied' : ''}"
          onclick={onExport}
          title="Export to clipboard"
        >
          <span class="btn-icon">{copied ? '✓' : '📋'}</span>
          <span class="btn-text">{copied ? 'Copied!' : 'Export'}</span>
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
  
  .btn-icon {
    font-size: 1rem;
  }
  
  .btn-text {
    font-size: 0.9rem;
  }
  
  
  @media (max-width: 1024px) {
    .navbar-top {
      flex-wrap: wrap;
    }
    
    .app-title {
      display: none;
    }
    
    .btn-text {
      display: none;
    }
  }
</style>