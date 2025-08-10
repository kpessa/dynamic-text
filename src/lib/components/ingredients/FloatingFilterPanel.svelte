<script>
  import { fly, fade } from 'svelte/transition';
  import { CATEGORIES } from '../../constants/ingredientConstants.js';
  
  let {
    isOpen = $bindable(false),
    searchQuery = $bindable(''),
    selectedCategory = $bindable('ALL'),
    selectedHealthSystem = $bindable('ALL'),
    showOnlyWithDiffs = $bindable(false),
    healthSystems = [],
    activeFilterCount = 0,
    onFindVariations = () => {}
  } = $props();
  
  let activeFilters = $derived.by(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedCategory !== 'ALL') count++;
    if (selectedHealthSystem !== 'ALL') count++;
    if (showOnlyWithDiffs) count++;
    return count;
  });
  
  function togglePanel() {
    isOpen = !isOpen;
  }
  
  function closePanel() {
    isOpen = false;
  }
  
  // Auto-close on filter selection (optional)
  function handleFilterChange() {
    // Optionally close panel after selection
    // setTimeout(() => isOpen = false, 500);
  }
  
  function clearAllFilters() {
    searchQuery = '';
    selectedCategory = 'ALL';
    selectedHealthSystem = 'ALL';
    showOnlyWithDiffs = false;
  }
</script>

<!-- Minimal Trigger Button -->
<button 
  class="filter-trigger {isOpen ? 'active' : ''}"
  onclick={togglePanel}
  aria-label="Toggle filters"
  title="Toggle filters"
