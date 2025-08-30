<script>
  import { TPN_VALID_KEYS, getKeyUnit, getKeyCategory } from './tpnLegacy.js';
  
  let { 
    onKeySelect = (key) => {},
    isExpanded = false,
    onToggle = () => {}
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
</script>

<div class="key-reference-panel {isExpanded ? 'expanded' : ''}">
  <div class="panel-header">
    <button 
      class="expand-toggle"
      onclick={onToggle}
      aria-expanded={isExpanded}
    >
      <span class="toggle-icon">{isExpanded ? '×' : '📚'}</span>
      {#if !isExpanded}
        <span class="collapsed-title">Key Reference</span>
      {/if}
    </button>
    {#if isExpanded}
      <h3>TPN Key Reference</h3>
    {/if}
  </div>
  
  {#if isExpanded}
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
  {/if}
</div>

<style>
  .key-reference-panel {
    position: fixed;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    background-color: #1e1e1e;
    border: 2px solid #444;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
    z-index: 100;
    max-height: 80vh;
    width: 60px;
  }
  
  .key-reference-panel.expanded {
    width: 320px;
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    border-bottom: 1px solid #444;
    background-color: #2a2a2a;
  }
  
  .expand-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    font-size: 1.2rem;
  }
  
  .toggle-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .collapsed-title {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 0.8rem;
    color: #999;
    margin-left: 0.25rem;
  }
  
  .panel-header h3 {
    margin: 0;
    font-size: 1rem;
    color: #17a2b8;
  }
  
  .panel-content {
    display: flex;
    flex-direction: column;
    height: calc(80vh - 60px);
  }
  
  .search-controls {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border-bottom: 1px solid #333;
  }
  
  .search-input {
    width: 100%;
    padding: 0.5rem;
    background-color: #1a1a1a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #d4d4d4;
    font-size: 0.9rem;
  }
  
  .category-filter {
    width: 100%;
    padding: 0.5rem;
    background-color: #1a1a1a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #d4d4d4;
    font-size: 0.9rem;
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
</style>