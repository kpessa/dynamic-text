<script>
  import { TPN_VALID_KEYS, getKeyUnit, getKeyCategory } from './tpnLegacy.js';
  
  let { 
    onKeySelect = (key) => {},
    onClose = () => {},
    isExpanded = $bindable(false)
  } = $props();
  
  let searchQuery = $state('');
  let selectedCategory = $state('ALL');
  
  // Get all categories
  const categories = ['ALL', ...Object.keys(TPN_VALID_KEYS)];
  
  // Get all keys with their info
  let allKeys = $derived.by(() => {
    const keys = [];
    Object.entries(TPN_VALID_KEYS).forEach(([category, categoryKeys]) => {
      categoryKeys.forEach(key => {
        keys.push({
          key,
          category,
          unit: getKeyUnit(key)
        });
      });
    });
    return keys;
  });
  
  // Filter keys based on search and category
  let filteredKeys = $derived.by(() => {
    let keys = allKeys;
    
    // Filter by category
    if (selectedCategory !== 'ALL') {
      keys = keys.filter(item => item.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      keys = keys.filter(item => 
        item.key.toLowerCase().includes(query) ||
        item.unit.toLowerCase().includes(query)
      );
    }
    
    return keys;
  });
  
  function getCategoryLabel(category) {
    const labels = {
      'ALL': 'All Keys',
      'BASIC_PARAMETERS': 'Basic',
      'MACRONUTRIENTS': 'Macros',
      'ELECTROLYTES': 'Electrolytes',
      'ADDITIVES': 'Additives',
      'PREFERENCES': 'Preferences',
      'CALCULATED_VOLUMES': 'Volumes',
      'CLINICAL_CALCULATIONS': 'Calculations',
      'SALTS': 'Salts',
      'WEIGHT_CALCULATIONS': 'Weight',
      'ORDER_COMMENTS': 'Comments',
      'ROUTE': 'Route',
      'RADIO_BUTTONS': 'Radio',
      'UI_ELEMENTS': 'UI',
      'LEGACY_ALIASES': 'Legacy'
    };
    return labels[category] || category;
  }
  
  function handleKeyClick(key) {
    onKeySelect(key);
  }
  
  function copyExample(key) {
    const example = `me.getValue('${key}')`;
    navigator.clipboard.writeText(example);
  }
  
  // Handle escape key to close panel
  $effect(() => {
    if (!isExpanded) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
        isExpanded = false;
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  });
</script>

{#if isExpanded}
  <div class="key-reference-panel">
    <div class="panel-header">
      <h3>
        <span class="header-icon">📚</span>
        TPN Key Reference
      </h3>
      <button 
        class="close-btn"
        onclick={() => { onClose(); isExpanded = false; }}
        aria-label="Close key reference"
      >
        ×
      </button>
    </div>
    
    <div class="panel-content">
      <div class="search-controls">
        <input
          type="text"
          placeholder="Search keys..."
          bind:value={searchQuery}
          class="search-input"
        />
        
        <select 
          bind:value={selectedCategory}
          class="category-filter"
        >
          {#each categories as category}
            <option value={category}>{getCategoryLabel(category)}</option>
          {/each}
        </select>
      </div>
      
      <div class="key-list">
        {#if filteredKeys.length === 0}
          <div class="no-results">No keys found matching "{searchQuery}"</div>
        {:else}
          {#each filteredKeys as item}
            <div class="key-item">
              <div class="key-info">
                <code class="key-name" title="Click to copy example">
                  {item.key}
                </code>
                {#if item.unit}
                  <span class="key-unit">({item.unit})</span>
                {/if}
              </div>
              <div class="key-actions">
                <button 
                  class="copy-btn"
                  onclick={() => copyExample(item.key)}
                  title="Copy me.getValue() example"
                >
                  📋
                </button>
                <button 
                  class="insert-btn"
                  onclick={() => handleKeyClick(item.key)}
                  title="Insert into editor"
                >
                  ➕
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
      
      <div class="panel-footer">
        <p class="usage-hint">
          Usage: <code>me.getValue('KeyName')</code>
        </p>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  @use '../styles/abstracts/variables' as *;
  @use '../styles/abstracts/mixins' as *;
  
  .key-reference-panel {
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-2xl);
    overflow: hidden;
    transition: all var(--transition-base);
    position: fixed;
    width: 380px;
    max-height: 600px;
    right: var(--spacing-lg);
    bottom: var(--spacing-lg);
    z-index: 8500; /* Below KPT Reference (9000) but above most UI */
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    animation: key-panel-enter var(--transition-base);
    
    @include mobile {
      width: calc(100% - 40px);
      left: 20px;
      right: 20px;
      max-height: 400px;
    }
    
    // Gradient border effect
    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      padding: 2px;
      background: linear-gradient(135deg, var(--color-success), transparent);
      border-radius: inherit;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: subtract;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: source-out;
      z-index: -1;
    }
  }
  
  .panel-header {
    background: linear-gradient(135deg, 
      var(--color-surface) 0%, 
      var(--color-success-light) 100%);
    border-bottom: 1px solid var(--color-border);
    padding: var(--spacing-md) var(--spacing-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: var(--spacing-md);
      right: var(--spacing-md);
      height: 2px;
      background: linear-gradient(90deg, 
        var(--color-success) 0%, 
        var(--color-success-light) 100%);
      border-radius: var(--radius-full);
    }
    
    h3 {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      
      .header-icon {
        font-size: var(--font-size-base);
        filter: drop-shadow(0 0 4px rgba(34, 197, 94, 0.3));
      }
    }
  }
  
  .close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid var(--color-border);
    font-size: var(--font-size-lg);
    color: var(--color-text-muted);
    cursor: pointer;
    padding: var(--spacing-sm);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
      color: var(--color-text);
      transform: scale(1.05);
    }
    
    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }
  }
  
  .panel-content {
    padding: var(--spacing-lg);
    max-height: 500px;
    overflow-y: auto;
    
    // Custom scrollbar
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: var(--color-surface);
    }
    
    &::-webkit-scrollbar-thumb {
      background: var(--color-border-strong);
      border-radius: var(--radius-sm);
      
      &:hover {
        background: var(--color-text-muted);
      }
    }
  }
  
  .search-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    
    .search-input {
      width: 100%;
      padding: var(--spacing-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      background: var(--color-background);
      transition: all var(--transition-fast);
      
      &:focus {
        outline: none;
        border-color: var(--color-success);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
      }
    }
    
    .category-filter {
      padding: var(--spacing-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-background);
      font-size: var(--font-size-sm);
      cursor: pointer;
      
      &:focus {
        outline: none;
        border-color: var(--color-success);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
      }
    }
  }
  
  .key-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }
  
  .no-results {
    text-align: center;
    padding: 2rem 1rem;
    color: #999;
    font-size: 0.9rem;
  }
  
  .key-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    margin-bottom: 0.25rem;
    background-color: #2a2a2a;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .key-item:hover {
    background-color: #3a3a3a;
  }
  
  .key-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  
  .key-name {
    font-family: monospace;
    font-size: 0.85rem;
    color: #ffc107;
    cursor: pointer;
  }
  
  .key-unit {
    font-size: 0.75rem;
    color: #999;
  }
  
  .key-actions {
    display: flex;
    gap: 0.25rem;
  }
  
  .copy-btn,
  .insert-btn {
    padding: 0.25rem 0.5rem;
    background-color: #444;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
  }
  
  .copy-btn:hover {
    background-color: #555;
  }
  
  .insert-btn:hover {
    background-color: #646cff;
  }
  
  .panel-footer {
    padding: 0.75rem;
    border-top: 1px solid #333;
    background-color: #2a2a2a;
  }
  
  .usage-hint {
    margin: 0;
    font-size: 0.8rem;
    color: #999;
    text-align: center;
  }
  
  .usage-hint code {
    background-color: #1a1a1a;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    color: #17a2b8;
  }
  
  @media (prefers-color-scheme: light) {
    .key-reference-panel {
      background-color: #f5f5f5;
      border-color: #ddd;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .panel-header {
      background-color: #fff;
      border-bottom-color: #ddd;
    }
    
    .search-input,
    .category-filter {
      background-color: #fff;
      border-color: #ddd;
      color: #333;
    }
    
    .key-item {
      background-color: #fff;
    }
    
    .key-item:hover {
      background-color: #f9f9f9;
    }
    
    .copy-btn,
    .insert-btn {
      background-color: #e0e0e0;
    }
    
    .copy-btn:hover,
    .insert-btn:hover {
      background-color: #d0d0d0;
    }
    
    .panel-footer {
      background-color: #fff;
      border-top-color: #ddd;
    }
  }
  
  // Animation
  @keyframes key-panel-enter {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>