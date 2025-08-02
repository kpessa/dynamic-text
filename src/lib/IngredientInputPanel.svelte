<script>
  import { getKeyCategory, getKeyUnit } from './tpnLegacy.js';
  
  let { 
    ingredients = [],
    values = {},
    onChange = () => {}
  } = $props();
  
  let isExpanded = $state(true);
  
  // Group ingredients by category
  let groupedIngredients = $derived.by(() => {
    const grouped = {};
    
    ingredients.forEach(key => {
      const category = getKeyCategory(key) || 'OTHER';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(key);
    });
    
    // Sort categories for consistent display
    const categoryOrder = [
      'BASIC_PARAMETERS',
      'MACRONUTRIENTS',
      'ELECTROLYTES',
      'ADDITIVES',
      'PREFERENCES',
      'OTHER'
    ];
    
    const sortedGrouped = {};
    categoryOrder.forEach(cat => {
      if (grouped[cat]) {
        sortedGrouped[cat] = grouped[cat].sort();
      }
    });
    
    return sortedGrouped;
  });
  
  function getCategoryLabel(category) {
    const labels = {
      'BASIC_PARAMETERS': 'Basic Parameters',
      'MACRONUTRIENTS': 'Macronutrients',
      'ELECTROLYTES': 'Electrolytes',
      'ADDITIVES': 'Additives',
      'PREFERENCES': 'Preferences',
      'ORDER_COMMENTS': 'Comments',
      'ROUTE': 'Administration Route',
      'OTHER': 'Other'
    };
    return labels[category] || category;
  }
  
  function handleInputChange(key, value) {
    // Convert to number for numeric inputs
    const numValue = parseFloat(value);
    onChange(key, isNaN(numValue) ? value : numValue);
  }
  
  function getInputType(key) {
    // Special cases for specific keys
    if (key === 'IVAdminSite') return 'select';
    if (key === 'prefKNa') return 'select';
    if (key === 'ratioCLAc') return 'select';
    if (key.includes('Comments') || key === 'OtherAdditives') return 'textarea';
    if (key.includes('checkbox')) return 'checkbox';
    
    return 'number';
  }
</script>

<div class="ingredient-input-panel {!isExpanded ? 'collapsed' : ''}">
  <div class="panel-header">
    <button 
      class="collapse-toggle"
      onclick={() => isExpanded = !isExpanded}
      aria-expanded={isExpanded}
    >
      <span class="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
      <h3>Referenced Ingredients</h3>
    </button>
    {#if ingredients.length > 0}
      <span class="ingredient-count">{ingredients.length} items</span>
    {/if}
  </div>
  
  {#if isExpanded}
    {#if ingredients.length === 0}
      <p class="no-ingredients">No ingredient references found in dynamic sections.</p>
    {:else}
      <div class="ingredient-categories">
      {#each Object.entries(groupedIngredients) as [category, keys]}
        <div class="ingredient-category">
          <h4>{getCategoryLabel(category)}</h4>
          <div class="input-grid">
            {#each keys as key}
              <div class="ingredient-input-field">
                <label for="ingredient-{key}">
                  {key}
                  {#if getKeyUnit(key)}
                    <span class="unit">({getKeyUnit(key)})</span>
                  {/if}
                </label>
                
                {#if getInputType(key) === 'select'}
                  {#if key === 'IVAdminSite'}
                    <select 
                      id="ingredient-{key}"
                      value={values[key] || 'Central'}
                      onchange={(e) => onChange(key, e.target.value)}
                    >
                      <option value="Central">Central</option>
                      <option value="Peripheral">Peripheral</option>
                    </select>
                  {:else if key === 'prefKNa'}
                    <select 
                      id="ingredient-{key}"
                      value={values[key] || 'Potassium'}
                      onchange={(e) => onChange(key, e.target.value)}
                    >
                      <option value="Potassium">Potassium</option>
                      <option value="Sodium">Sodium</option>
                    </select>
                  {:else if key === 'ratioCLAc'}
                    <select 
                      id="ingredient-{key}"
                      value={values[key] || '1ac:1ch'}
                      onchange={(e) => onChange(key, e.target.value)}
                    >
                      <option value="1ac:1ch">1:1</option>
                      <option value="2ac:1ch">2:1</option>
                      <option value="1ac:2ch">1:2</option>
                    </select>
                  {/if}
                {:else if getInputType(key) === 'textarea'}
                  <textarea
                    id="ingredient-{key}"
                    value={values[key] || ''}
                    oninput={(e) => onChange(key, e.target.value)}
                    rows="2"
                  />
                {:else if getInputType(key) === 'checkbox'}
                  <input
                    type="checkbox"
                    id="ingredient-{key}"
                    checked={values[key] || false}
                    onchange={(e) => onChange(key, e.target.checked)}
                  />
                {:else}
                  <input
                    type="number"
                    id="ingredient-{key}"
                    value={values[key] || 0}
                    step="0.1"
                    oninput={(e) => handleInputChange(key, e.target.value)}
                  />
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
  {/if}
</div>

<style>
  .ingredient-input-panel {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
    max-height: 300px;
    overflow-y: auto;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .ingredient-input-panel:not(.collapsed) .panel-header {
    margin-bottom: 1rem;
  }
  
  .collapse-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: inherit;
    flex: 1;
    text-align: left;
  }
  
  .collapse-toggle:hover {
    opacity: 0.8;
  }
  
  .toggle-icon {
    font-size: 0.8rem;
    color: #666;
    transition: transform 0.2s;
  }
  
  .collapse-toggle h3 {
    margin: 0;
    font-size: 1rem;
    color: #28a745;
  }
  
  .ingredient-count {
    font-size: 0.85rem;
    color: #666;
    padding: 0.2rem 0.5rem;
    background-color: #e8e8e8;
    border-radius: 12px;
  }
  
  .no-ingredients {
    color: #666;
    font-size: 0.9rem;
    text-align: center;
    padding: 1rem;
  }
  
  .ingredient-categories {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .ingredient-category h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: #17a2b8;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid #ddd;
  }
  
  .input-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  
  .ingredient-input-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .ingredient-input-field label {
    font-size: 0.85rem;
    color: #333;
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
  }
  
  .unit {
    font-size: 0.75rem;
    color: #666;
  }
  
  .ingredient-input-field input[type="number"],
  .ingredient-input-field input[type="text"],
  .ingredient-input-field select,
  .ingredient-input-field textarea {
    padding: 0.375rem 0.5rem;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 3px;
    color: #333;
    font-size: 0.9rem;
    width: 100%;
  }
  
  .ingredient-input-field input[type="checkbox"] {
    width: auto;
    margin-top: 0.25rem;
  }
  
  .ingredient-input-field input:focus,
  .ingredient-input-field select:focus,
  .ingredient-input-field textarea:focus {
    outline: none;
    border-color: #535bf2;
  }
  
  /* Scrollbar styling */
  .ingredient-input-panel::-webkit-scrollbar {
    width: 8px;
  }
  
  .ingredient-input-panel::-webkit-scrollbar-track {
    background: #f0f0f0;
  }
  
  .ingredient-input-panel::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
  }
  
  .ingredient-input-panel::-webkit-scrollbar-thumb:hover {
    background: #aaa;
  }
  
</style>