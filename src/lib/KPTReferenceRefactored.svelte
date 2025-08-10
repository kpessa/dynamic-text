<script>
  import { getAllKPTFunctions } from './kptNamespace.ts';
  
  let { isOpen = $bindable(false), onClose = () => {} } = $props();
  
  let searchTerm = $state('');
  let selectedCategory = $state('all');
  let copied = $state('');
  
  // Get all KPT functions
  const kptData = getAllKPTFunctions();
  const allFunctions = [...(kptData.builtin || []), ...(kptData.custom || [])];
  
  // Categories
  const categories = [
    { value: 'all', label: 'All Functions' },
    { value: 'calculations', label: 'Calculations' },
    { value: 'validation', label: 'Validation' },
    { value: 'formatting', label: 'Formatting' },
    { value: 'utilities', label: 'Utilities' }
  ];
  
  // Filter functions
  const filteredFunctions = $derived(() => {
    let filtered = allFunctions;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(func => func.category === selectedCategory);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(func => 
        func.name.toLowerCase().includes(term) ||
        func.description?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  });
  
  function getCategoryLabel(category) {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.label : category;
  }
  
  async function copyFunction(functionName) {
    try {
      await navigator.clipboard.writeText(functionName);
      copied = functionName;
      setTimeout(() => copied = '', 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
  
  async function copyDestructuring() {
    const functionNames = filteredFunctions.map(f => f.name).join(', ');
    const destructuringCode = `const { ${functionNames} } = KPT;`;
    
    try {
      await navigator.clipboard.writeText(destructuringCode);
      copied = 'destructuring';
      setTimeout(() => copied = '', 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
  
  // Close on escape key
  $effect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        isOpen = false;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });
</script>

{#if isOpen}
  <div class="kpt-reference-panel">
    <div class="panel-header">
      <h3>
        <span class="header-icon">⚡</span>
        KPT Functions
      </h3>
      <button 
        class="close-btn"
        onclick={() => { onClose(); isOpen = false; }}
        aria-label="Close KPT reference"
      >
        ×
      </button>
    </div>
    
    <div class="panel-content">
      <div class="search-section">
        <input 
          type="text"
          placeholder="Search functions..."
          bind:value={searchTerm}
          class="search-input"
        />
        <select bind:value={selectedCategory} class="category-select">
          {#each categories as category}
            <option value={category.value}>{category.label}</option>
          {/each}
        </select>
        <button 
          onclick={copyDestructuring} 
          class="copy-all-btn" 
          title="Copy destructuring statement"
        >
          📋 Copy All
        </button>
      </div>
      
      <div class="usage-hint">
        Use these functions in your dynamic sections: <code>KPT.functionName()</code>
      </div>
      
      <div class="functions-list">
        {#each filteredFunctions as func}
          <div class="function-item">
            <div class="function-header">
              <button
                class="function-name"
                onclick={() => copyFunction(func.name)}
                title="Click to copy function name"
              >
                {func.name}
                {#if copied === func.name}
                  <span class="copied-indicator">✓</span>
                {/if}
              </button>
              <span class="function-category">{getCategoryLabel(func.category)}</span>
            </div>
            
            <div class="function-description">
              {func.description || 'No description available'}
            </div>
            
            {#if func.params && func.params.length > 0}
              <div class="function-params">
                <strong>Parameters:</strong> {func.params.join(', ')}
              </div>
            {/if}
            
            {#if func.example}
              <div class="function-example">
                <div class="example-label">Example:</div>
                <div class="example-code">
                  <code>{func.example}</code>
                  <button
                    class="copy-btn"
                    onclick={() => copyFunction(func.example)}
                    title="Copy example"
                  >
                    📋
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <div class="no-results">
            <p>No functions found matching "{searchTerm}"</p>
          </div>
        {/each}
      </div>
      
      {#if copied === 'destructuring'}
        <div class="copy-success">
          ✓ Destructuring statement copied to clipboard!
        </div>
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  @use '../styles/abstracts/variables' as *;
  @use '../styles/abstracts/mixins' as *;
  
  .kpt-reference-panel {
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
    z-index: 9000;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    animation: kpt-panel-enter var(--transition-base);
    
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
      background: linear-gradient(135deg, var(--color-primary), transparent);
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
      var(--color-primary-light) 100%);
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
        var(--color-primary) 0%, 
        var(--color-primary-light) 100%);
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
        filter: drop-shadow(0 0 4px rgba(0, 128, 255, 0.3));
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
  
  .search-section {
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
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
      }
    }
    
    .category-select {
      padding: var(--spacing-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-background);
      font-size: var(--font-size-sm);
      cursor: pointer;
      
      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
      }
    }
    
    .copy-all-btn {
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      
      &:hover {
        background: var(--color-primary-dark);
        transform: translateY(-1px);
      }
    }
  }
  
  .usage-hint {
    background: var(--color-info-bg);
    border: 1px solid var(--color-info);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--color-info-dark);
    margin-bottom: var(--spacing-md);
    
    code {
      background: rgba(var(--color-info-rgb), 0.2);
      padding: 2px 4px;
      border-radius: var(--radius-sm);
      font-family: var(--font-family-mono);
    }
  }
  
  .functions-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .function-item {
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    transition: all var(--transition-fast);
    
    &:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-md);
    }
  }
  
  .function-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
    
    .function-name {
      background: none;
      border: none;
      font-family: var(--font-family-mono);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-semibold);
      color: var(--color-primary);
      cursor: pointer;
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);
      position: relative;
      
      &:hover {
        background: var(--color-primary-bg);
        transform: scale(1.02);
      }
      
      .copied-indicator {
        color: var(--color-success);
        margin-left: var(--spacing-xs);
        font-size: var(--font-size-sm);
      }
    }
    
    .function-category {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      background: var(--color-surface);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
    }
  }
  
  .function-description {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    margin-bottom: var(--spacing-sm);
    line-height: 1.4;
  }
  
  .function-params {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--spacing-sm);
    
    strong {
      color: var(--color-text);
    }
  }
  
  .function-example {
    border-top: 1px solid var(--color-border);
    padding-top: var(--spacing-sm);
    
    .example-label {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
      margin-bottom: var(--spacing-xs);
    }
    
    .example-code {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: var(--spacing-sm);
      
      code {
        font-family: var(--font-family-mono);
        font-size: var(--font-size-xs);
        color: var(--color-text);
        flex: 1;
      }
      
      .copy-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: var(--spacing-xs);
        border-radius: var(--radius-sm);
        transition: all var(--transition-fast);
        
        &:hover {
          background: var(--color-surface-hover);
        }
      }
    }
  }
  
  .no-results {
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    padding: var(--spacing-xl);
    
    p {
      margin: 0;
    }
  }
  
  .copy-success {
    position: fixed;
    bottom: var(--spacing-lg);
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-success);
    color: white;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    animation: copy-success 3s ease-in-out forwards;
    z-index: 10000;
  }
  
  // Animations
  @keyframes kpt-panel-enter {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes copy-success {
    0% {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    10%, 90% {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
  }
  
  // Dark mode adjustments
  :global([data-theme="dark"]) {
    .kpt-reference-panel {
      background: var(--color-surface-dark);
      border-color: var(--color-border-dark);
    }
  }
</style>