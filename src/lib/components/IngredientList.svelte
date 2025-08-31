<script lang="ts">
  import type { Ingredient } from '../models';
  import { ingredientStore } from '../stores/ingredientStore.svelte';
  
  // Props with TypeScript
  let { 
    ingredients = [],
    selectedIngredientId = null,
    onSelect = (ingredient: Ingredient) => {},
    onEdit = (ingredient: Ingredient) => {},
    onDelete = (ingredientId: string) => {},
    class: className = ''
  } = $props();

  // Local state
  let searchQuery = $state('');
  let selectedCategory = $state<string | null>(null);
  let sortBy = $state<'name' | 'category' | 'modified'>('name');

  // Derived filtered ingredients
  const filteredIngredients = $derived(() => {
    let filtered = ingredients;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ing => 
        ing.displayName?.toLowerCase().includes(query) ||
        ing.keyname.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(ing => ing.category === selectedCategory);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'modified':
          return (b.metadata?.updatedAt || '').localeCompare(a.metadata?.updatedAt || '');
        case 'name':
        default:
          return (a.displayName || a.keyname).localeCompare(b.displayName || b.keyname);
      }
    });
  });

  // Extract unique categories
  const categories = $derived(() => {
    const cats = new Set<string>();
    ingredients.forEach(ing => {
      if (ing.category) cats.add(ing.category);
    });
    return Array.from(cats).sort();
  });

  // Get badge color based on ingredient state
  function getBadgeColor(ingredient: Ingredient): string {
    // Check if shared (has multiple references)
    const referenceCount = ingredient.metadata?.referenceCount || 0;
    if (referenceCount > 1) return 'badge-success'; // green for shared
    if (ingredient.metadata?.isModified) return 'badge-warning'; // orange for modified
    return 'badge-info'; // blue for unique
  }

  // Get badge text
  function getBadgeText(ingredient: Ingredient): string {
    const referenceCount = ingredient.metadata?.referenceCount || 0;
    if (referenceCount > 1) return `Shared (${referenceCount})`;
    if (ingredient.metadata?.isModified) return 'Modified';
    return 'Unique';
  }

  // Handle selection
  function handleSelect(ingredient: Ingredient) {
    onSelect(ingredient);
  }

  // Clear filters
  function clearFilters() {
    searchQuery = '';
    selectedCategory = null;
  }
</script>

<div class="ingredient-list {className}">
  <!-- Search and Filter Bar -->
  <div class="list-controls">
    <div class="search-bar">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search ingredients..."
        class="input input-bordered w-full"
        data-testid="ingredient-search"
      />
    </div>

    <div class="filter-controls">
      <select
        bind:value={selectedCategory}
        class="select select-bordered"
        data-testid="category-filter"
      >
        <option value={null}>All Categories</option>
        {#each categories as category}
          <option value={category}>{category}</option>
        {/each}
      </select>

      <select
        bind:value={sortBy}
        class="select select-bordered"
        data-testid="sort-by"
      >
        <option value="name">Sort by Name</option>
        <option value="category">Sort by Category</option>
        <option value="modified">Sort by Modified</option>
      </select>

      {#if searchQuery || selectedCategory}
        <button
          onclick={clearFilters}
          class="btn btn-ghost btn-sm"
          data-testid="clear-filters"
        >
          Clear Filters
        </button>
      {/if}
    </div>

    <div class="result-count">
      Showing {filteredIngredients.length} of {ingredients.length} ingredients
    </div>
  </div>

  <!-- Ingredient List -->
  <div class="list-container">
    {#if filteredIngredients.length === 0}
      <div class="empty-state">
        {#if searchQuery || selectedCategory}
          <p>No ingredients match your filters.</p>
          <button onclick={clearFilters} class="btn btn-primary btn-sm">
            Clear Filters
          </button>
        {:else}
          <p>No ingredients available.</p>
        {/if}
      </div>
    {:else}
      <div class="ingredient-items">
        {#each filteredIngredients as ingredient (ingredient.id)}
          <div
            class="ingredient-item"
            class:selected={ingredient.id === selectedIngredientId}
            onclick={() => handleSelect(ingredient)}
            data-testid="ingredient-item"
          >
            <div class="item-header">
              <div class="item-title">
                <span class="ingredient-icon">📦</span>
                <span class="ingredient-name">{ingredient.displayName || ingredient.keyname}</span>
              </div>
              <div class="item-badges">
                <span 
                  class="badge {getBadgeColor(ingredient)}"
                  data-testid="badge-{getBadgeColor(ingredient).replace('badge-', '')}"
                >
                  {getBadgeText(ingredient)}
                </span>
                {#if ingredient.category}
                  <span class="badge badge-secondary">{ingredient.category}</span>
                {/if}
              </div>
            </div>

            <div class="item-meta">
              {#if ingredient.sections?.length}
                <span class="meta-item">
                  {ingredient.sections.length} section{ingredient.sections.length !== 1 ? 's' : ''}
                </span>
              {/if}
              {#if ingredient.tests?.length}
                <span class="meta-item">
                  {ingredient.tests.length} test{ingredient.tests.length !== 1 ? 's' : ''}
                </span>
              {/if}
              {#if ingredient.metadata?.updatedAt}
                <span class="meta-item">
                  Modified: {new Date(ingredient.metadata.updatedAt).toLocaleDateString()}
                </span>
              {/if}
            </div>

            <div class="item-actions">
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  onEdit(ingredient);
                }}
                class="btn btn-ghost btn-xs"
                data-testid="edit-button"
              >
                Edit
              </button>
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${ingredient.displayName || ingredient.keyname}?`)) {
                    onDelete(ingredient.id);
                  }
                }}
                class="btn btn-ghost btn-xs text-error"
                data-testid="delete-button"
              >
                Delete
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .ingredient-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 1rem;
  }

  .list-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--base-200);
    border-radius: 0.5rem;
  }

  .search-bar {
    width: 100%;
  }

  .filter-controls {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .result-count {
    font-size: 0.875rem;
    color: var(--base-content-secondary);
    margin-top: 0.5rem;
  }

  .list-container {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: var(--base-content-secondary);
  }

  .ingredient-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .ingredient-item {
    padding: 1rem;
    background: var(--base-100);
    border: 1px solid var(--base-300);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .ingredient-item:hover {
    background: var(--base-200);
    border-color: var(--primary);
  }

  .ingredient-item.selected {
    background: var(--primary-focus);
    border-color: var(--primary);
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .item-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .ingredient-icon {
    font-size: 1.25rem;
  }

  .item-badges {
    display: flex;
    gap: 0.25rem;
  }

  .badge-success {
    background-color: rgb(34, 197, 94);
    color: white;
  }

  .badge-info {
    background-color: rgb(59, 130, 246);
    color: white;
  }

  .badge-warning {
    background-color: rgb(251, 146, 60);
    color: white;
  }

  .item-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--base-content-secondary);
    margin-bottom: 0.5rem;
  }

  .item-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
</style>