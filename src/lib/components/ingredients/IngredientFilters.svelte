<script>
  import { CATEGORIES } from '../../constants/ingredientConstants.js';
  
  let {
    searchQuery = $bindable(''),
    selectedCategory = $bindable('ALL'),
    selectedHealthSystem = $bindable('ALL'),
    showOnlyWithDiffs = $bindable(false),
    healthSystems = [],
    selectionMode = $bindable(false),
    selectedCount = 0,
    totalFiltered = 0,
    totalIngredients = 0,
    loading = false,
    activeConfigId = null,
    onBulkOperations = () => {},
    onSelectAll = () => {},
    onClearSelection = () => {},
    onFindVariations = () => {}
  } = $props();
  
  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    if (!selectionMode) {
      onClearSelection();
    }
  }
</script>

<div class="filters-container">
  <div class="header-row">
    <div class="header-stats">
      {#if activeConfigId}
        <span class="active-config-badge">
          ⚙️ Filtered by config: {activeConfigId}
        </span>
      {/if}
      {#if !loading}
        <span class="stat">{totalFiltered} of {totalIngredients} ingredients</span>
      {/if}
    </div>
    
    <div class="selection-controls">
      <button 
        class="selection-toggle-btn {selectionMode ? 'active' : ''}"
        onclick={toggleSelectionMode}
        title="{selectionMode ? 'Exit selection mode' : 'Enter selection mode'}"
      >
        {selectionMode ? '✓ Selection Mode' : '☐ Select'}
      </button>
      
      {#if selectionMode}
        <span class="selection-count">{selectedCount} selected</span>
        <button 
          class="select-all-btn"
          onclick={onSelectAll}
          disabled={selectedCount === totalFiltered}
        >
          Select All
        </button>
        <button 
          class="clear-selection-btn"
          onclick={onClearSelection}
          disabled={selectedCount === 0}
        >
          Clear
        </button>
        <button 
          class="bulk-operations-btn"
          onclick={onBulkOperations}
          disabled={selectedCount === 0}
        >
          ⚙️ Bulk Operations
        </button>
      {/if}
    </div>
  </div>
  
  <div class="filter-row">
    <input
      type="text"
      placeholder="🔍 Search ingredients..."
      value={searchQuery}
      oninput={(e) => searchQuery = e.target.value}
      class="search-input"
    />
    
    <select bind:value={selectedCategory} class="filter-select">
      {#each CATEGORIES as category}
        <option value={category}>
          {category === 'ALL' ? 'All Categories' : category.replace(/_/g, ' ')}
        </option>
      {/each}
    </select>
    
    <select bind:value={selectedHealthSystem} class="filter-select">
      {#each healthSystems as system}
        <option value={system}>
          {system === 'ALL' ? 'All Health Systems' : system}
        </option>
      {/each}
    </select>
    
    <label class="diff-filter">
      <input
        type="checkbox"
        bind:checked={showOnlyWithDiffs}
      />
      <span>Show only with differences</span>
    </label>
    
    <button
      class="variation-detector-btn"
      onclick={onFindVariations}
      title="Find all variation clusters"
    >
      🔍 Find All Variations
    </button>
  </div>
</div>

<style>
  @import '../../styles/ingredientDesignSystem.css';
  
  .filters-container {
    background: linear-gradient(135deg, 
      var(--glass-bg) 0%, 
      var(--glass-bg-light) 100%
    );
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-2xl);
    padding: var(--space-6);
    margin-bottom: var(--space-6);
    box-shadow: var(--shadow-elevation-low);
    transition: all var(--duration-base) var(--ease-out);
  }
  
  .filters-container:hover {
    box-shadow: var(--shadow-elevation-medium);
  }
  
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .header-stats {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .active-config-badge {
    background-color: var(--color-info-100);
    color: var(--color-info-700);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .stat {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
  
  .selection-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .selection-toggle-btn {
    padding: var(--space-2) var(--space-4);
    background: linear-gradient(145deg, 
      var(--color-surface), 
      var(--color-surface-alt, var(--color-surface))
    );
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    box-shadow: 
      var(--neumorphic-shadow-light),
      var(--neumorphic-shadow-dark);
    transition: all var(--duration-base) var(--ease-out);
    position: relative;
    overflow: hidden;
  }
  
  .selection-toggle-btn:hover {
    transform: translateY(-1px);
    box-shadow: 
      8px 8px 16px rgba(0, 0, 0, 0.12),
      -8px -8px 16px rgba(255, 255, 255, 0.85);
  }
  
  .selection-toggle-btn:active {
    box-shadow: 
      var(--neumorphic-shadow-inset-light),
      var(--neumorphic-shadow-inset-dark);
    transform: translateY(0);
  }
  
  .selection-toggle-btn.active {
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.15), 
      rgba(var(--color-primary-rgb), 0.25)
    );
    color: rgb(var(--color-primary-rgb));
    box-shadow: 
      var(--neumorphic-shadow-inset-light),
      var(--neumorphic-shadow-inset-dark),
      0 0 20px rgba(var(--color-primary-rgb), 0.2);
  }
  
  .selection-count {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  
  .select-all-btn,
  .clear-selection-btn,
  .bulk-operations-btn {
    padding: 0.375rem 0.75rem;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }
  
  .select-all-btn:hover:not(:disabled),
  .clear-selection-btn:hover:not(:disabled) {
    background-color: var(--color-surface-hover);
  }
  
  .bulk-operations-btn {
    background: linear-gradient(135deg, 
      rgb(var(--color-primary-rgb)), 
      rgba(var(--color-primary-rgb), 0.8)
    );
    color: white;
    border: none;
    position: relative;
    overflow: hidden;
    box-shadow: 
      var(--shadow-elevation-low),
      0 0 20px rgba(var(--color-primary-rgb), 0.3);
  }
  
  /* Shine effect */
  .bulk-operations-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent, 
      rgba(255, 255, 255, 0.3), 
      transparent
    );
    transition: left var(--duration-slow) var(--ease-out);
  }
  
  .bulk-operations-btn:hover:not(:disabled)::before {
    left: 100%;
  }
  
  .bulk-operations-btn:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 
      var(--shadow-elevation-high),
      0 0 30px rgba(var(--color-primary-rgb), 0.5);
  }
  
  .select-all-btn:disabled,
  .clear-selection-btn:disabled,
  .bulk-operations-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .filter-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .search-input {
    flex: 1;
    min-width: 200px;
    padding: var(--space-3) var(--space-4);
    padding-left: var(--space-10);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    font-size: var(--text-sm);
    background: var(--glass-bg-heavy);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: 
      inset 2px 2px 4px rgba(0, 0, 0, 0.1),
      inset -2px -2px 4px rgba(255, 255, 255, 0.8);
    transition: all var(--duration-base) var(--ease-out);
    position: relative;
  }
  
  /* Search icon */
  .search-input::before {
    content: '🔍';
    position: absolute;
    left: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.5;
  }
  
  .search-input:focus {
    outline: none;
    border-color: rgba(var(--color-primary-rgb), 0.5);
    background: var(--color-surface);
    box-shadow: 
      0 0 0 4px rgba(var(--color-primary-rgb), 0.1),
      var(--shadow-elevation-low),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
  
  .search-input:hover:not(:focus) {
    border-color: rgba(var(--color-primary-rgb), 0.2);
  }
  
  .filter-select {
    padding: var(--space-3) var(--space-4);
    padding-right: var(--space-8);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    background: var(--glass-bg-heavy);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
    box-shadow: 
      var(--shadow-elevation-low),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    transition: all var(--duration-base) var(--ease-out);
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right var(--space-3) center;
    background-size: 1rem;
  }
  
  .filter-select:hover {
    border-color: rgba(var(--color-primary-rgb), 0.2);
    transform: translateY(-1px);
    box-shadow: var(--shadow-elevation-medium);
  }
  
  .filter-select:focus {
    outline: none;
    border-color: rgba(var(--color-primary-rgb), 0.5);
    box-shadow: 
      0 0 0 4px rgba(var(--color-primary-rgb), 0.1),
      var(--shadow-elevation-low);
  }
  
  .diff-filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .diff-filter input[type="checkbox"] {
    cursor: pointer;
  }
  
  .variation-detector-btn {
    padding: var(--space-3) var(--space-4);
    background: linear-gradient(135deg, 
      rgba(var(--color-secondary-rgb), 0.9), 
      rgba(var(--color-secondary-rgb), 0.7)
    );
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    position: relative;
    overflow: hidden;
    box-shadow: 
      var(--shadow-elevation-low),
      0 0 15px rgba(var(--color-secondary-rgb), 0.3);
    transition: all var(--duration-base) var(--ease-out);
  }
  
  .variation-detector-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 
      var(--shadow-elevation-medium),
      0 0 25px rgba(var(--color-secondary-rgb), 0.5);
  }
  
  /* Ripple effect on click */
  .variation-detector-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: translate(-50%, -50%);
    transition: width var(--duration-slow), height var(--duration-slow);
  }
  
  .variation-detector-btn:active::after {
    width: 200px;
    height: 200px;
  }
  /* Dark theme adaptations */
  :global([data-theme="dark"]) .filters-container {
    background: linear-gradient(135deg, 
      var(--glass-bg) 0%, 
      rgba(31, 41, 55, 0.6) 100%
    );
  }
  
  :global([data-theme="dark"]) .search-input,
  :global([data-theme="dark"]) .filter-select {
    background: rgba(31, 41, 55, 0.9);
    box-shadow: 
      inset 2px 2px 4px rgba(0, 0, 0, 0.3),
      inset -2px -2px 4px rgba(255, 255, 255, 0.05);
  }
  
  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .selection-toggle-btn,
    .bulk-operations-btn,
    .variation-detector-btn {
      transition-duration: 0.01ms !important;
    }
    
    .bulk-operations-btn::before,
    .variation-detector-btn::after {
      display: none;
    }
  }
</style>