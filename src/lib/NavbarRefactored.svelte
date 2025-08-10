<script>
  import ThemeManager from './ThemeManager.svelte';
  import NavbarActions from './NavbarActions.svelte';
  import ModeToggle from './ModeToggle.svelte';
  import Icons from './Icons.svelte';
  
  // Organized props
  let {
    // UI State
    uiState = $bindable({
      showSidebar: false,
      tpnMode: false,
      showOutput: false,
      outputMode: 'json',
      showKeyReference: false,
      showKPTReference: false
    }),
    // Document State
    documentState = {
      currentReferenceName: '',
      currentIngredient: '',
      hasUnsavedChanges: false,
      lastSavedTime: null,
      copied: false
    },
    // Actions
    actions = {
      onNewDocument: () => {},
      onSave: () => {},
      onExport: () => {},
      onOpenKPTManager: () => {},
      onOpenIngredientManager: () => {},
      onOpenMigrationTool: () => {},
      onOpenPreferences: () => {},
      onOpenDiffViewer: () => {}
    },
    // Config
    config = {
      firebaseEnabled: false
    }
  } = $props();
  
  // Local state
  let showMoreMenu = $state(false);
  
  // Toggle functions
  function toggleSidebar() {
    uiState.showSidebar = !uiState.showSidebar;
  }
  
  function toggleOutput() {
    uiState.showOutput = !uiState.showOutput;
  }
  
  function toggleKeyReference() {
    uiState.showKeyReference = !uiState.showKeyReference;
  }
  
  function toggleKPTReference() {
    uiState.showKPTReference = !uiState.showKPTReference;
  }
  
  function toggleMoreMenu() {
    showMoreMenu = !showMoreMenu;
  }
  
  // Close menu when clicking outside
  $effect(() => {
    if (showMoreMenu) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.more-menu-container')) {
          showMoreMenu = false;
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<nav class="navbar">
  <div class="navbar-container">
    <!-- Left section -->
    <div class="navbar-section navbar-left">
      <button 
        class="sidebar-toggle"
        onclick={toggleSidebar}
        title="Toggle sidebar"
        aria-label="Toggle sidebar"
        aria-pressed={uiState.showSidebar}
      >
        <Icons icon="menu" size={20} />
      </button>
      
      <!-- Primary Actions -->
      <NavbarActions
        hasUnsavedChanges={documentState.hasUnsavedChanges}
        lastSavedTime={documentState.lastSavedTime}
        copied={documentState.copied}
        onNewDocument={actions.onNewDocument}
        onSave={actions.onSave}
        onExport={actions.onExport}
      />
    </div>
    
    <!-- Center section -->
    <div class="navbar-section navbar-center">
      <!-- Document info -->
      {#if documentState.currentReferenceName || documentState.currentIngredient}
        <div class="document-info">
          {#if documentState.currentIngredient}
            <span class="info-label">Ingredient:</span>
            <span class="info-value">{documentState.currentIngredient}</span>
          {/if}
          {#if documentState.currentReferenceName}
            <span class="info-label">Reference:</span>
            <span class="info-value">{documentState.currentReferenceName}</span>
          {/if}
        </div>
      {/if}
    </div>
    
    <!-- Right section -->
    <div class="navbar-section navbar-right">
      <!-- Mode Toggle -->
      <ModeToggle bind:tpnMode={uiState.tpnMode} />
      
      <!-- View Toggles -->
      <div class="view-toggles">
        <button 
          class="view-toggle {uiState.showOutput ? 'active' : ''}"
          onclick={toggleOutput}
          title="Toggle output panel"
          aria-label="Toggle output panel"
          aria-pressed={uiState.showOutput}
        >
          <Icons icon="chart" size={20} />
        </button>
        
        <button 
          class="view-toggle {uiState.showKeyReference ? 'active' : ''}"
          onclick={toggleKeyReference}
          title="Toggle key reference"
          aria-label="Toggle key reference"
          aria-pressed={uiState.showKeyReference}
        >
          <Icons icon="key" size={20} />
        </button>
        
        <button 
          class="view-toggle {uiState.showKPTReference ? 'active' : ''}"
          onclick={toggleKPTReference}
          title="Toggle KPT reference"
          aria-label="Toggle KPT reference"
          aria-pressed={uiState.showKPTReference}
        >
          <Icons icon="book" size={20} />
        </button>
        
        <ThemeManager />
      </div>
      
      <!-- Secondary Actions -->
      <div class="secondary-actions">
        {#if config.firebaseEnabled}
          <button 
            class="action-btn"
            onclick={actions.onOpenIngredientManager}
            title="Open ingredient manager"
            aria-label="Open ingredient manager"
          >
            <Icons icon="ingredients" size={16} />
            <span>Ingredients</span>
          </button>
        {/if}
        
        <button 
          class="action-btn"
          onclick={actions.onOpenKPTManager}
          title="Open KPT function manager"
          aria-label="Open KPT function manager"
        >
          <Icons icon="functions" size={16} />
          <span>Functions</span>
        </button>
        
        <!-- More Menu -->
        <div class="more-menu-container">
          <button 
            class="action-btn more-btn"
            onclick={toggleMoreMenu}
            title="More options"
            aria-label="More options"
            aria-expanded={showMoreMenu}
            aria-haspopup="true"
          >
            <Icons icon="more" size={20} />
          </button>
          
          {#if showMoreMenu}
            <div class="dropdown-menu" role="menu">
              <button 
                class="menu-item"
                onclick={() => { actions.onOpenDiffViewer(); showMoreMenu = false; }}
                role="menuitem"
              >
                <Icons icon="compare" size={16} />
                <span>Compare References</span>
              </button>
              
              {#if config.firebaseEnabled}
                <button 
                  class="menu-item"
                  onclick={() => { actions.onOpenMigrationTool(); showMoreMenu = false; }}
                  role="menuitem"
                >
                  <Icons icon="migration" size={16} />
                  <span>Migration Tool</span>
                </button>
              {/if}
              
              <button 
                class="menu-item"
                onclick={() => { actions.onOpenPreferences(); showMoreMenu = false; }}
                role="menuitem"
              >
                <Icons icon="settings" size={16} />
                <span>Preferences</span>
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</nav>

<style lang="scss">
  @use '../styles/abstracts/variables' as *;
  
  .navbar {
    background: var(--color-background);
    border-bottom: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
    position: sticky;
    top: 0;
    z-index: map-get($z-indices, fixed); /* Above sidebar, below modals */
  }
  
  .navbar-container {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    gap: 1rem;
    max-width: 100%;
  }
  
  .navbar-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .navbar-left {
    flex: 0 0 auto;
  }
  
  .navbar-center {
    flex: 1 1 auto;
    justify-content: center;
    min-width: 0; /* Allow text truncation */
  }
  
  .navbar-right {
    flex: 0 0 auto;
    justify-content: flex-end;
  }
  
  /* Sidebar Toggle */
  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .sidebar-toggle:hover {
    background: var(--color-surface-hover);
    transform: translateY(-1px);
  }
  
  
  /* Document Info */
  .document-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    overflow: hidden;
  }
  
  .info-label {
    font-weight: var(--font-weight-medium);
  }
  
  .info-value {
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }
  
  /* View Toggles */
  .view-toggles {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
  
  .view-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 1.25rem;
  }
  
  .view-toggle:hover {
    background: var(--color-surface-hover);
    transform: translateY(-1px);
  }
  
  .view-toggle.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }
  
  /* Secondary Actions */
  .secondary-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    white-space: nowrap;
    min-height: 40px;
  }
  
  .action-btn:hover {
    background: var(--color-surface-hover);
    transform: translateY(-1px);
  }
  
  /* More Menu */
  .more-menu-container {
    position: relative;
  }
  
  .more-btn {
    padding: 0.5rem;
    min-width: 40px;
  }
  
  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    min-width: 200px;
    z-index: map-get($z-indices, popover); /* Above navbar */
  }
  
  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background var(--transition-fast);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    text-align: left;
  }
  
  .menu-item:hover {
    background: var(--color-surface-hover);
  }
  
  .menu-item:first-child {
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }
  
  .menu-item:last-child {
    border-radius: 0 0 var(--radius-md) var(--radius-md);
  }
  
  /* Mobile Responsive */
  @media (max-width: 768px) {
    .navbar-container {
      padding: 0.5rem;
      gap: 0.5rem;
    }
    
    .sidebar-toggle,
    .view-toggle,
    .action-btn {
      min-height: 44px; /* iOS standard */
      min-width: 44px;
    }
    
    .document-info {
      display: none; /* Hide on mobile to save space */
    }
    
    .secondary-actions {
      display: none; /* Move to hamburger menu on mobile */
    }
    
    .navbar-center {
      display: none;
    }
    
    .navbar-left,
    .navbar-right {
      flex: 1;
    }
    
    .navbar-right {
      justify-content: flex-end;
    }
  }
  
  /* Focus styles */
  button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .navbar {
      border-bottom-width: 2px;
    }
    
    button {
      border-width: 2px;
    }
  }
</style>