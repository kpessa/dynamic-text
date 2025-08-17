<script>
  import { onMount, onDestroy } from 'svelte';
  import { isFirebaseConfigured } from './firebase.js';
  import { referenceService, POPULATION_TYPES } from './firebaseDataService.js';
  
  // Import stores
  import { ingredientStore } from './stores/ingredientStore.js';
  import { ingredientFiltersStore } from './stores/ingredientFiltersStore.js';
  import { ingredientUIStore } from './stores/ingredientUIStore.js';
  
  // Import components
  import MinimalHeader from './components/ingredients/MinimalHeader.svelte';
  import FloatingFilterPanel from './components/ingredients/FloatingFilterPanel.svelte';
  import ContextualActions from './components/ingredients/ContextualActions.svelte';
  import IngredientGrid from './components/ingredients/IngredientGrid.svelte';
  import IngredientModals from './components/ingredients/IngredientModals.svelte';
  
  // Import business logic
  import { ingredientBusinessLogic } from './services/ingredientBusinessLogic.js';
  import { 
    getUniqueHealthSystems, 
    filterByActiveConfig,
    getSelectedItems 
  } from './utils/ingredientUtils.js';
  
  // Props
  let {
    onSelectIngredient = () => {},
    onCreateReference = () => {},
    onEditReference = () => {},
    currentIngredient = $bindable(),
    activeConfigId = null,
    activeConfigIngredients = []
  } = $props();
  
  // Migration state
  let migrating = $state(false);
  let migrationResult = $state(null);
  
  // Filter panel state
  let filterPanelOpen = $state(false);
  
  // Initialize stores on mount
  onMount(async () => {
    console.log('IngredientManager mounted, checking Firebase configuration...');
    
    if (!isFirebaseConfigured()) {
      console.warn('Firebase is not configured. Ingredient management will not be available.');
      // Still initialize stores with empty state for reactivity to work
      ingredientStore.initEmpty();
      ingredientUIStore.reset();
      return;
    }
    
    await ingredientStore.init();
    
    // Load shared statuses for all ingredients
    if (ingredientStore.ingredients.length > 0) {
      const ingredientIds = ingredientStore.ingredients.map(ing => ing.id);
      const statuses = await ingredientBusinessLogic.checkSharedStatuses(ingredientIds);
      ingredientUIStore.sharedStatuses = statuses;
    }
  });
  
  // Clean up on destroy
  onDestroy(() => {
    ingredientStore.destroy();
    ingredientUIStore.reset();
  });
  
  // Computed values
  let healthSystems = $derived.by(() => {
    return getUniqueHealthSystems(
      ingredientStore.ingredients, 
      ingredientUIStore.ingredientReferences
    );
  });
  
  let filteredIngredients = $derived.by(() => {
    let filtered = ingredientStore.ingredients;
    
    // Apply active config filter first
    filtered = filterByActiveConfig(filtered, activeConfigId, activeConfigIngredients);
    
    // Update debounced search when search query changes
    if (ingredientFiltersStore.searchQuery !== ingredientFiltersStore.debouncedSearchQuery) {
      ingredientFiltersStore.updateSearch(ingredientFiltersStore.searchQuery);
    }
    
    // Then apply user filters
    filtered = ingredientFiltersStore.applyFilters(
      filtered, 
      ingredientUIStore.ingredientReferences
    );
    
    return filtered;
  });
  
  let selectedItems = $derived.by(() => {
    return getSelectedItems(
      ingredientUIStore.selectedIngredients,
      ingredientStore.ingredients,
      ingredientUIStore.ingredientReferences
    );
  });
  
  // Event handlers
  async function handleSelectIngredient(ingredient, autoLoadReference = true) {
    currentIngredient = ingredient;
    ingredientUIStore.currentIngredient = ingredient;
    
    if (autoLoadReference && !ingredientUIStore.ingredientReferences[ingredient.id]) {
      await ingredientUIStore.loadReferencesForIngredient(ingredient.id);
    }
    
    onSelectIngredient(ingredient);
  }
  
  async function handleCreateReference(ingredient, populationType) {
    await handleSelectIngredient(ingredient, false);
    onCreateReference(ingredient, populationType);
  }
  
  async function handleEditReference(ingredient, reference) {
    await handleSelectIngredient(ingredient, false);
    onEditReference(ingredient, reference);
  }
  
  async function handleRestoreVersion(version) {
    // Restore version logic
    const ingredientId = version.ingredientId;
    await ingredientBusinessLogic.restoreVersion(ingredientId, version);
    await ingredientStore.reload();
    ingredientUIStore.clearReferenceCache(ingredientId);
  }
  
  async function handleMergeVariations(primary, variations) {
    const count = await ingredientBusinessLogic.mergeVariations(primary, variations);
    await ingredientStore.reload();
    alert(`Successfully merged ${count} references into ${primary.name}`);
  }
  
  async function handleRevertBaseline(ingredient, reference) {
    if (confirm('Are you sure you want to revert this reference to the baseline? This will overwrite the current content.')) {
      await ingredientBusinessLogic.revertToBaseline(ingredient, reference);
      ingredientUIStore.clearReferenceCache(ingredient.id);
      await ingredientUIStore.loadReferencesForIngredient(ingredient.id);
    }
  }
  
  async function handleCompareBaseline(ingredient, reference) {
    const status = await ingredientBusinessLogic.checkBaselineStatus(ingredient, reference);
    if (status) {
      ingredientUIStore.baselineComparisonData = {
        ingredient,
        reference,
        baselineContent: status.baselineContent,
        differences: status.differences
      };
      ingredientUIStore.showBaselineComparison = true;
    }
  }
  
  async function handleUpdateValidation(ingredientId, referenceId, validationData) {
    await referenceService.updateReferenceValidation(
      ingredientId,
      referenceId,
      validationData
    );
    ingredientUIStore.clearReferenceCache(ingredientId);
    await ingredientUIStore.loadReferencesForIngredient(ingredientId);
  }
  
  async function handleRefresh() {
    await ingredientStore.reload();
    ingredientUIStore.reset();
  }
  
  // Migration functions
  async function migrateConfigs() {
    migrating = true;
    try {
      migrationResult = await ingredientBusinessLogic.migrateConfigs();
      await ingredientStore.reload();
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed: ' + error.message);
    } finally {
      migrating = false;
    }
  }
  
  async function fixParentheses() {
    const count = await ingredientBusinessLogic.fixParentheses();
    await ingredientStore.reload();
    alert(`Fixed parentheses for ${count} ingredients`);
  }
  
  async function fixCategories() {
    const count = await ingredientBusinessLogic.fixCategories();
    await ingredientStore.reload();
    alert(`Fixed categories for ${count} ingredients`);
  }
  
  async function clearAllIngredients() {
    if (confirm('Are you sure you want to delete ALL ingredients and references? This cannot be undone!')) {
      if (confirm('This will permanently delete all data. Are you absolutely sure?')) {
        // Delete all ingredients
        for (const ingredient of ingredientStore.ingredients) {
          await ingredientBusinessLogic.deleteIngredientWithReferences(ingredient.id);
        }
        await ingredientStore.reload();
        ingredientUIStore.reset();
      }
    }
  }
