<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ingredientService, type Ingredient } from '$lib/services/ingredientService';
  import IngredientImportModal from './IngredientImportModal.svelte';
  import IngredientExportModal from './IngredientExportModal.svelte';
  import type { Section } from '$lib/types';
  
  export let show = false;
  export let ingredients: Ingredient[] = [];
  export let sectionsMap: Map<string, Section[]> = new Map();
  
  const dispatch = createEventDispatcher();
  
  let showImportModal = false;
  let showExportModal = false;
  let searchQuery = '';
  let filterType: Ingredient['TYPE'] | 'all' = 'all';
  
  $: filteredIngredients = filterIngredients(ingredients, searchQuery, filterType);
  $: ingredientStats = calculateStats(ingredients);

  function filterIngredients(items: Ingredient[], query: string, type: typeof filterType): Ingredient[] {
    let filtered = items;
    
    if (type !== 'all') {
      filtered = filtered.filter(ing => ing.TYPE === type);
    }
    
    if (query) {
      filtered = ingredientService.searchIngredients(filtered, query);
    }
    
    return filtered;
  }

  function calculateStats(items: Ingredient[]) {
    const stats = {
      total: items.length,
      byType: new Map<string, number>()
    };
    
    for (const item of items) {
      const count = stats.byType.get(item.TYPE) || 0;
      stats.byType.set(item.TYPE, count + 1);
    }
    
    return stats;
  }

  function handleImport(event: CustomEvent) {
    const { ingredients: imported, results } = event.detail;
    
    // Merge imported ingredients with existing
    const updatedIngredients = [...ingredients];
    for (const ingredient of imported) {
      const existingIndex = updatedIngredients.findIndex(ing => ing.KEYNAME === ingredient.KEYNAME);
      if (existingIndex >= 0) {
        updatedIngredients[existingIndex] = ingredient;
      } else {
        updatedIngredients.push(ingredient);
      }
    }
    
    ingredients = updatedIngredients;
    
    dispatch('update', { ingredients });
    
    // Show success message
    const successCount = results.filter((r: any) => r.success).length;
    if (successCount > 0) {
      dispatch('message', {
        type: 'success',
        text: `Successfully imported ${successCount} ingredient${successCount !== 1 ? 's' : ''}`
      });
    }
  }

  function handleExport(event: CustomEvent) {
    const { count } = event.detail;
    dispatch('message', {
      type: 'success',
      text: `Exported ${count} ingredient${count !== 1 ? 's' : ''}`
    });
  }

  function deleteIngredient(keyname: string) {
    if (confirm(`Are you sure you want to delete "${keyname}"?`)) {
      ingredients = ingredients.filter(ing => ing.KEYNAME !== keyname);
      dispatch('update', { ingredients });
      dispatch('message', {
        type: 'info',
        text: `Deleted ingredient: ${keyname}`
      });
    }
  }

  function close() {
    show = false;
    showImportModal = false;
    showExportModal = false;
  }
</script>

{#if show}
  <div class="manager-backdrop" on:click={close}>
    <div class="manager-content" on:click|stopPropagation>
      <div class="manager-header">
        <div class="header-top">
          <h2>Manage Ingredients</h2>
          <button on:click={close} class="btn-icon variant-filled-surface">
            <span>✕</span>
          </button>
        </div>
        
        <div class="header-stats">
          <div class="stat">
            <span class="stat-value">{ingredientStats.total}</span>
            <span class="stat-label">Total Ingredients</span>
          </div>
          {#each Array.from(ingredientStats.byType.entries()) as [type, count]}
            <div class="stat">
              <span class="stat-value">{count}</span>
              <span class="stat-label">{type}</span>
            </div>
          {/each}
        </div>
      </div>
      
      <div class="manager-toolbar">
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
        
        <div class="actions">
          <button
            on:click={() => showImportModal = true}
            class="btn variant-filled-surface"
          >
            Import
          </button>
          <button
            on:click={() => showExportModal = true}
            disabled={ingredients.length === 0}
            class="btn variant-filled-primary"
          >
            Export
          </button>
        </div>
      </div>
      
      <div class="manager-body">
        {#if filteredIngredients.length === 0}
          <div class="empty-state">
            {#if ingredients.length === 0}
              <p>No ingredients loaded. Import ingredients to get started.</p>
            {:else}
              <p>No ingredients match your search criteria.</p>
            {/if}
          </div>
        {:else}
          <div class="ingredient-table">
            <table class="table">
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Key Name</th>
                  <th>Mnemonic</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredIngredients as ingredient}
                  <tr>
                    <td>{ingredient.DISPLAY}</td>
                    <td class="monospace">{ingredient.KEYNAME}</td>
                    <td class="monospace">{ingredient.MNEMONIC}</td>
                    <td>
                      <span class="badge variant-soft-{ingredient.TYPE === 'Macronutrient' ? 'primary' : ingredient.TYPE === 'Micronutrient' ? 'secondary' : 'surface'}">
                        {ingredient.TYPE}
                      </span>
                    </td>
                    <td>{ingredient.UOM_DISP}</td>
                    <td>{ingredient.NOTE?.length || 0}</td>
                    <td>
                      <button
                        on:click={() => deleteIngredient(ingredient.KEYNAME)}
                        class="btn-icon variant-filled-error btn-icon-sm"
                        title="Delete"
                      >
                        <span>🗑</span>
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>
  </div>
  
  <IngredientImportModal
    bind:show={showImportModal}
    existingIngredients={ingredients}
    on:import={handleImport}
  />
  
  <IngredientExportModal
    bind:show={showExportModal}
    {ingredients}
    {sectionsMap}
    on:export={handleExport}
  />
{/if}

<style lang="scss">
  .manager-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 998;
  }
  
  .manager-content {
    background: rgb(var(--color-surface-50));
    border-radius: 0.5rem;
    max-width: 1000px;
    width: 90%;
    height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
  
  .manager-header {
    padding: 1.5rem;
    border-bottom: 1px solid rgb(var(--color-surface-200));
  }
  
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    
    h2 {
      margin: 0;
      font-size: 1.5rem;
    }
  }
  
  .header-stats {
    display: flex;
    gap: 2rem;
    
    .stat {
      display: flex;
      flex-direction: column;
      
      .stat-value {
        font-size: 1.5rem;
        font-weight: 600;
        color: rgb(var(--color-primary-500));
      }
      
      .stat-label {
        font-size: 0.875rem;
        color: rgb(var(--color-surface-600));
      }
    }
  }
  
  .manager-toolbar {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgb(var(--color-surface-200));
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  
  .search-filter {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    max-width: 500px;
    
    input {
      flex: 1;
    }
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .manager-body {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
  }
  
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: rgb(var(--color-surface-600));
    font-size: 1.125rem;
  }
  
  .ingredient-table {
    .table {
      width: 100%;
      border-collapse: collapse;
      
      th {
        text-align: left;
        padding: 0.75rem;
        background: rgb(var(--color-surface-100));
        border-bottom: 2px solid rgb(var(--color-surface-300));
        font-weight: 600;
      }
      
      td {
        padding: 0.75rem;
        border-bottom: 1px solid rgb(var(--color-surface-200));
      }
      
      tbody tr:hover {
        background: rgb(var(--color-surface-50));
      }
    }
  }
  
  .monospace {
    font-family: monospace;
    font-size: 0.875rem;
  }
  
  .btn-icon-sm {
    padding: 0.25rem;
    font-size: 0.875rem;
  }
</style>