<script lang="ts">
  import type { KPTNamespace } from './kptNamespace.js';
  
  let { 
    onFunctionSelect = (func) => {},
    isExpanded = false,
    onClose = () => {},
    position = 'bottom-right' // 'bottom-right', 'bottom-left', 'sidebar'
  } = $props();
  
  let searchQuery = $state('');
  let selectedCategory = $state('ALL');
  
  // Import the KPT functions from the namespace
  import { getAllKPTFunctions } from './kptNamespace.js';
  
  // Get all functions (built-in + custom)
  let allKPTFunctions = $derived(() => {
    try {
      const { builtin, custom } = getAllKPTFunctions();
      
      // Convert built-in functions to the same format as the reference
      const builtInFormatted = Object.entries(builtin).map(([name, info]) => ({
        category: getCategoryFromName(name),
        name,
        description: info.description,
        example: `${name}(${getExampleParams(name)})`,
        params: info.params
      }));
      
      // Convert custom functions to reference format
      const customFormatted = custom.map(func => ({
        category: 'CUSTOM',
        name: func.name,
        description: func.description || 'Custom function',
        example: `${func.name}(${func.parameters})`,
        params: func.parameters || ''
      }));
      
      // Filter out custom functions that duplicate built-in names
      const builtInNames = new Set(builtInFormatted.map(f => f.name));
      const uniqueCustom = customFormatted.filter(func => !builtInNames.has(func.name));
      
      return [...builtInFormatted, ...uniqueCustom];
    } catch (error) {
      console.warn('Failed to load KPT functions:', error);
      return legacyKptFunctions;
    }
  });
  
  // Helper functions
  function getCategoryFromName(name) {
    if (['redText', 'greenText', 'blueText', 'boldText', 'italicText', 'highlightText'].includes(name)) return 'TEXT_FORMATTING';
    if (['roundTo', 'formatNumber', 'formatPercent', 'formatCurrency'].includes(name)) return 'NUMBER_FORMATTING';
    if (['formatWeight', 'formatVolume', 'formatDose', 'formatConcentration'].includes(name)) return 'TPN_FORMATTING';
    if (['showIf', 'hideIf', 'whenAbove', 'whenBelow', 'whenInRange'].includes(name)) return 'CONDITIONAL';
    if (['checkRange', 'isNormal', 'isCritical'].includes(name)) return 'VALIDATION';
    if (['createTable', 'createList', 'createAlert'].includes(name)) return 'HTML_BUILDERS';
    if (['capitalize', 'pluralize', 'abbreviate'].includes(name)) return 'UTILITIES';
    if (['clamp', 'percentage', 'ratio'].includes(name)) return 'MATH';
    if (['weight', 'age', 'volume', 'protein', 'calories'].includes(name)) return 'ALIASES';
    return 'OTHER';
  }
  
  function getExampleParams(name) {
    const examples = {
      redText: '"Critical Value"',
      greenText: '"Normal Range"',
      blueText: '"Information"',
      boldText: '"Important"',
      italicText: '"Note"',
      highlightText: '"Alert", "#ffcc00"',
      roundTo: '3.14159, 2',
      formatNumber: '123.456, 1',
      formatPercent: '85.5',
      formatCurrency: '45.50, "$"',
      formatWeight: 'kpt.weight',
      formatVolume: 'kpt.volume',
      formatDose: '2.5',
      formatConcentration: '0.125',
      showIf: 'kpt.weight > 10, "Adult dosing"',
      hideIf: 'kpt.age < 18, "Pediatric only"',
      whenAbove: 'kpt.volume, 1000, "High volume"',
      whenBelow: 'kpt.protein, 2.0, "Low protein"',
      whenInRange: 'kpt.calories, 20, 30, "Normal range"',
      checkRange: 'kpt.volume, [100, 200], [50, 300]',
      isNormal: 'kpt.weight, 10, 100',
      isCritical: 'kpt.volume, 0, 500',
      createTable: '[[1,2],[3,4]], ["A","B"]',
      createList: '["Item 1", "Item 2"], true',
      createAlert: '"Warning message", "warning"',
      capitalize: '"hello world"',
      pluralize: '2, "item", "items"',
      abbreviate: '"Long text here", 10',
      clamp: '150, 0, 100',
      percentage: '25, 100',
      ratio: '6, 9',
      weight: '',
      age: '',
      volume: '',
      protein: '',
      calories: ''
    };
    return examples[name] || '';
  }
  
  // Legacy KPT function documentation (keep for reference)
  const legacyKptFunctions = [
    // Text formatting functions
    { category: 'TEXT_FORMATTING', name: 'redText', description: 'Display text in red with bold styling', example: 'redText("Critical Value")', params: 'text: string | number' },
    { category: 'TEXT_FORMATTING', name: 'greenText', description: 'Display text in green with bold styling', example: 'greenText("Normal Range")', params: 'text: string | number' },
    { category: 'TEXT_FORMATTING', name: 'blueText', description: 'Display text in blue with bold styling', example: 'blueText("Information")', params: 'text: string | number' },
    { category: 'TEXT_FORMATTING', name: 'boldText', description: 'Make text bold', example: 'boldText("Important")', params: 'text: string | number' },
    { category: 'TEXT_FORMATTING', name: 'italicText', description: 'Make text italic', example: 'italicText("Note")', params: 'text: string | number' },
    { category: 'TEXT_FORMATTING', name: 'highlightText', description: 'Highlight text with background color', example: 'highlightText("Alert", "#ffcc00")', params: 'text: string | number, color?: string' },
    
    // Number formatting functions
    { category: 'NUMBER_FORMATTING', name: 'roundTo', description: 'Round number to specified decimal places', example: 'roundTo(3.14159, 2)', params: 'num: number, decimals?: number' },
    { category: 'NUMBER_FORMATTING', name: 'formatNumber', description: 'Format number with specified decimals', example: 'formatNumber(123.456, 1)', params: 'num: number, decimals?: number' },
    { category: 'NUMBER_FORMATTING', name: 'formatPercent', description: 'Format number as percentage', example: 'formatPercent(85.5)', params: 'num: number, decimals?: number' },
    { category: 'NUMBER_FORMATTING', name: 'formatCurrency', description: 'Format number as currency', example: 'formatCurrency(45.50, "$")', params: 'num: number, currency?: string' },
    
    // TPN-specific formatting
    { category: 'TPN_FORMATTING', name: 'formatWeight', description: 'Format weight with units', example: 'formatWeight(kg.weight)', params: 'weight: number, unit?: string' },
    { category: 'TPN_FORMATTING', name: 'formatVolume', description: 'Format volume with units', example: 'formatVolume(kpt.volume)', params: 'volume: number, unit?: string' },
    { category: 'TPN_FORMATTING', name: 'formatDose', description: 'Format dose with units', example: 'formatDose(2.5)', params: 'dose: number, unit?: string' },
    { category: 'TPN_FORMATTING', name: 'formatConcentration', description: 'Format concentration as percentage', example: 'formatConcentration(0.125)', params: 'concentration: number' },
    
    // Conditional display functions
    { category: 'CONDITIONAL', name: 'showIf', description: 'Show content if condition is true', example: 'showIf(kpt.weight > 10, "Adult dosing")', params: 'condition: boolean, content: string' },
    { category: 'CONDITIONAL', name: 'hideIf', description: 'Hide content if condition is true', example: 'hideIf(kpt.age < 18, "Pediatric only")', params: 'condition: boolean, content: string' },
    { category: 'CONDITIONAL', name: 'whenAbove', description: 'Show content when value is above threshold', example: 'whenAbove(kpt.volume, 1000, "High volume")', params: 'value: number, threshold: number, content: string' },
    { category: 'CONDITIONAL', name: 'whenBelow', description: 'Show content when value is below threshold', example: 'whenBelow(kpt.protein, 2.0, "Low protein")', params: 'value: number, threshold: number, content: string' },
    { category: 'CONDITIONAL', name: 'whenInRange', description: 'Show content when value is in range', example: 'whenInRange(kpt.calories, 20, 30, "Normal range")', params: 'value: number, min: number, max: number, content: string' },
    
    // Range checking functions
    { category: 'VALIDATION', name: 'checkRange', description: 'Check if value is in normal/critical range', example: 'checkRange(kpt.volume, [100, 200], [50, 300])', params: 'value: number, normal?: [number, number], critical?: [number, number]' },
    { category: 'VALIDATION', name: 'isNormal', description: 'Check if value is in normal range', example: 'isNormal(kpt.weight, 10, 100)', params: 'value: number, min: number, max: number' },
    { category: 'VALIDATION', name: 'isCritical', description: 'Check if value is in critical range', example: 'isCritical(kpt.volume, 0, 500)', params: 'value: number, criticalMin: number, criticalMax: number' },
    
    // HTML building functions
    { category: 'HTML_BUILDERS', name: 'createTable', description: 'Create HTML table from data', example: 'createTable([[1,2],[3,4]], ["A","B"])', params: 'data: Array<Array<string | number>>, headers?: string[]' },
    { category: 'HTML_BUILDERS', name: 'createList', description: 'Create HTML list from items', example: 'createList(["Item 1", "Item 2"], true)', params: 'items: Array<string | number>, ordered?: boolean' },
    { category: 'HTML_BUILDERS', name: 'createAlert', description: 'Create styled alert box', example: 'createAlert("Warning message", "warning")', params: 'message: string, type?: "info" | "warning" | "error" | "success"' },
    
    // Utility functions
    { category: 'UTILITIES', name: 'capitalize', description: 'Capitalize first letter of text', example: 'capitalize("hello world")', params: 'text: string' },
    { category: 'UTILITIES', name: 'pluralize', description: 'Pluralize word based on count', example: 'pluralize(2, "item", "items")', params: 'count: number, singular: string, plural?: string' },
    { category: 'UTILITIES', name: 'abbreviate', description: 'Abbreviate text to max length', example: 'abbreviate("Long text here", 10)', params: 'text: string, maxLength: number' },
    
    // Math utilities
    { category: 'MATH', name: 'clamp', description: 'Constrain value between min and max', example: 'clamp(150, 0, 100)', params: 'value: number, min: number, max: number' },
    { category: 'MATH', name: 'percentage', description: 'Calculate percentage of part to total', example: 'percentage(25, 100)', params: 'part: number, total: number' },
    { category: 'MATH', name: 'ratio', description: 'Express two numbers as a ratio', example: 'ratio(6, 9)', params: 'a: number, b: number' },
    
    // Convenience aliases
    { category: 'ALIASES', name: 'weight', description: 'Current dose weight (DoseWeightKG)', example: 'kpt.weight', params: 'number (calculated)' },
    { category: 'ALIASES', name: 'age', description: 'Patient age', example: 'kpt.age', params: 'number (calculated)' },
    { category: 'ALIASES', name: 'volume', description: 'Total TPN volume', example: 'kpt.volume', params: 'number (calculated)' },
    { category: 'ALIASES', name: 'protein', description: 'Protein dose', example: 'kpt.protein', params: 'number (calculated)' },
    { category: 'ALIASES', name: 'calories', description: 'Total calories', example: 'kpt.calories', params: 'number (calculated)' }
  ];
  
  // Get all categories from all functions
  let categories = $derived(() => ['ALL', ...Array.from(new Set(allKPTFunctions().map(f => f.category)))]);
  
  // Filter functions based on search and category
  let filteredFunctions = $derived.by(() => {
    let functions = allKPTFunctions();
    
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
        func.params.toLowerCase().includes(query)
      );
    }
    
    return functions;
  });
  
  function getCategoryLabel(category) {
    const labels = {
      'ALL': 'All Functions',
      'TEXT_FORMATTING': 'Text Format',
      'NUMBER_FORMATTING': 'Number Format',
      'TPN_FORMATTING': 'TPN Format',
      'CONDITIONAL': 'Conditional',
      'VALIDATION': 'Validation',
      'HTML_BUILDERS': 'HTML Builders',
      'UTILITIES': 'Utilities',
      'MATH': 'Math',
      'ALIASES': 'Aliases'
    };
    return labels[category] || category;
  }
  
  function handleFunctionClick(funcName) {
    onFunctionSelect(funcName);
  }
  
  function copyExample(example) {
    navigator.clipboard.writeText(example);
  }
  
  function copyDestructuring() {
    const functionNames = filteredFunctions.map(f => f.name).join(', ');
    const destructuring = `let { ${functionNames} } = kpt;`;
    navigator.clipboard.writeText(destructuring);
  }
