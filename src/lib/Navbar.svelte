<script>
  let { 
    showSidebar = $bindable(false),
    tpnMode = $bindable(false),
    showOutput = $bindable(false),
    outputMode = $bindable('json'),
    showKeyReference = $bindable(false),
    showKPTReference = $bindable(false),
    onOpenKPTManager = () => {},
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
  
  let showMoreMenu = $state(false);
  let currentMenuIndex = $state(-1);
  let menuContainer;
  
  // Theme management
  let currentTheme = $state('light');
  let isThemeTransitioning = $state(false);
  
  // Initialize theme from localStorage or system preference
  $effect(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      currentTheme = savedTheme;
    } else {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      currentTheme = prefersDark ? 'dark' : 'light';
    }
    
    // Apply theme immediately
    applyTheme(currentTheme);
  });
  
  // Listen for system theme changes
  $effect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // Only auto-switch if user hasn't manually set a theme
      const savedTheme = localStorage.getItem('app-theme');
      if (!savedTheme) {
        const newTheme = e.matches ? 'dark' : 'light';
        if (newTheme !== currentTheme) {
          currentTheme = newTheme;
          applyTheme(currentTheme);
        }
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  });
  
  function applyTheme(theme) {
    isThemeTransitioning = true;
    
    // Set theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const themeColor = theme === 'dark' ? '#0a0e1a' : '#ffffff';
    
    if (metaTheme) {
      metaTheme.content = themeColor;
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = themeColor;
      document.head.appendChild(meta);
    }
    
    // Save to localStorage
    localStorage.setItem('app-theme', theme);
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('app-theme-change', {
      detail: { theme, timestamp: Date.now() }
    }));
    
    // End transition state after animation completes
    setTimeout(() => {
      isThemeTransitioning = false;
    }, 300);
  }
  
  function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    currentTheme = newTheme;
    applyTheme(newTheme);
  }
  
  function getThemeIcon() {
    return currentTheme === 'light' ? '🌙' : '☀️';
  }
  
  function getThemeLabel() {
    return currentTheme === 'light' ? 'Dark mode' : 'Light mode';
  }
  
  // Close dropdown when clicking outside
  $effect(() => {
    if (showMoreMenu) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.more-menu-group')) {
          closeMenu();
        }
      };
      
      const handleKeyDown = (e) => {
        if (!showMoreMenu) return;
        
        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            closeMenu();
            // Focus the more button
            menuContainer?.querySelector('.more-btn')?.focus();
            break;
          case 'ArrowDown':
            e.preventDefault();
            navigateMenu(1);
            break;
          case 'ArrowUp':
            e.preventDefault();
            navigateMenu(-1);
            break;
          case 'Enter':
          case ' ':
            e.preventDefault();
            activateMenuItem();
            break;
          case 'Home':
            e.preventDefault();
            setMenuIndex(0);
            break;
          case 'End':
            e.preventDefault();
            const menuItems = getMenuItems();
            setMenuIndex(menuItems.length - 1);
            break;
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  });
  
  function closeMenu() {
    showMoreMenu = false;
    currentMenuIndex = -1;
  }
  
  function getMenuItems() {
    return menuContainer?.querySelectorAll('.dropdown-item:not([disabled])') || [];
  }
  
  function navigateMenu(direction) {
    const menuItems = getMenuItems();
    if (menuItems.length === 0) return;
    
    currentMenuIndex = Math.max(0, Math.min(menuItems.length - 1, currentMenuIndex + direction));
    setMenuIndex(currentMenuIndex);
  }
  
  function setMenuIndex(index) {
    const menuItems = getMenuItems();
    currentMenuIndex = index;
    
    // Remove previous focus
    menuItems.forEach(item => item.classList.remove('menu-focused'));
    
    // Set new focus
    if (menuItems[index]) {
      menuItems[index].classList.add('menu-focused');
      menuItems[index].focus();
    }
  }
  
  function activateMenuItem() {
    const menuItems = getMenuItems();
    if (menuItems[currentMenuIndex]) {
      menuItems[currentMenuIndex].click();
    }
  }
  
  // Initialize focus when menu opens
  $effect(() => {
    if (showMoreMenu) {
      // Wait for DOM to update
      setTimeout(() => {
        setMenuIndex(0);
      }, 0);
    }
  });
  
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
      <h1 class="app-title-mobile" id="app-title-mobile"></h1>
      
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
              aria-describedby="mode-description"
              onchange={() => {
                if (tpnMode && !showKeyReference) {
                  showKeyReference = true;
                }
              }}
            />
            <span class="toggle-slider" aria-hidden="true"></span>
            <span class="mode-label">{tpnMode ? 'TPN Mode' : 'Normal Mode'}</span>
          </label>
          <div id="mode-description" class="sr-only">
            {tpnMode ? 'TPN mode enabled with calculations' : 'Normal editing mode'}
          </div>
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
        <!-- Theme Toggle -->
        <button 
          class="view-toggle theme-toggle {isThemeTransitioning ? 'transitioning' : ''}"
          onclick={toggleTheme}
          title="Switch to {currentTheme === 'light' ? 'dark' : 'light'} mode"
          aria-label="Toggle {currentTheme === 'light' ? 'dark' : 'light'} mode"
          aria-describedby="theme-description"
          data-theme={currentTheme}
        >
          <span class="theme-icon" aria-hidden="true">{getThemeIcon()}</span>
          <span class="theme-label">{currentTheme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
        <div id="theme-description" class="sr-only">
          Currently in {currentTheme} mode. Click to switch to {currentTheme === 'light' ? 'dark mode' : 'light mode'}.
        </div>
        
        {#if tpnMode}
          <button 
            class="view-toggle {showKeyReference ? 'active' : ''}"
            onclick={() => showKeyReference = !showKeyReference}
            title="Toggle key reference panel"
            aria-label="Toggle key reference panel"
            aria-pressed={showKeyReference}
            aria-controls="key-reference-panel"
          >
            <span aria-hidden="true">🔑</span> Keys
          </button>
        {/if}
        
        <button 
          class="view-toggle {showKPTReference ? 'active' : ''}"
          onclick={() => showKPTReference = !showKPTReference}
          title="Toggle KPT function reference panel"
          aria-label="Toggle KPT function reference panel"
          aria-pressed={showKPTReference}
          aria-controls="kpt-reference-panel"
        >
          <span aria-hidden="true">📚</span> KPT Ref
        </button>
      </div>
      
      <div class="navbar-actions">
        <!-- Primary Actions -->
        <div class="action-group primary-actions">
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
        </div>
        
        <!-- Secondary Actions -->
        <div class="action-group secondary-actions">
          <button 
            class="action-btn kpt-manager-btn"
            onclick={onOpenKPTManager}
            title="Manage KPT Functions"
            aria-label="Open KPT function manager"
            data-action="kpt-manager"
          >
            <span class="btn-icon" aria-hidden="true">🛠️</span>
            <span class="btn-text">KPT Manager</span>
          </button>
          
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
                title="Compare versions"
                aria-label="Compare versions of {currentIngredient}"
              >
                <span class="btn-icon">🔍</span>
                <span class="btn-text">Compare</span>
              </button>
            {/if}
          {/if}
        </div>
        
        <!-- More Menu (Desktop) -->
        <div class="action-group more-menu-group" bind:this={menuContainer}>
          <button 
            class="action-btn more-btn"
            onclick={() => showMoreMenu = !showMoreMenu}
            title="More options"
            aria-label="Show more options"
            aria-expanded={showMoreMenu}
            aria-haspopup="menu"
          >
            <span class="btn-icon">⋮</span>
            <span class="btn-text">More</span>
          </button>
          
          {#if showMoreMenu}
            <div 
              class="dropdown-menu"
              role="menu"
              aria-labelledby="more-menu-button"
            >
              <button 
                class="dropdown-item"
                role="menuitem"
                tabindex="-1"
                onclick={() => { onOpenPreferences(); closeMenu(); }}
              >
                <span aria-hidden="true">⚙️</span> Preferences
              </button>
              
              {#if firebaseEnabled}
                <button 
                  class="dropdown-item"
                  role="menuitem"
                  tabindex="-1"
                  onclick={() => { onOpenMigrationTool(); closeMenu(); }}
                >
                  <span aria-hidden="true">🚀</span> Migrate Data
                </button>
              {/if}
              
              <div class="dropdown-divider" role="separator"></div>
              
              <button 
                class="dropdown-item"
                role="menuitem"
                tabindex="-1"
                onclick={() => { document.dispatchEvent(new CustomEvent('show-shortcuts')); closeMenu(); }}
              >
                <span aria-hidden="true">⌨️</span> Keyboard Shortcuts
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</nav>

<style>
  /*-Grade Navbar Styles */
  .navbar {
    /* surface styling */
    background-color: var(--color-surface);
    color: var(--color-text-primary);
    border-bottom: 2px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    
    /* Enhanced shadows */
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    
    /* Hardware acceleration for smooth interactions */
    transform: translateZ(0);
    will-change: box-shadow;
  }
  
  .navbar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    gap: var(--space-4);
    /* Standard minimum height */
    min-height: 3rem;
  }
  
  .navbar-left {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex: 1;
  }
  
  /* Professional sidebar toggle */
  .sidebar-toggle {
    /* Button base styling */
    padding: var(--space-3);
    font-size: var(--font-size-lg);
    background-color: var(--color-surface-elevated);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    
    /* Professional touch targets and transitions */
    min-height: 2.5rem;
    min-width: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    
    /* Enhanced transitions */
    transition: all var(--duration-fast) var(--ease-out);
    transform: translateZ(0);
  }
  
  .sidebar-toggle:hover {
    background-color: var(--color-state-hover);
    border-color: var(--color-border-medium);
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }
  
  .sidebar-toggle:active {
    transform: translateY(0) scale(0.98);
    box-shadow: var(--shadow-xs);
  }
  
  .sidebar-toggle:focus {
    outline: var(--focus-ring-width) solid var(--focus-ring-color);
    outline-offset: var(--focus-ring-offset);
    box-shadow: 
      0 0 0 var(--focus-ring-width) var(--color-focus-ring),
      var(--shadow-sm);
  }
  
  /* Professional app title */
  .app-title {
    font-size: var(--font-size-xl);
    margin: 0;
    color: var(--color-primary);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.025em;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    
    /* Professional styling */
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .app-title::before {
    content: '📝';
    font-size: var(--font-size-lg);
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
  }
  
  /* Professional document information display */
  .document-info {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-surface-elevated);
    border: 2px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    
    /* professional styling */
    box-shadow: var(--shadow-xs);
    min-height: 2rem;
  }
  
  .doc-name {
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    font-size: var(--font-size-sm);
  }
  
  /* Professional save status indicators */
  .save-status {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    display: flex;
    align-items: center;
    min-width: 24px;
    justify-content: center;
  }
  
  .save-status.saved {
    color: var(--color-success);
    text-shadow: 0 0 4px rgba(40, 167, 69, 0.3);
  }
  
  .save-status.unsaved {
    color: var(--color-error);
    animation: pulse 1.5s ease-in-out infinite;
    text-shadow: 0 0 4px rgba(220, 53, 69, 0.4);
  }
  
  /* Professional pulse animation for critical status */
  @keyframes pulse {
    0%, 100% { 
      opacity: 1; 
      transform: scale(1);
    }
    50% { 
      opacity: 0.7;
      transform: scale(1.1);
    }
  }
  
  /* center section */
  .navbar-center {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-3) 0;
  }
  
  /* Professional mode selector */
  .mode-selector {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-5);
    background-color: var(--color-surface-elevated);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xs);
    min-height: 2.5rem;
  }
  
  .mode-toggle {
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
    /* Professional accessibility */
    min-height: 2rem;
  }
  
  .mode-toggle input {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
  
  /* Professional toggle slider */
  .toggle-slider {
    width: 56px;
    height: 32px;
    background-color: var(--color-border-medium);
    border-radius: var(--radius-full);
    position: relative;
    transition: all var(--duration-normal) var(--ease-out);
    margin-right: var(--space-4);
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.1),
      0 1px 3px rgba(0, 0, 0, 0.05);
    border: 1px solid var(--color-border);
  }
  
  .toggle-slider::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 26px;
    height: 26px;
    background: linear-gradient(135deg, white, #f8f9fa);
    border-radius: 50%;
    box-shadow: 
      0 2px 4px rgba(0, 0, 0, 0.15),
      0 1px 2px rgba(0, 0, 0, 0.1);
    transition: all var(--duration-normal) var(--ease-out);
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  /* TPN mode active state */
  .mode-toggle input:checked + .toggle-slider {
    background-color: var(--color-success);
    border-color: var(--color-success);
    box-shadow: 
      inset 0 2px 4px rgba(0, 168, 107, 0.2),
      0 0 8px rgba(0, 168, 107, 0.15);
  }
  
  .mode-toggle input:checked + .toggle-slider::after {
    transform: translateX(24px);
    background: linear-gradient(135deg, white, #e8f5e8);
  }
  
  .mode-toggle:hover .toggle-slider {
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.1),
      0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
  
  .mode-toggle:focus-within .toggle-slider {
    outline: var(--focus-ring-width) solid var(--focus-ring-color);
    outline-offset: var(--focus-ring-offset);
  }
  
  /* mode label */
  .mode-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    letter-spacing: 0.025em;
  }
  
  /* Professional ingredient display */
  .current-ingredient {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: linear-gradient(135deg, var(--color-success), var(--color-success));
    background-color: var(--color-success-50);
    border: 2px solid var(--color-success-200);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    min-height: 2rem;
  }
  
  .ingredient-icon {
    font-size: var(--font-size-lg);
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
  }
  
  .ingredient-name {
    font-size: var(--font-size-sm);
    color: var(--color-success-800);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.025em;
  }
  
  /* Professional right section */
  .navbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex: 1;
    justify-content: flex-end;
  }
  
  /* view toggles */
  .view-toggles {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-2);
    background-color: var(--color-surface-elevated);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xs);
  }
  
  /* Professional theme toggle */
  .theme-toggle {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, var(--color-surface), var(--color-surface-elevated));
    border: 2px solid var(--color-border);
    color: var(--color-text-primary);
    
    /* Enhanced transitions */
    transition: all var(--duration-normal) var(--ease-out);
    
    /* Visual indicator for current theme */
    box-shadow: 
      var(--shadow-xs),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  
  .theme-toggle[data-theme="dark"] {
    background: linear-gradient(135deg, var(--color-gray-800), var(--color-gray-700));
    border-color: var(--color-gray-600);
    color: var(--color-gray-100);
    box-shadow: 
      var(--shadow-xs),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }
  
  .theme-toggle:hover:not(.transitioning) {
    transform: translateY(-1px) scale(1.02);
    box-shadow: 
      var(--shadow-md),
      0 0 12px rgba(0, 128, 255, 0.15);
    border-color: var(--color-primary-400);
  }
  
  .theme-toggle[data-theme="dark"]:hover:not(.transitioning) {
    box-shadow: 
      var(--shadow-md),
      0 0 12px rgba(255, 204, 0, 0.2);
    border-color: #ffd700;
  }
  
  .theme-toggle:active:not(.transitioning) {
    transform: translateY(0) scale(0.98);
    transition: transform var(--duration-fast) var(--ease-out);
  }
  
  /* Professional theme transition state */
  .theme-toggle.transitioning {
    pointer-events: none;
    animation: theme-switching 300ms var(--ease-out);
  }
  
  @keyframes theme-switching {
    0% { 
      transform: scale(1); 
      opacity: 1;
    }
    50% { 
      transform: scale(1.05);
      opacity: 0.8;
      box-shadow: 
        var(--shadow-lg),
        0 0 16px rgba(0, 128, 255, 0.3);
    }
    100% { 
      transform: scale(1);
      opacity: 1;
    }
  }
  
  /* Theme icon animations */
  .theme-icon {
    font-size: var(--font-size-lg);
    display: inline-block;
    transition: 
      transform var(--duration-normal) var(--ease-out),
      filter var(--duration-normal) var(--ease-out);
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }
  
  .theme-toggle:hover .theme-icon {
    transform: rotate(-10deg) scale(1.1);
    filter: 
      drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15)),
      brightness(1.1);
  }
  
  .theme-toggle[data-theme="dark"]:hover .theme-icon {
    filter: 
      drop-shadow(0 2px 4px rgba(255, 204, 0, 0.3)),
      brightness(1.2);
  }
  
  .theme-toggle.transitioning .theme-icon {
    animation: theme-icon-flip 300ms var(--ease-out);
  }
  
  @keyframes theme-icon-flip {
    0% { 
      transform: rotateY(0deg) scale(1);
    }
    50% { 
      transform: rotateY(90deg) scale(0.8);
      opacity: 0.5;
    }
    100% { 
      transform: rotateY(0deg) scale(1);
      opacity: 1;
    }
  }
  
  /* Theme label styling */
  .theme-label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    opacity: 0.9;
    transition: opacity var(--duration-fast) var(--ease-out);
  }
  
  .theme-toggle:hover .theme-label {
    opacity: 1;
  }
  
  /* Dark mode indicator */
  .theme-toggle[data-theme="dark"]::after {
    content: '';
    position: absolute;
    top: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    background: linear-gradient(45deg, #ffd700, #ffed4a);
    border-radius: 50%;
    box-shadow: 
      0 0 4px rgba(255, 215, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    animation: dark-indicator-pulse 2s ease-in-out infinite;
  }
  
  @keyframes dark-indicator-pulse {
    0%, 100% { 
      opacity: 1;
      transform: scale(1);
    }
    50% { 
      opacity: 0.7;
      transform: scale(0.9);
    }
  }
  
  /* accessibility: High contrast mode support */
  @media (prefers-contrast: high) {
    .theme-toggle {
      border-width: 3px;
      font-weight: var(--font-weight-bold);
    }
    
    .theme-toggle:focus {
      outline: 4px solid var(--color-focus-ring);
      outline-offset: 2px;
    }
  }
  
  /* accessibility: Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .theme-toggle,
    .theme-icon,
    .theme-toggle.transitioning {
      animation: none !important;
      transition-duration: 0.01ms !important;
    }
    
    .theme-toggle:hover .theme-icon {
      transform: none;
    }
  }
  
  .view-toggle {
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    background-color: transparent;
    color: var(--color-text-secondary);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    
    /* Professional touch targets */
    min-height: 2.5rem;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    
    /* Enhanced transitions */
    transition: all var(--duration-fast) var(--ease-out);
    transform: translateZ(0);
  }
  
  .view-toggle:hover:not(.active) {
    background-color: var(--color-state-hover);
    color: var(--color-text-primary);
    transform: translateY(-1px);
    border-color: var(--color-border-medium);
  }
  
  .view-toggle.active {
    background-color: var(--color-info);
    color: var(--color-text-inverse);
    box-shadow: 
      var(--shadow-sm),
      0 0 8px rgba(23, 162, 184, 0.2);
    border-color: var(--color-info);
    transform: translateY(-1px);
  }
  
  .view-toggle:focus {
    outline: var(--focus-ring-width) solid var(--focus-ring-color);
    outline-offset: var(--focus-ring-offset);
    box-shadow: 
      0 0 0 var(--focus-ring-width) var(--color-focus-ring),
      var(--shadow-sm);
  }
  
  .view-toggle:active {
    transform: translateY(0) scale(0.98);
  }
  
  /* Professional action section */
  .navbar-actions {
    display: flex;
    gap: var(--space-4);
    align-items: center;
  }
  
  /* action groups with enhanced visual hierarchy */
  .action-group {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-2);
  }
  
  /* Primary actions - highest priority */
  .primary-actions {
    background-color: var(--color-surface-elevated);
    border: 2px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    box-shadow: var(--shadow-sm);
  }
  
  /* Secondary actions - management functions */
  .secondary-actions {
    background-color: var(--color-surface-elevated);
    border: 2px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    box-shadow: var(--shadow-xs);
  }
  
  /* Action group separators for visual clarity */
  .action-group:not(:last-child):not(.primary-actions):not(.secondary-actions)::after {
    content: '';
    display: block;
    width: 2px;
    height: 2rem;
    background: linear-gradient(to bottom, transparent, var(--color-border), transparent);
    margin-left: var(--space-3);
    border-radius: var(--radius-full);
  }
  
  /* Professional action buttons with semantic colors */
  .action-btn {
    /* Base button structure */
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    
    /* Desktop: comfortable mouse sizing */
    padding: var(--space-3) var(--space-4);
    min-height: 2.25rem;
    min-width: 2.25rem;
    
    /* Typography for readability */
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    text-align: center;
    text-decoration: none;
    letter-spacing: 0.025em;
    
    /* Professional styling */
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    
    /* Enhanced transitions */
    transition: all var(--duration-fast) var(--ease-out);
    transform: translateZ(0);
    will-change: transform, box-shadow, background-color;
  }
  
  /* hover states */
  .action-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  /* active states */
  .action-btn:active {
    transform: translateY(0) scale(0.98);
    box-shadow: var(--shadow-sm);
  }
  
  /* Professional focus states */
  .action-btn:focus {
    outline: var(--focus-ring-width) solid var(--focus-ring-color);
    outline-offset: var(--focus-ring-offset);
    box-shadow: 
      0 0 0 var(--focus-ring-width) var(--color-focus-ring),
      var(--shadow-md);
  }
  
  /* Professional button variants with semantic colors */
  
  /* New Document - Safe operation */
  .new-btn {
    background-color: var(--color-success);
    color: var(--color-text-inverse);
    border-color: var(--color-success);
    box-shadow: 
      var(--shadow-sm),
      0 0 8px rgba(40, 167, 69, 0.2);
  }
  
  .new-btn:hover {
    background-color: var(--color-success-600);
    border-color: var(--color-success-600);
    box-shadow: 
      var(--shadow-md),
      0 0 12px rgba(40, 167, 69, 0.3);
  }
  
  .new-btn:active {
    background-color: var(--color-success-700);
  }
  
  /* Save - Critical operation */
  .save-btn {
    background-color: var(--color-primary);
    color: var(--color-text-inverse);
    border-color: var(--color-primary);
    box-shadow: 
      var(--shadow-sm),
      0 0 8px rgba(0, 102, 204, 0.2);
    
    /* Enhanced visibility for critical save action */
    position: relative;
  }
  
  .save-btn::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(45deg, transparent, rgba(0, 102, 204, 0.1), transparent);
    border-radius: inherit;
    z-index: -1;
    animation: save-glow 2s ease-in-out infinite;
  }
  
  @keyframes save-glow {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }
  
  .save-btn:hover {
    background-color: var(--color-primary-700);
    border-color: var(--color-primary-700);
    box-shadow: 
      var(--shadow-lg),
      0 0 16px rgba(0, 102, 204, 0.4);
  }
  
  .save-btn:active {
    background-color: var(--color-primary-800);
  }
  
  /* Export - Informational action */
  .export-btn {
    background-color: var(--color-info);
    color: var(--color-text-inverse);
    border-color: var(--color-info);
    box-shadow: 
      var(--shadow-sm),
      0 0 8px rgba(23, 162, 184, 0.2);
  }
  
  .export-btn:hover {
    background-color: var(--color-info-600);
    border-color: var(--color-info-600);
    box-shadow: 
      var(--shadow-md),
      0 0 12px rgba(23, 162, 184, 0.3);
  }
  
  .export-btn:active {
    background-color: var(--color-info-700);
  }
  
  /* Export success state */
  .export-btn.copied {
    background-color: var(--color-success);
    border-color: var(--color-success);
    animation: copy-success 0.5s ease-out;
  }
  
  @keyframes copy-success {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  /* Ingredients - Management action */
  .ingredients-btn {
    background-color: var(--color-warning);
    color: var(--color-gray-900);
    border-color: var(--color-warning);
    box-shadow: 
      var(--shadow-sm),
      0 0 8px rgba(253, 126, 20, 0.2);
    font-weight: var(--font-weight-bold);
  }
  
  .ingredients-btn:hover {
    background-color: var(--color-warning-600);
    border-color: var(--color-warning-600);
    color: var(--color-gray-900);
    box-shadow: 
      var(--shadow-md),
      0 0 12px rgba(253, 126, 20, 0.3);
  }
  
  .ingredients-btn:active {
    background-color: var(--color-warning-700);
  }
  
  /* Diff/Compare - Analysis action (Medical Info) */
  .diff-btn {
    background-color: var(--color-info);
    color: var(--color-text-inverse);
    border-color: var(--color-info);
    box-shadow: var(--shadow-sm);
  }
  
  .diff-btn:hover {
    background-color: var(--color-info-600);
    border-color: var(--color-info-600);
    box-shadow: var(--shadow-md);
  }
  
  .diff-btn:active {
    background-color: var(--color-info-700);
  }
  
  /* KPT Manager - Tool access (Medical Secondary) */
  .kpt-manager-btn {
    background-color: var(--color-success);
    color: var(--color-text-inverse);
    border-color: var(--color-success);
    box-shadow: var(--shadow-sm);
  }
  
  .kpt-manager-btn:hover {
    background-color: var(--color-success-600);
    border-color: var(--color-success-600);
    box-shadow: var(--shadow-md);
  }
  
  .kpt-manager-btn:active {
    background-color: var(--color-success-700);
  }
  
  /* Professional button content styling */
  .btn-icon {
    font-size: var(--font-size-base);
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
    flex-shrink: 0;
  }
  
  .btn-text {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.025em;
    white-space: nowrap;
  }
  
  /* More menu button - neutral action */
  .more-btn {
    background-color: var(--color-gray-500);
    color: var(--color-text-inverse);
    border-color: var(--color-gray-500);
    box-shadow: var(--shadow-sm);
  }
  
  .more-btn:hover {
    background-color: var(--color-gray-600);
    border-color: var(--color-gray-600);
    box-shadow: var(--shadow-md);
  }
  
  .more-btn:active {
    background-color: var(--color-gray-700);
  }
  
  /* Professional dropdown menu system */
  .more-menu-group {
    position: relative;
  }
  
  /* dropdown menu container */
  .dropdown-menu {
    position: absolute;
    top: calc(100% + var(--space-2));
    right: 0;
    
    /* surface styling */
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    
    /* Enhanced shadows */
    box-shadow: 
      var(--shadow-xl),
      0 0 24px rgba(0, 0, 0, 0.1);
    
    /* sizing */
    min-width: 280px;
    z-index: var(--z-dropdown);
    
    /* Layout */
    display: flex;
    flex-direction: column;
    padding: var(--space-3) 0;
    
    /* Professional backdrop blur */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    
    /* Professional animation */
    animation: dropdown-appear var(--duration-normal) var(--ease-out);
  }
  
  /* Enhanced dropdown animation */
  @keyframes dropdown-appear {
    from {
      opacity: 0;
      transform: translateY(-12px) scale(0.92);
      box-shadow: var(--shadow-sm);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      box-shadow: 
        var(--shadow-xl),
        0 0 24px rgba(0, 0, 0, 0.1);
    }
  }
  
  /* dropdown items */
  .dropdown-item {
    /* Layout and spacing */
    padding: var(--space-4) var(--space-5);
    background: none;
    border: 1px solid transparent;
    text-align: left;
    cursor: pointer;
    
    /* typography */
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    letter-spacing: 0.025em;
    
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-4);
    
    /* touch targets */
    margin: 0 var(--space-3);
    border-radius: var(--radius-md);
    min-height: 2.5rem;
    
    /* Enhanced transitions */
    transition: all var(--duration-fast) var(--ease-out);
    transform: translateZ(0);
  }
  
  /* dropdown hover states */
  .dropdown-item:hover,
  .dropdown-item.menu-focused {
    background-color: var(--color-state-hover);
    color: var(--color-text-primary);
    border-color: var(--color-border-light);
    transform: translateX(4px);
    box-shadow: var(--shadow-xs);
  }
  
  /* dropdown focus states */
  .dropdown-item:focus {
    outline: var(--focus-ring-width) solid var(--focus-ring-color);
    outline-offset: var(--focus-ring-offset);
    background-color: var(--color-state-selected);
    box-shadow: 
      0 0 0 var(--focus-ring-width) var(--color-focus-ring),
      var(--shadow-sm);
  }
  
  /* dropdown active states */
  .dropdown-item:active {
    transform: translateX(2px) scale(0.98);
    background-color: var(--color-state-active);
  }
  
  /* dropdown icons */
  .dropdown-item span[aria-hidden="true"] {
    font-size: var(--font-size-lg);
    width: 24px;
    text-align: center;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
    flex-shrink: 0;
  }
  
  /* dropdown divider */
  .dropdown-divider {
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--color-border),
      transparent
    );
    margin: var(--space-3) var(--space-5);
    border-radius: var(--radius-full);
  }
  
  /* Mobile design optimized for iPhone */
  @media (max-width: 767px) {
    .navbar {
      /* Enhanced mobile background */
      background-color: rgba(var(--color-surface-rgb, 255, 255, 255), 0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding-top: max(var(--space-3), env(safe-area-inset-top));
      border-bottom: 2px solid var(--color-border-light);
      box-shadow: var(--shadow-lg);
    }
    
    .navbar-top {
      flex-wrap: wrap;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      /* iPhone: 44px standard touch targets */
      min-height: 2.75rem;
    }
    
    /* Mobile navbar left section */
    .navbar-left {
      flex: 0 1 auto;
      gap: var(--space-3);
    }
    
    /* Hide full title on mobile */
    .app-title {
      display: none;
    }
    
    /* Professional mobile title */
    .app-title-mobile {
      display: block;
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-bold);
      color: var(--color-primary);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    
    .app-title-mobile::after {
      content: "📝 TPN Editor";
    }
    
    /* Hide mobile title on desktop */
    @media (min-width: 768px) {
      .app-title-mobile {
        display: none;
      }
    }
    
    /* mobile document info */
    .document-info {
      font-size: var(--font-size-xs);
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border-light);
      gap: var(--space-2);
    }
    
    /* Mobile center section reorganization */
    .navbar-center {
      order: 3;
      flex-basis: 100%;
      justify-content: center;
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 2px solid var(--color-border-light);
    }
    
    /* Mobile mode toggle scaling */
    .mode-toggle {
      transform: scale(0.95);
    }
    
    /* Mobile ingredient display */
    .current-ingredient {
      font-size: var(--font-size-xs);
      padding: var(--space-2) var(--space-3);
      gap: var(--space-2);
    }
    
    /* Mobile right section */
    .navbar-right {
      flex: 1;
      justify-content: flex-end;
    }
    
    /* Professional mobile actions */
    .navbar-actions {
      gap: var(--space-3);
      flex-wrap: nowrap;
      justify-content: flex-end;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding: 0 var(--space-2);
      scrollbar-width: none; /* Hide scrollbar */
      -ms-overflow-style: none; /* Hide scrollbar */
    }
    
    .navbar-actions::-webkit-scrollbar {
      display: none; /* Hide scrollbar */
    }
    
    /* Mobile action groups */
    .action-group {
      flex-shrink: 0;
      gap: var(--space-2);
      padding: var(--space-2);
    }
    
    .action-group:not(:last-child)::after {
      display: none;
    }
    
    /* Hide secondary actions on mobile for focus */
    .secondary-actions {
      display: none;
    }
    
    /* mobile overflow system */
    .mobile-overflow {
      display: flex;
      position: relative;
    }
    
    .mobile-overflow-btn {
      background-color: var(--color-gray-600);
      color: var(--color-text-inverse);
      border: 2px solid var(--color-gray-600);
      border-radius: var(--radius-lg);
      padding: var(--space-3);
      cursor: pointer;
      
      /* iPhone: 44px touch targets */
      min-width: 2.75rem;
      min-height: 2.75rem;
      
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--duration-fast) var(--ease-out);
      box-shadow: var(--shadow-sm);
    }
    
    .mobile-overflow-btn:hover {
      background-color: var(--color-gray-700);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    
    .mobile-overflow-btn:active {
      transform: translateY(0) scale(0.98);
    }
    
    /* mobile overflow menu */
    .mobile-overflow-menu {
      position: fixed;
      top: auto;
      bottom: var(--space-20);
      right: var(--space-4);
      
      /* mobile menu styling */
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: 
        var(--shadow-2xl),
        0 0 32px rgba(0, 0, 0, 0.15);
      
      /* Enhanced mobile backdrop */
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      
      padding: var(--space-4) 0;
      min-width: 280px;
      z-index: var(--z-modal);
      
      /* mobile animation */
      animation: mobile-menu-appear var(--duration-normal) var(--ease-out);
    }
    
    /* Enhanced mobile menu animation */
    @keyframes mobile-menu-appear {
      from {
        opacity: 0;
        transform: translateY(24px) scale(0.88);
        box-shadow: var(--shadow-sm);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
        box-shadow: 
          var(--shadow-2xl),
          0 0 32px rgba(0, 0, 0, 0.15);
      }
    }
    
    /* Mobile dropdown items */
    .mobile-overflow-menu .dropdown-item {
      padding: var(--space-4) var(--space-5);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      /* iPhone: 44px touch targets */
      min-height: 2.75rem;
      gap: var(--space-4);
    }
    
    /* Very small mobile optimization */
    @media (max-width: 480px) {
      .navbar-actions {
        gap: var(--space-2);
      }
    }
    
    /* Mobile action buttons */
    .action-btn {
      padding: var(--space-3);
      /* iPhone: 44px touch targets */
      min-width: 2.75rem;
      min-height: 2.75rem;
      border-radius: var(--radius-lg);
      border-width: 2px;
    }
    
    /* Hide text on mobile, show icons only */
    .btn-text {
      display: none;
    }
    
    /* Larger mobile icons for clarity */
    .btn-icon {
      font-size: var(--font-size-xl);
    }
    
    /* Mobile view toggles */
    .view-toggle {
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-size-sm);
      min-height: 2.5rem;
    }
    
    /* Mobile theme toggle adjustments */
    .theme-toggle {
      /* iPhone: 44px touch targets */
      min-height: 2.75rem;
      min-width: 2.75rem;
      padding: var(--space-3) var(--space-4);
    }
    
    .theme-toggle .theme-icon {
      font-size: var(--font-size-xl);
    }
    
    .theme-toggle .theme-label {
      font-size: var(--font-size-xs);
    }
    
    /* Mobile dark mode indicator adjustment */
    .theme-toggle[data-theme="dark"]::after {
      top: 6px;
      right: 6px;
      width: 10px;
      height: 10px;
    }
    
    /* Mobile sidebar toggle */
    .sidebar-toggle {
      padding: var(--space-3);
      font-size: var(--font-size-xl);
      /* iPhone: 44px touch targets */
      min-width: 2.75rem;
      min-height: 2.75rem;
    }
  }
  
  /* Tablet optimization */
  @media (min-width: 768px) and (max-width: 1024px) {
    .navbar-top {
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    
    .app-title {
      font-size: var(--font-size-lg);
    }
    
    .action-btn {
      padding: var(--space-2) var(--space-3);
    }
    
    .btn-text {
      font-size: var(--font-size-xs);
    }
    
    /* Show secondary actions on tablet */
    .secondary-actions {
      display: flex !important;
    }
    
    /* Hide dropdown on tablet and above */
    .more-menu-group {
      display: flex;
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
      padding-top: max(var(--space-2), env(safe-area-inset-top));
    }
    
    .navbar-top {
      padding: var(--space-1) var(--space-4);
    }
    
    .navbar-center {
      margin-top: var(--space-1);
    }
  }
  
  /* Professional touch interaction states for clinical devices */
  @media (hover: none) and (pointer: coarse) {
    /* Enhanced touch feedback for all interactive elements */
    .action-btn:hover,
    .sidebar-toggle:hover,
    .view-toggle:hover,
    .mode-toggle:hover .toggle-slider,
    .theme-toggle:hover {
      transform: scale(1.05);
      transition: transform var(--duration-fast) var(--ease-out);
      box-shadow: var(--shadow-md);
    }
    
    /* theme toggle touch feedback */
    .theme-toggle:hover:not(.transitioning) {
      transform: scale(1.05);
      box-shadow: 
        var(--shadow-md),
        0 0 12px rgba(0, 128, 255, 0.2);
    }
    
    .theme-toggle[data-theme="dark"]:hover:not(.transitioning) {
      box-shadow: 
        var(--shadow-md),
        0 0 12px rgba(255, 204, 0, 0.25);
    }
    
    /* Professional active states with haptic-like feedback */
    .action-btn:active,
    .sidebar-toggle:active,
    .view-toggle:active,
    .theme-toggle:active:not(.transitioning) {
      transform: scale(0.95);
      transition: transform 100ms var(--ease-out);
      background-color: var(--color-state-active);
      box-shadow: var(--shadow-sm);
    }
    
    /* Enhanced touch feedback for theme toggle */
    .theme-toggle:active:not(.transitioning) {
      transform: scale(0.95);
      transition: transform 100ms var(--ease-out);
    }
    
    .theme-toggle[data-theme="light"]:active:not(.transitioning) {
      background-color: var(--color-primary-50);
      box-shadow: 
        var(--shadow-sm),
        0 0 8px rgba(0, 128, 255, 0.3);
    }
    
    .theme-toggle[data-theme="dark"]:active:not(.transitioning) {
      background-color: var(--color-gray-900);
      box-shadow: 
        var(--shadow-sm),
        0 0 8px rgba(255, 204, 0, 0.4);
    }
    
    /* Enhanced touch feedback for critical actions */
    .save-btn:active {
      background-color: var(--color-primary);
      box-shadow: 
        var(--shadow-sm),
        0 0 16px rgba(0, 102, 204, 0.5);
      transform: scale(0.95);
    }
    
    .new-btn:active {
      background-color: var(--color-success);
      box-shadow: 
        var(--shadow-sm),
        0 0 12px rgba(40, 167, 69, 0.4);
      transform: scale(0.95);
    }
    
    .export-btn:active {
      background-color: var(--color-info);
      box-shadow: 
        var(--shadow-sm),
        0 0 12px rgba(23, 162, 184, 0.4);
      transform: scale(0.95);
    }
    
    .ingredients-btn:active {
      background-color: var(--color-warning);
      box-shadow: 
        var(--shadow-sm),
        0 0 12px rgba(253, 126, 20, 0.4);
      transform: scale(0.95);
    }
    
    /* Enhanced toggle feedback for TPN mode */
    .mode-toggle:active .toggle-slider {
      transform: scale(0.98);
      box-shadow: 
        inset 0 2px 4px rgba(0, 0, 0, 0.15),
        0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    /* Dropdown item touch feedback */
    .dropdown-item:active {
      background-color: var(--color-state-active);
      transform: translateX(2px) scale(0.98);
    }
  }
</style>