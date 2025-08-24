<script>
  import { onMount, onDestroy } from 'svelte';
  import { ingredientService, referenceService, POPULATION_TYPES, formatIngredientName } from './firebaseDataService.js';
  import { getKeyCategory } from './tpnLegacy.js';
  import { isFirebaseConfigured } from './firebase.js';
  import VersionHistory from './VersionHistory.svelte';
  import SharedIngredientManager from './SharedIngredientManager.svelte';
  import VariationDetector from './VariationDetector.svelte';
  import ValidationStatus from './ValidationStatus.svelte';
  import BulkOperations from './BulkOperations.svelte';
  import { isIngredientShared } from './sharedIngredientService.js';
  import SlideToggle from './components/SlideToggle.svelte';
  import ProgressBar from './components/ProgressBar.svelte';

  
  let {
    isOpen = $bindable(false),
    onSelectIngredient = () => {},
    onCreateReference = () => {},
    onEditReference = () => {},
    onClose = () => {},
    currentIngredient = $bindable(),
    activeConfigId = null,
    activeConfigIngredients = [],
    currentReferenceName = ''
  } = $props();
  
  let ingredients = $state([]);
  let filteredIngredients = $state([]);
  let ingredientReferences = $state({});
  let searchQuery = $state('');
  let selectedCategory = $state('ALL');
  let selectedHealthSystem = $state('ALL');
  let showOnlyWithDiffs = $state(false);
  let loading = $state(true);
  let error = $state(null);
  let expandedIngredients = $state({});
  let unsubscribe = null;
  let selectionMode = $state(false);
  let selectedIngredients = $state(new Set());
  let showBulkOperations = $state(false);
  let activeTab = $state(activeConfigId ? 'config' : 'library');
  
  // Categories for filtering
  const categories = [
    'ALL',
    'BASIC_PARAMETERS',
    'MACRONUTRIENTS',
    'ELECTROLYTES',
    'ADDITIVES',
    'PREFERENCES',
    'CALCULATED_VOLUMES',
    'CLINICAL_CALCULATIONS',
    'WEIGHT_CALCULATIONS',
    'OTHER'
  ];
  
  // Population type display names
  const populationTypeNames = {
    [POPULATION_TYPES.NEONATAL]: 'Neonatal',
    [POPULATION_TYPES.PEDIATRIC]: 'Child',
    [POPULATION_TYPES.ADOLESCENT]: 'Adolescent',
    [POPULATION_TYPES.ADULT]: 'Adult',
    'pediatric': 'Child',
    'child': 'Child',
    'neonatal': 'Neonatal',
    'adolescent': 'Adolescent',
    'adult': 'Adult'
  };
  
  // Population type badge variants for Skeleton
  const populationTypeBadges = {
    [POPULATION_TYPES.NEONATAL]: 'variant-filled-error',
    [POPULATION_TYPES.PEDIATRIC]: 'variant-filled-primary',
    [POPULATION_TYPES.ADOLESCENT]: 'variant-filled-warning',
    [POPULATION_TYPES.ADULT]: 'variant-filled-secondary',
    'pediatric': 'variant-filled-primary',
    'child': 'variant-filled-primary',
    'neonatal': 'variant-filled-error',
    'adolescent': 'variant-filled-warning',
    'adult': 'variant-filled-secondary'
  };
  
  // Load ingredients on mount
  onMount(async () => {
    if (!isFirebaseConfigured()) {
      error = 'Firebase is not configured. Please set up your Firebase credentials.';
      loading = false;
      return;
    }
    
    try {
      // Subscribe to real-time updates
      unsubscribe = ingredientService.subscribeToIngredients(async (updatedIngredients) => {
        ingredients = updatedIngredients;
        loading = false;
        applyFilters();
      });
    } catch (err) {
      console.error('Error loading ingredients:', err);
      error = 'Failed to load ingredients. Please check your connection.';
      loading = false;
    }
  });
  
  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
  
  function applyFilters() {
    let filtered = [...ingredients];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ing => 
        ing.name?.toLowerCase().includes(query) || 
        ing.id?.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (selectedCategory && selectedCategory !== 'ALL') {
      filtered = filtered.filter(ing => {
        const category = getKeyCategory(ing.id);
        return category === selectedCategory;
      });
    }
    
    // Apply health system filter
    if (selectedHealthSystem && selectedHealthSystem !== 'ALL') {
      filtered = filtered.filter(ing => 
        ing.healthSystem === selectedHealthSystem
      );
    }
    
    // Apply active config filter
    if (activeConfigId && activeConfigIngredients.length > 0) {
      const configIngredientIds = new Set(
        activeConfigIngredients.map(ci => ci.id || ci.KEYNAME?.toLowerCase())
      );
      filtered = filtered.filter(ing => configIngredientIds.has(ing.id));
    }
    
    // Apply diff filter
    if (showOnlyWithDiffs) {
      filtered = filtered.filter(ing => ing.hasDiffs);
    }
    
    filteredIngredients = filtered;
  }
  
  function toggleIngredient(ingredientId) {
    expandedIngredients[ingredientId] = !expandedIngredients[ingredientId];
  }
  
  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    if (!selectionMode) {
      selectedIngredients.clear();
      selectedIngredients = new Set();
    }
  }
  
  function toggleIngredientSelection(ingredientId) {
    if (selectedIngredients.has(ingredientId)) {
      selectedIngredients.delete(ingredientId);
    } else {
      selectedIngredients.add(ingredientId);
    }
    selectedIngredients = new Set(selectedIngredients);
  }
  
  function selectAll() {
    filteredIngredients.forEach(ing => selectedIngredients.add(ing.id));
    selectedIngredients = new Set(selectedIngredients);
  }
  
  function deselectAll() {
    selectedIngredients.clear();
    selectedIngredients = new Set();
  }
  
  // Reactive statements for automatic filtering
  $effect(() => {
    applyFilters();
  });
