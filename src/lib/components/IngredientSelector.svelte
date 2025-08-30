<script lang="ts">
  import type { Ingredient } from '$lib/services/ingredientService';
  
  export let ingredients: Ingredient[] = [];
  export let selectedIngredients: Set<string> = new Set();
  export let onSelectionChange: (selected: Set<string>) => void = () => {};

  let searchQuery = '';
  let filterType: Ingredient['TYPE'] | 'all' = 'all';
  
  $: filteredIngredients = filterIngredients(ingredients, searchQuery, filterType);
  $: selectedCount = selectedIngredients.size;

  function filterIngredients(items: Ingredient[], query: string, type: typeof filterType): Ingredient[] {
    let filtered = items;
    
    // Filter by type
    if (type !== 'all') {
      filtered = filtered.filter(ing => ing.TYPE === type);
    }
    
    // Filter by search query
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(ing =>
        ing.DISPLAY.toLowerCase().includes(lowerQuery) ||
        ing.MNEMONIC.toLowerCase().includes(lowerQuery) ||
        ing.KEYNAME.toLowerCase().includes(lowerQuery)
      );
    }
    
    return filtered;
  }

  function toggleIngredient(keyname: string) {
    const newSelection = new Set(selectedIngredients);
    if (newSelection.has(keyname)) {
      newSelection.delete(keyname);
    } else {
      newSelection.add(keyname);
    }
    selectedIngredients = newSelection;
    onSelectionChange(newSelection);
  }

  function selectAll() {
    const newSelection = new Set(filteredIngredients.map(ing => ing.KEYNAME));
    selectedIngredients = newSelection;
    onSelectionChange(newSelection);
  }

  function selectNone() {
    selectedIngredients = new Set();
    onSelectionChange(selectedIngredients);
  }

  function isSelected(keyname: string): boolean {
    return selectedIngredients.has(keyname);
  }
</script>

<div class="ingredient-selector">
  <div class="selector-header">
    <div class="search-filter">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search ingredients..."
        class="input"
      />
      
      <select bind:value={filterType} class="select">
        <option value="all">All Types</option>
        <option value="Macronutrient">Macronutrient</option>
        <option value="Micronutrient">Micronutrient</option>
        <option value="Additive">Additive</option>
        <option value="Salt">Salt</option>
        <option value="Diluent">Diluent</option>
        <option value="Other">Other</option>
      </select>
    </div>
    
    <div class="selection-controls">
      <button on:click={selectAll} class="btn variant-filled-surface">
        Select All ({filteredIngredients.length})
      </button>
      <button on:click={selectNone} class="btn variant-filled-surface">
        Select None
      </button>
      <span class="selected-count">
        {selectedCount} selected
      </span>
    </div>
  </div>

  <div class="ingredient-list">
    {#if filteredIngredients.length === 0}
      <div class="no-results">
        No ingredients found matching your criteria
      </div>
    {:else}
      {#each filteredIngredients as ingredient}
        <div class="ingredient-item">
          <label class="ingredient-label">
            <input
              type="checkbox"
              checked={isSelected(ingredient.KEYNAME)}
              on:change={() => toggleIngredient(ingredient.KEYNAME)}
              class="checkbox"
            />
            <div class="ingredient-info">
              <div class="ingredient-name">
                {ingredient.DISPLAY}
              </div>
              <div class="ingredient-details">
                <span class="badge variant-soft">{ingredient.TYPE}</span>
                <span class="mnemonic">{ingredient.MNEMONIC}</span>
                <span class="uom">{ingredient.UOM_DISP}</span>
              </div>
            </div>
          </label>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style lang="scss">
  .ingredient-selector {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .selector-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgb(var(--color-surface-300));
  }

  .search-filter {
    display: flex;
    gap: 0.5rem;
    
    input {
      flex: 1;
    }
    
    select {
      min-width: 150px;
    }
  }

  .selection-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .selected-count {
    margin-left: auto;
    font-weight: 600;
    color: rgb(var(--color-primary-500));
  }

  .ingredient-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .no-results {
    padding: 2rem;
    text-align: center;
    color: rgb(var(--color-surface-500));
  }

  .ingredient-item {
    background: rgb(var(--color-surface-100));
    border-radius: 0.25rem;
    padding: 0.75rem;
    transition: background-color 0.2s;
    
    &:hover {
      background: rgb(var(--color-surface-200));
    }
  }

  .ingredient-label {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
  }

  .checkbox {
    margin-top: 0.125rem;
  }

  .ingredient-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .ingredient-name {
    font-weight: 500;
    color: rgb(var(--color-surface-900));
  }

  .ingredient-details {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .mnemonic {
    font-family: monospace;
    color: rgb(var(--color-surface-600));
  }

  .uom {
    color: rgb(var(--color-surface-500));
  }
</style>