>
  <span class="filter-icon">🔍</span>
  <span class="filter-text">Filter</span>
  {#if activeFilters > 0}
    <span class="filter-count">{activeFilters}</span>
  {/if}
</button>

<!-- Floating Panel -->
{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="filter-backdrop"
    onclick={closePanel}
    transition:fade={{ duration: 200 }}
    aria-hidden="true"
  />
  
  <!-- Panel -->
  <div 
    class="filter-panel"
    transition:fly={{ x: 300, duration: 250 }}
    role="dialog"
    aria-modal="true"
    aria-label="Filter options"
  >
    <div class="panel-header">
      <h3>Filters</h3>
      <button 
        class="close-btn"
        onclick={closePanel}
        aria-label="Close filters"
      >
        ✕
      </button>
    </div>
    
    <div class="panel-body">
      <!-- Search -->
      <div class="filter-group">
        <label for="search">Search</label>
        <input
          id="search"
          type="text"
          placeholder="Search ingredients..."
          bind:value={searchQuery}
          class="filter-input"
          oninput={handleFilterChange}
        />
      </div>
      
      <!-- Category -->
      <div class="filter-group">
        <label for="category">Category</label>
        <select 
          id="category"
          bind:value={selectedCategory} 
          class="filter-select"
          onchange={handleFilterChange}
        >
          {#each CATEGORIES as category}
            <option value={category}>
              {category === 'ALL' ? 'All Categories' : category.replace(/_/g, ' ')}
            </option>
          {/each}
        </select>
      </div>
      
      <!-- Health System -->
      <div class="filter-group">
        <label for="health-system">Health System</label>
        <select 
          id="health-system"
          bind:value={selectedHealthSystem} 
          class="filter-select"
          onchange={handleFilterChange}
        >
          {#each healthSystems as system}
            <option value={system}>
              {system === 'ALL' ? 'All Systems' : system}
            </option>
          {/each}
        </select>
      </div>
      
      <!-- Differences Filter -->
      <div class="filter-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            bind:checked={showOnlyWithDiffs}
            onchange={handleFilterChange}
          />
          <span>Show only with differences</span>
        </label>
      </div>
      
      <!-- Action Buttons -->
      <div class="filter-actions">
        <button
          class="action-btn secondary"
          onclick={clearAllFilters}
        >
          Clear All
        </button>
        <button
          class="action-btn primary"
          onclick={onFindVariations}
        >
          Find Variations
        </button>
      </div>
    </div>
    
    {#if activeFilters > 0}
      <div class="active-filters">
        <span class="active-label">Active filters: {activeFilters}</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  @import '../../styles/ingredientDesignSystem.css';
  
  /* Trigger Button - Minimal and Elegant */
  .filter-trigger {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    z-index: 100;
    
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: var(--radius-full);
    
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    cursor: pointer;
    
    box-shadow: var(--shadow-elevation-low);
    transition: all var(--duration-base) var(--ease-out);
  }
  
  .filter-trigger:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-elevation-medium);
    background: rgba(255, 255, 255, 0.95);
  }
  
  .filter-trigger.active {
    background: rgb(var(--color-primary-rgb));
    color: white;
    border-color: rgb(var(--color-primary-rgb));
  }
  
  .filter-icon {
    font-size: 1rem;
  }
  
  .filter-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 var(--space-2);
    background: rgb(var(--color-primary-rgb));
    color: white;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-bold);
  }
  
  .filter-trigger.active .filter-count {
    background: white;
    color: rgb(var(--color-primary-rgb));
  }
  
  /* Backdrop */
  .filter-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    z-index: 200;
  }
  
  /* Floating Panel */
  .filter-panel {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: 320px;
    max-width: 90vw;
    
    background: var(--glass-bg-heavy);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-left: 1px solid var(--glass-border);
    
    display: flex;
    flex-direction: column;
    z-index: 201;
    box-shadow: var(--shadow-elevation-high);
  }
  
  /* Panel Header */
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-6);
    border-bottom: 1px solid var(--glass-border);
  }
  
  .panel-header h3 {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }
  
  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--text-lg);
    color: var(--color-text-secondary);
    transition: all var(--duration-base) var(--ease-out);
  }
  
  .close-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text-primary);
  }
  
  /* Panel Body */
  .panel-body {
    flex: 1;
    padding: var(--space-6);
    overflow-y: auto;
  }
  
  .filter-group {
    margin-bottom: var(--space-6);
  }
  
  .filter-group label {
    display: block;
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }
  
  .filter-input,
  .filter-select {
    width: 100%;
    padding: var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    font-size: var(--text-sm);
    transition: all var(--duration-base) var(--ease-out);
  }
  
  .filter-input:focus,
  .filter-select:focus {
    outline: none;
    border-color: rgb(var(--color-primary-rgb));
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    font-size: var(--text-sm);
    color: var(--color-text-primary);
  }
  
  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }
  
  /* Action Buttons */
  .filter-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-8);
  }
  
  .action-btn {
    flex: 1;
    padding: var(--space-3);
    border: none;
    border-radius: var(--radius-lg);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--duration-base) var(--ease-out);
  }
  
  .action-btn.secondary {
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--glass-border);
  }
  
  .action-btn.secondary:hover {
    background: var(--color-surface-hover);
  }
  
  .action-btn.primary {
    background: rgb(var(--color-primary-rgb));
    color: white;
  }
  
  .action-btn.primary:hover {
    background: rgba(var(--color-primary-rgb), 0.9);
    transform: translateY(-1px);
    box-shadow: var(--shadow-elevation-low);
  }
  
  /* Active Filters Indicator */
  .active-filters {
    padding: var(--space-4);
    background: rgba(var(--color-primary-rgb), 0.1);
    border-top: 1px solid var(--glass-border);
  }
  
  .active-label {
    font-size: var(--text-sm);
    color: rgb(var(--color-primary-rgb));
    font-weight: var(--font-weight-medium);
  }
  
  /* Dark Theme */
  :global([data-theme="dark"]) .filter-trigger {
    background: rgba(31, 41, 55, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--color-text-primary);
  }
  
  :global([data-theme="dark"]) .filter-panel {
    background: rgba(17, 24, 39, 0.95);
    border-left-color: rgba(255, 255, 255, 0.1);
  }
  
  /* Mobile Adjustments */
  @media (max-width: 640px) {
    .filter-trigger {
      bottom: var(--space-4);
      top: auto;
    }
    
    .filter-panel {
      width: 100vw;
      max-width: 100vw;
    }
  }
</style>