</script>

<div class="ingredient-manager content-focused">
  <!-- Minimal Header -->
  <MinimalHeader 
    title="Ingredient Library"
    totalIngredients={ingredientStore.ingredients.length}
    filteredCount={filteredIngredients.length}
    {activeConfigId}
  />
  
  {#if ingredientStore.error}
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      {ingredientStore.error}
    </div>
  {:else if ingredientStore.loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading ingredients...</p>
    </div>
  {:else}
    <!-- Main Content Area -->
    <div class="content-area">
    
    {#if migrationResult}
      <div class="migration-success">
        <span class="success-icon">✅</span>
        Migration complete! Created {migrationResult.totalIngredients} ingredients and {migrationResult.totalReferences} references from {migrationResult.totalConfigs} configs.
      </div>
    {/if}
    
    {#if ingredientStore.ingredients.length > 0}
      <div class="fix-parentheses-prompt">
        <p>If some ingredients are missing parentheses or need fixes, you can use these tools:</p>
        <button class="fix-btn" onclick={fixParentheses}>
          🔧 Fix Missing Parentheses
        </button>
        <button class="fix-btn" onclick={fixCategories}>
          📁 Fix Categories
        </button>
        <button class="clear-btn" onclick={clearAllIngredients}>
          🗑️ Clear All & Start Fresh
        </button>
      </div>
    {/if}
    
    {#if ingredientStore.ingredients.length === 0 && !migrating}
      <div class="migration-prompt">
        <p>No ingredients found. If you've imported configs, you can migrate them to create ingredients.</p>
        <button 
          class="migrate-btn"
          onclick={migrateConfigs}
          disabled={migrating}
        >
          {migrating ? 'Migrating...' : '🔄 Migrate Imported Configs'}
        </button>
      </div>
    {/if}
    
      <IngredientGrid
        ingredients={filteredIngredients}
        ingredientReferences={ingredientUIStore.ingredientReferences}
        expandedIngredients={ingredientUIStore.expandedIngredients}
        selectedIngredients={ingredientUIStore.selectedIngredients}
        selectionMode={ingredientUIStore.selectionMode}
        referenceLoadingStates={ingredientUIStore.referenceLoadingStates}
        selectedHealthSystem={ingredientFiltersStore.selectedHealthSystem}
        currentIngredient={ingredientUIStore.currentIngredient}
        sharedStatuses={ingredientUIStore.sharedStatuses}
        onSelectIngredient={handleSelectIngredient}
        onToggleExpand={(id) => ingredientUIStore.toggleExpanded(id)}
        onEditReference={handleEditReference}
        onCreateReference={handleCreateReference}
        onLoadReferences={(id) => ingredientUIStore.loadReferencesForIngredient(id)}
        onToggleSelection={(id) => ingredientUIStore.toggleIngredientSelection(id)}
        onVersionClick={(ingredient) => ingredientUIStore.openVersionHistory(ingredient)}
        onShareClick={(ingredient) => ingredientUIStore.openSharedManager(ingredient)}
        onVariationClick={(ingredient) => ingredientUIStore.openVariationDetector(ingredient)}
        onCompareBaseline={handleCompareBaseline}
        onRevertBaseline={handleRevertBaseline}
        onUpdateValidation={handleUpdateValidation}
      />
    </div>
  {/if}
</div>

<!-- Floating Filter Panel -->
<FloatingFilterPanel
  bind:isOpen={filterPanelOpen}
  bind:searchQuery={ingredientFiltersStore.searchQuery}
  bind:selectedCategory={ingredientFiltersStore.selectedCategory}
  bind:selectedHealthSystem={ingredientFiltersStore.selectedHealthSystem}
  bind:showOnlyWithDiffs={ingredientFiltersStore.showOnlyWithDiffs}
  {healthSystems}
  onFindVariations={() => {
    ingredientUIStore.openVariationDetector(null);
    filterPanelOpen = false;
  }}
/>

<!-- Contextual Action Buttons -->
<ContextualActions
  selectionMode={ingredientUIStore.selectionMode}
  selectedCount={ingredientUIStore.selectedCount}
  onToggleSelection={() => ingredientUIStore.toggleSelectionMode()}
  onBulkOperations={() => ingredientUIStore.openBulkOperations()}
  onSelectAll={() => ingredientUIStore.selectAll(filteredIngredients.map(i => i.id))}
  onClearSelection={() => ingredientUIStore.clearSelection()}
/>

<IngredientModals
  showVersionHistory={ingredientUIStore.showVersionHistory}
  versionHistoryIngredientId={ingredientUIStore.versionHistoryIngredientId}
  showSharedManager={ingredientUIStore.showSharedManager}
  sharedManagerIngredient={ingredientUIStore.sharedManagerIngredient}
  showVariationDetector={ingredientUIStore.showVariationDetector}
  variationTargetIngredient={ingredientUIStore.variationTargetIngredient}
  showBaselineComparison={ingredientUIStore.showBaselineComparison}
  baselineComparisonData={ingredientUIStore.baselineComparisonData}
  showBulkOperations={ingredientUIStore.showBulkOperations}
  {selectedItems}
  onRestoreVersion={handleRestoreVersion}
  onMergeVariations={handleMergeVariations}
  onRevertBaseline={handleRevertBaseline}
  onRefresh={handleRefresh}
/>

<style>
  @import './styles/ingredientDesignSystem.css';
  
  .ingredient-manager {
    background-color: var(--color-background);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  /* Content-focused layout */
  .ingredient-manager.content-focused {
    padding: 0;
  }
  
  .content-area {
    flex: 1;
    padding: 0 var(--space-6) var(--space-6);
    overflow-y: auto;
    
    /* Subtle background pattern for depth */
    background-image: 
      radial-gradient(circle at 20% 50%, 
        rgba(var(--color-primary-rgb), 0.02) 0%, 
        transparent 50%),
      radial-gradient(circle at 80% 80%, 
        rgba(var(--color-secondary-rgb), 0.02) 0%, 
        transparent 50%);
  }
  
  .error-message {
    background-color: var(--color-danger-100);
    color: var(--color-danger-700);
    padding: 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
  }
  
  .spinner {
    width: 3rem;
    height: 3rem;
    border: 4px solid var(--color-primary-200);
    border-top-color: var(--color-primary-600);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .migration-success {
    background-color: var(--color-success-100);
    color: var(--color-success-700);
    padding: 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .migration-prompt,
  .fix-parentheses-prompt {
    background-color: var(--color-info-100);
    padding: 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
  }
  
  .migration-prompt p,
  .fix-parentheses-prompt p {
    margin: 0 0 1rem 0;
    color: var(--color-info-700);
  }
  
  .migrate-btn,
  .fix-btn,
  .clear-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin-right: 0.5rem;
  }
  
  .migrate-btn {
    background-color: var(--color-primary-500);
    color: white;
  }
  
  .migrate-btn:hover:not(:disabled) {
    background-color: var(--color-primary-600);
  }
  
  .migrate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .fix-btn {
    background-color: var(--color-info-500);
    color: white;
  }
  
  .fix-btn:hover {
    background-color: var(--color-info-600);
  }
  
  .clear-btn {
    background-color: var(--color-danger-500);
    color: white;
  }
  
  .clear-btn:hover {
    background-color: var(--color-danger-600);
  }
</style>