<script lang="ts">
  import type { Ingredient } from '../models';
  import { ingredientStore } from '../stores/ingredientStore.svelte';
  import IngredientList from './IngredientList.svelte';
  import IngredientEditor from './IngredientEditor.svelte';
  import { onMount } from 'svelte';
  
  // Local state
  let showEditor = $state(false);
  let selectedIngredient = $state<Ingredient | null>(null);
  let splitRatio = $state(30); // 30% list, 70% editor
  let viewMode = $state<'split' | 'list' | 'editor'>('split');
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  // Subscribe to store
  onMount(() => {
    // Load ingredients on mount
    loadIngredients();
    
    // Subscribe to real-time updates
    const unsubscribe = ingredientStore.subscribeToUpdates();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  // Load ingredients
  async function loadIngredients() {
    isLoading = true;
    error = null;
    try {
      await ingredientStore.loadIngredients();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load ingredients';
      console.error('Failed to load ingredients:', err);
    } finally {
      isLoading = false;
    }
  }

  // Handle ingredient selection
  function handleSelect(ingredient: Ingredient) {
    selectedIngredient = ingredient;
    ingredientStore.selectIngredient(ingredient.id);
    showEditor = true;
    
    // Switch to split view if in list-only mode
    if (viewMode === 'list') {
      viewMode = 'split';
    }
  }

  // Handle ingredient edit
  function handleEdit(ingredient: Ingredient) {
    selectedIngredient = ingredient;
    showEditor = true;
    viewMode = 'split';
  }

  // Handle ingredient save
  async function handleSave(updated: Ingredient) {
    try {
      await ingredientStore.updateIngredient(updated.id, updated);
      selectedIngredient = updated;
      // Show success message
      console.log('Ingredient saved successfully');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save ingredient';
      console.error('Failed to save ingredient:', err);
    }
  }

  // Handle ingredient delete
  async function handleDelete(ingredientId: string) {
    try {
      await ingredientStore.deleteIngredient(ingredientId);
      if (selectedIngredient?.id === ingredientId) {
        selectedIngredient = null;
        showEditor = false;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete ingredient';
      console.error('Failed to delete ingredient:', err);
    }
  }

  // Handle editor cancel
  function handleCancel() {
    showEditor = false;
    // Keep selection but close editor
  }

  // Create new ingredient
  async function createNewIngredient() {
    const newIngredient: Ingredient = {
      id: '',
      keyname: 'NewIngredient',
      displayName: 'New Ingredient',
      category: 'Other',
      sections: [],
      tests: [],
      metadata: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    try {
      const id = await ingredientStore.createIngredient(newIngredient);
      newIngredient.id = id;
      selectedIngredient = newIngredient;
      showEditor = true;
      viewMode = 'split';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create ingredient';
      console.error('Failed to create ingredient:', err);
    }
  }

  // Toggle view mode
  function toggleViewMode() {
    if (viewMode === 'list') {
      viewMode = 'split';
    } else if (viewMode === 'split') {
      viewMode = 'editor';
    } else {
      viewMode = 'list';
    }
  }

  // Computed styles for split view
  const panelStyles = $derived(() => {
    if (viewMode === 'list') {
      return { list: '100%', editor: '0%' };
    } else if (viewMode === 'editor') {
      return { list: '0%', editor: '100%' };
    } else {
      return { list: `${splitRatio}%`, editor: `${100 - splitRatio}%` };
    }
  });
</script>

<div class="ingredient-panel">
  <!-- Panel Header -->
  <div class="panel-header">
    <div class="panel-title">
      <h2>📦 Ingredient Manager</h2>
      <span class="badge badge-primary">
        {ingredientStore.ingredientStats.total} ingredients
      </span>
    </div>
    <div class="panel-controls">
      <button
        onclick={createNewIngredient}
        class="btn btn-primary btn-sm"
        data-testid="new-ingredient"
      >
        + New Ingredient
      </button>
      <button
        onclick={loadIngredients}
        class="btn btn-ghost btn-sm"
        disabled={isLoading}
        data-testid="refresh"
      >
        {isLoading ? 'Loading...' : 'Refresh'}
      </button>
      <div class="view-toggle">
        <button
          onclick={() => viewMode = 'list'}
          class="btn btn-ghost btn-xs"
          class:btn-active={viewMode === 'list'}
          title="List only"
        >
          📋
        </button>
        <button
          onclick={() => viewMode = 'split'}
          class="btn btn-ghost btn-xs"
          class:btn-active={viewMode === 'split'}
          title="Split view"
        >
          ⚡
        </button>
        <button
          onclick={() => viewMode = 'editor'}
          class="btn btn-ghost btn-xs"
          class:btn-active={viewMode === 'editor'}
          title="Editor only"
        >
          ✏️
        </button>
      </div>
    </div>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="alert alert-error">
      <span>{error}</span>
      <button onclick={() => error = null} class="btn btn-ghost btn-xs">
        Dismiss
      </button>
    </div>
  {/if}

  <!-- Panel Content -->
  <div class="panel-content">
    {#if isLoading}
      <div class="loading-state">
        <div class="loading loading-spinner loading-lg"></div>
        <p>Loading ingredients...</p>
      </div>
    {:else}
      <div class="panel-split" style="grid-template-columns: {panelStyles.list} {panelStyles.editor}">
        <!-- List Panel -->
        {#if viewMode !== 'editor'}
          <div class="list-panel">
            <IngredientList
              ingredients={ingredientStore.filteredIngredients}
              selectedIngredientId={ingredientStore.selectedId}
              onSelect={handleSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        {/if}

        <!-- Splitter -->
        {#if viewMode === 'split'}
          <div 
            class="splitter"
            onmousedown={(e) => {
              const startX = e.clientX;
              const startRatio = splitRatio;
              const panelWidth = e.currentTarget.parentElement?.offsetWidth || 1000;
              
              function handleMouseMove(e: MouseEvent) {
                const deltaX = e.clientX - startX;
                const deltaRatio = (deltaX / panelWidth) * 100;
                splitRatio = Math.max(20, Math.min(80, startRatio + deltaRatio));
              }
              
              function handleMouseUp() {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              }
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        {/if}

        <!-- Editor Panel -->
        {#if viewMode !== 'list' && showEditor}
          <div class="editor-panel">
            <IngredientEditor
              ingredient={selectedIngredient}
              onSave={handleSave}
              onCancel={handleCancel}
              readOnly={false}
            />
          </div>
        {:else if viewMode !== 'list'}
          <div class="editor-panel empty">
            <div class="empty-state">
              <p>Select an ingredient to view or edit</p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .ingredient-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 1rem;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--base-200);
    border-radius: 0.5rem;
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .panel-title h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .panel-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .view-toggle {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--base-300);
    border-radius: 0.25rem;
  }

  .panel-content {
    flex: 1;
    overflow: hidden;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
  }

  .panel-split {
    display: grid;
    height: 100%;
    gap: 0;
    transition: grid-template-columns 0.2s;
  }

  .list-panel,
  .editor-panel {
    overflow: hidden;
    height: 100%;
  }

  .splitter {
    width: 4px;
    background: var(--base-300);
    cursor: col-resize;
    position: relative;
  }

  .splitter:hover {
    background: var(--primary);
  }

  .splitter::before {
    content: '';
    position: absolute;
    left: -4px;
    right: -4px;
    top: 0;
    bottom: 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--base-content-secondary);
  }

  .alert {
    margin: 0 1rem;
  }
</style>