</script>

<!-- Modal wrapper -->
{#if isOpen}
  <div 
    class="fixed inset-0 bg-surface-900/50 z-50 flex items-center justify-center p-4"
    onclick={onClose}
  >
    <div 
      class="bg-surface-100-800-token rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Modal Header -->
      <header class="flex items-center justify-between p-6 border-b border-surface-300-600-token">
        <h2 class="h3 font-bold">Ingredient Manager</h2>
        <button 
          class="btn-icon variant-ghost-surface"
          onclick={onClose}
        >
          <span class="text-xl">×</span>
        </button>
      </header>
      
      <!-- Modal Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4">
  
  <!-- Tab Navigation -->
  <div class="tab-group variant-ghost-surface">
    <button 
      class="tab {activeTab === 'config' ? 'tab-active' : ''}"
      onclick={() => activeTab = 'config'}
      disabled={!activeConfigId}
    >
      Config Ingredients {activeConfigIngredients?.length ? `(${activeConfigIngredients.length})` : ''}
    </button>
    <button 
      class="tab {activeTab === 'library' ? 'tab-active' : ''}"
      onclick={() => activeTab = 'library'}
    >
      Full Library
    </button>
  </div>
  
  {#if activeTab === 'config'}
    <!-- Config Ingredients Section -->
    <div class="space-y-4">
      {#if !activeConfigId}
        <div class="alert variant-soft-surface">
          <div class="alert-message">
            <p>No configuration is currently loaded. Import a config to view its ingredients.</p>
          </div>
        </div>
      {:else if activeConfigIngredients?.length === 0}
        <div class="alert variant-soft-surface">
          <div class="alert-message">
            <p>This configuration has no ingredients.</p>
          </div>
        </div>
      {:else}
        <header class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <h3 class="h4 font-bold">📋 Config: {activeConfigId}</h3>
            <span class="badge variant-soft">
              {activeConfigIngredients.length} ingredients
            </span>
          </div>
        </header>
        
        <!-- Config Ingredients Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each activeConfigIngredients as ingredient}
            <div class="card variant-ghost-surface p-4">
              <h4 class="font-semibold">{ingredient.DISPLAY || ingredient.display || ingredient.KEYNAME || ingredient.keyname}</h4>
              <p class="text-sm text-surface-600-300-token">
                Type: {ingredient.TYPE || ingredient.type || 'Unknown'}
              </p>
              {#if ingredient.UNIT || ingredient.unit}
                <p class="text-sm">Unit: {ingredient.UNIT || ingredient.unit}</p>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <!-- Full Library Section -->
    <header class="flex justify-between items-center">
      <div class="flex items-center gap-3">
        <h3 class="h4 font-bold">📦 Ingredient Library</h3>
      {#if activeConfigId}
        <span class="badge variant-filled-primary">
          ⚙️ Config: {activeConfigId}
        </span>
      {/if}
      {#if !loading}
        <span class="badge variant-soft">
          {filteredIngredients.length} / {ingredients.length}
        </span>
      {/if}
    </div>
    
    <div class="flex gap-2">
      <button 
        class="btn {selectionMode ? 'variant-filled-warning' : 'variant-soft'}"
        onclick={toggleSelectionMode}
      >
        {selectionMode ? '✓ Selection Mode' : '☐ Select'}
      </button>
      
      {#if selectionMode && selectedIngredients.size > 0}
        <button 
          class="btn variant-filled-primary"
          onclick={() => showBulkOperations = true}
        >
          Bulk Actions ({selectedIngredients.size})
        </button>
      {/if}
    </div>
  </header>
  
  <!-- Filters -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Search -->
    <div class="col-span-full lg:col-span-2">
      <input 
        type="text"
        placeholder="Search ingredients..."
        bind:value={searchQuery}
        class="input variant-form-material"
      />
    </div>
    
    <!-- Category Filter -->
    <select 
      bind:value={selectedCategory}
      class="select variant-form-material"
    >
      {#each categories as category}
        <option value={category}>
          {category === 'ALL' ? 'All Categories' : category.replace(/_/g, ' ')}
        </option>
      {/each}
    </select>
    
    <!-- Health System Filter -->
    <select 
      bind:value={selectedHealthSystem}
      class="select variant-form-material"
    >
      <option value="ALL">All Health Systems</option>
      <option value="UHS">UHS</option>
      <option value="Other">Other</option>
    </select>
  </div>
  
  <!-- Toggle Options -->
  <div class="flex gap-4 items-center">
    <SlideToggle 
      name="show-diffs" 
      bind:checked={showOnlyWithDiffs}
      size="sm"
    >
      Show only with differences
    </SlideToggle>
  </div>
  
  <!-- Selection Controls -->
  {#if selectionMode}
    <div class="flex gap-2 p-3 bg-surface-200-700-token rounded-lg">
      <button 
        class="btn btn-sm variant-soft"
        onclick={selectAll}
      >
        Select All
      </button>
      <button 
        class="btn btn-sm variant-soft"
        onclick={deselectAll}
      >
        Deselect All
      </button>
      <span class="text-sm ml-auto">
        {selectedIngredients.size} selected
      </span>
    </div>
  {/if}
  
  <!-- Loading State -->
  {#if loading}
    <div class="space-y-4">
      <ProgressBar />
      <p class="text-center text-surface-600-300-token">Loading ingredients...</p>
    </div>
  {:else if error}
    <div class="alert variant-filled-error">
      <div class="alert-message">
        <h3 class="h4">Error</h3>
        <p>{error}</p>
      </div>
    </div>
  {:else if filteredIngredients.length === 0}
    <div class="text-center py-8 text-surface-600-300-token">
      <p class="text-lg mb-2">No ingredients found</p>
      <p class="text-sm">Try adjusting your filters or search query</p>
    </div>
  {:else}
    <!-- Ingredients Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredIngredients as ingredient}
        <div 
          class="card variant-ghost-surface p-4 cursor-pointer hover:variant-soft-primary transition-colors"
          class:ring-2={selectedIngredients.has(ingredient.id)}
          class:ring-primary-500={selectedIngredients.has(ingredient.id)}
        >
          <div class="{selectionMode ? 'flex items-start gap-3' : ''}">
            <!-- Selection Checkbox -->
            {#if selectionMode}
              <input 
                type="checkbox"
                class="checkbox"
                checked={selectedIngredients.has(ingredient.id)}
                onchange={() => toggleIngredientSelection(ingredient.id)}
              />
            {/if}
            
            <div class="{selectionMode ? 'flex-1' : ''}">
              <!-- Ingredient Header -->
          <div 
            class="flex justify-between items-start mb-2"
            onclick={() => !selectionMode && toggleIngredient(ingredient.id)}
          >
            <div>
              <h3 class="font-semibold">{formatIngredientName(ingredient.name)}</h3>
              <p class="text-sm text-surface-600-300-token">{ingredient.id}</p>
            </div>
            <button 
              class="btn btn-sm variant-ghost-surface"
              onclick={(e) => {
                e.stopPropagation();
                onSelectIngredient(ingredient);
              }}
            >
              →
            </button>
          </div>
          
          <!-- Population Types -->
          {#if ingredient.populationTypes?.length > 0}
            <div class="flex flex-wrap gap-1 mb-2">
              {#each ingredient.populationTypes as popType}
                <span class="badge {populationTypeBadges[popType] || 'variant-soft'} text-xs">
                  {populationTypeNames[popType] || popType}
                </span>
              {/each}
            </div>
          {/if}
          
          <!-- Reference Count -->
          {#if ingredient.referenceCount > 0}
            <div class="flex items-center gap-2 text-sm text-surface-600-300-token">
              <span>📄 {ingredient.referenceCount} reference{ingredient.referenceCount !== 1 ? 's' : ''}</span>
              {#if ingredient.hasDiffs}
                <span class="badge variant-filled-warning text-xs">Has Diffs</span>
              {/if}
              {#if ingredient.isShared}
                <span class="badge variant-filled-success text-xs">Shared</span>
              {/if}
            </div>
          {/if}
          
          <!-- Expanded Content -->
          {#if expandedIngredients[ingredient.id]}
            <div class="mt-3 pt-3 border-t border-surface-300-600-token space-y-2">
              <button 
                class="btn btn-sm variant-filled-primary w-full"
                onclick={() => onCreateReference(ingredient)}
              >
                + Create Reference
              </button>
              
              {#if ingredient.references?.length > 0}
                <div class="space-y-1">
                  {#each ingredient.references as ref}
                    <button 
                      class="btn btn-sm variant-soft w-full text-left"
                      onclick={() => onEditReference(ref)}
                    >
                      Edit: {ref.name}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
          
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  {/if}
  
  <!-- Bulk Operations Modal -->
  {#if showBulkOperations}
    <BulkOperations 
      {selectedIngredients}
      onClose={() => showBulkOperations = false}
    />
  {/if}
      </div>
      
      <!-- Modal Footer -->
      <footer class="flex justify-between items-center p-6 border-t border-surface-300-600-token">
        <div class="text-sm text-surface-600-300-token">
          {#if activeConfigId}
            <span>Active Config: <span class="font-semibold">{activeConfigId}</span></span>
          {:else}
            <span>No active configuration</span>
          {/if}
        </div>
        <button 
          class="btn variant-ghost-surface"
          onclick={onClose}
        >
          Close
        </button>
      </footer>
    </div>
  </div>
{/if}