</script>

{#if isExpanded}
<div class="kpt-reference-panel">
  <div class="panel-header">
    <h3>KPT Function Reference</h3>
    <button 
      class="close-btn"
      onclick={onClose}
      aria-label="Close reference panel"
    >
      ×
    </button>
  </div>
  
    <div class="panel-content">
      <div class="search-section">
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
        
        <button onclick={copyDestructuring} class="copy-all-btn" title="Copy destructuring statement">
          📋 Copy All
        </button>
      </div>
      
      <div class="usage-hint">
        <strong>Usage:</strong> Add <code>let &#123; functionName &#125; = kpt;</code> at the start of your dynamic sections<br>
        <small>Custom functions are automatically available via <code>kpt.customFunctionName()</code></small>
      </div>
      
      <div class="functions-list">
        {#each filteredFunctions as func, index (func.category + '-' + func.name + '-' + index)}
          <div class="function-item">
            <div class="function-header">
              <button 
                class="function-name"
                onclick={() => handleFunctionClick(func.name)}
                title="Click to insert function name"
              >
                <code>{func.name}</code>
              </button>
              <span class="function-category">{getCategoryLabel(func.category)}</span>
            </div>
            
            <div class="function-description">
              {func.description}
            </div>
            
            <div class="function-params">
              <strong>Parameters:</strong> <code>{func.params}</code>
            </div>
            
            <div class="function-example">
              <strong>Example:</strong>
              <div class="example-code">
                <code>{func.example}</code>
                <button 
                  onclick={() => copyExample(func.example)}
                  class="copy-btn"
                  title="Copy example"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        {/each}
        
        {#if filteredFunctions.length === 0}
          <div class="no-results">
            No functions found matching your search criteria.
          </div>
        {/if}
      </div>
    </div>
</div>
{/if}

<style>
  .kpt-reference-panel {
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-2xl);
    overflow: hidden;
    transition: all var(--duration-normal) var(--ease-out);
    position: fixed;
    width: 380px;
    max-height: 600px;
    right: var(--space-6);
    bottom: var(--space-6);
    z-index: var(--z-modal);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    animation: kpt-panel-enter var(--duration-normal) var(--ease-out);
    border-image: linear-gradient(135deg, var(--color-primary-200), transparent) 1;
  }

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

  /* Mobile responsive */
  @media (max-width: 768px) {
    .kpt-reference-panel {
      width: calc(100% - 40px);
      left: 20px;
      right: 20px;
      max-height: 400px;
    }
  }

  .panel-header {
    background: linear-gradient(135deg, 
      var(--color-surface-elevated) 0%, 
      var(--color-primary-50) 100%);
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-4) var(--space-5);
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
  }

  .panel-header::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: var(--space-4);
    right: var(--space-4);
    height: 2px;
    background: linear-gradient(90deg, 
      var(--color-primary) 0%, 
      var(--color-primary-400) 100%);
    border-radius: var(--radius-full);
  }

  .panel-header h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .panel-header h3::before {
    content: '⚡';
    font-size: var(--font-size-base);
    filter: drop-shadow(0 0 4px rgba(0, 128, 255, 0.3));
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid var(--color-border-light);
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: var(--space-2);
    width: var(--min-touch-target);
    height: var(--min-touch-target);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .close-btn:hover {
    background: var(--color-state-hover);
    color: var(--color-text-primary);
    border-color: var(--color-border-medium);
    transform: scale(1.05);
  }

  .close-btn:focus {
    outline: var(--focus-ring);
    outline-offset: var(--focus-ring-offset);
  }

  .expand-toggle {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #495057;
    padding: 4px;
    border-radius: 4px;
  }

  .expand-toggle:hover {
    background: #e9ecef;
  }

  .toggle-icon {
    font-size: 16px;
  }

  .collapsed-title {
    font-weight: 500;
  }

  h3 {
    margin: 0;
    font-size: 16px;
    color: #343a40;
    flex: 1;
  }

  .panel-content {
    padding: 16px;
    height: calc(100% - 60px);
    overflow-y: auto;
  }

  .search-section {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .search-input {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    background: var(--color-surface);
    color: var(--color-text-primary);
    transition: all var(--transition-fast);
    min-width: 140px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 
      inset 0 1px 3px rgba(0, 0, 0, 0.05),
      0 0 0 3px rgba(0, 128, 255, 0.15);
    background: var(--color-surface-elevated);
  }

  .search-input::placeholder {
    color: var(--color-text-tertiary);
    font-style: italic;
  }

  .category-select {
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    background: var(--color-surface);
    color: var(--color-text-primary);
    transition: all var(--transition-fast);
    cursor: pointer;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .category-select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 
      inset 0 1px 3px rgba(0, 0, 0, 0.05),
      0 0 0 3px rgba(0, 128, 255, 0.15);
  }

  .category-select:hover {
    border-color: var(--color-border-medium);
    background: var(--color-surface-elevated);
  }

  .copy-all-btn {
    padding: var(--space-3) var(--space-4);
    background: linear-gradient(135deg, 
      var(--color-primary) 0%, 
      var(--color-primary-600) 100%);
    color: var(--color-text-inverse);
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .copy-all-btn:hover {
    background: linear-gradient(135deg, 
      var(--color-primary-600) 0%, 
      var(--color-primary-700) 100%);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .copy-all-btn:active {
    transform: translateY(0);
    box-shadow: var(--shadow-xs);
  }

  .usage-hint {
    background: #e7f3ff;
    border: 1px solid #b3d9ff;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 16px;
    font-size: 13px;
    color: #0c5aa6;
  }

  .usage-hint code {
    background: rgba(255, 255, 255, 0.8);
    padding: 2px 4px;
    border-radius: 2px;
    font-size: 12px;
  }

  .functions-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .function-item {
    background: var(--color-surface);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    transition: all var(--transition-fast);
    position: relative;
    overflow: hidden;
  }

  .function-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, 
      var(--color-primary-400) 0%, 
      var(--color-primary-200) 100%);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--transition-normal);
  }

  .function-item:hover {
    border-color: var(--color-primary-200);
    background: var(--color-surface-elevated);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .function-item:hover::before {
    transform: scaleX(1);
  }

  .function-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .function-name {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: 14px;
    font-weight: 600;
    color: #007bff;
  }

  .function-name:hover {
    text-decoration: underline;
  }

  .function-name code {
    background: none;
    padding: 0;
    color: inherit;
  }

  .function-category {
    font-size: 11px;
    background: #6c757d;
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
  }

  .function-description {
    font-size: 13px;
    color: #495057;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .function-params {
    font-size: 12px;
    color: #6c757d;
    margin-bottom: 8px;
  }

  .function-params code {
    background: #e9ecef;
    padding: 1px 4px;
    border-radius: 2px;
    font-size: 11px;
  }

  .function-example {
    font-size: 12px;
    color: #495057;
  }

  .example-code {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f1f3f4;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 6px 8px;
    margin-top: 4px;
  }

  .example-code code {
    background: none;
    padding: 0;
    font-size: 11px;
    color: #d63384;
    flex: 1;
  }

  .copy-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    color: #6c757d;
    border-radius: 2px;
    margin-left: 8px;
  }

  .copy-btn:hover {
    background: #e9ecef;
  }

  .no-results {
    text-align: center;
    color: #6c757d;
    font-style: italic;
    padding: 20px;
  }

  /* Scrollbar styling */
  .panel-content::-webkit-scrollbar {
    width: 6px;
  }

  .panel-content::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .panel-content::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  .panel-content::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>