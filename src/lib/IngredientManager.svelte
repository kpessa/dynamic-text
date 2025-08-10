<script>
  import { onMount, onDestroy } from 'svelte';
  import { ingredientService, referenceService, POPULATION_TYPES, configService, organizationService, formatIngredientName } from './firebaseDataService.js';
  import { getKeyCategory } from './tpnLegacy.js';
  import { isFirebaseConfigured } from './firebase.js';
  import VersionHistory from './VersionHistory.svelte';
  import SharedIngredientManager from './SharedIngredientManager.svelte';
  import VariationDetector from './VariationDetector.svelte';
  import ValidationStatus from './ValidationStatus.svelte';
  import BulkOperations from './BulkOperations.svelte';
  import { isIngredientShared } from './sharedIngredientService.js';
  
  let {
    onSelectIngredient = () => {},
    onCreateReference = () => {},
    onEditReference = () => {},
    currentIngredient = $bindable(),
    activeConfigId = null,
    activeConfigIngredients = []
  } = $props();
  
  let ingredients = $state([]);
  let filteredIngredients = $state([]);
  let ingredientReferences = $state({});
  let referenceLoadingStates = $state({});
  let searchQuery = $state('');
  let selectedCategory = $state('ALL');
  let selectedHealthSystem = $state('ALL');
  let showOnlyWithDiffs = $state(false);
  let loading = $state(true);
  let error = $state(null);
  let expandedIngredients = $state({});
  let unsubscribe = null;
  let migrating = $state(false);
  let migrationResult = $state(null);
  let preloadedHealthSystems = $state([]);
  let showVersionHistory = $state(false);
  let versionHistoryIngredientId = $state(null);
  let baselineStatuses = $state({}); // Track baseline comparison status
  let showBaselineComparison = $state(false);
  let baselineComparisonData = $state(null);
  let showSharedManager = $state(false);
  let sharedManagerIngredient = $state(null);
  let sharedStatuses = $state({}); // Track shared status for ingredients
  let showVariationDetector = $state(false);
  let variationTargetIngredient = $state(null);
  
  // Multi-select and bulk operations state
  let selectionMode = $state(false);
  let selectedIngredients = $state(new Set());
  let showBulkOperations = $state(false);
  
  // Cache for loaded references to avoid refetching
  const referenceCache = new Map();
  
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
    // Handle legacy values from Firebase
    'pediatric': 'Child',
    'child': 'Child',
    'neonatal': 'Neonatal',
    'adolescent': 'Adolescent',
    'adult': 'Adult'
  };
  
  // Population type colors
  const populationTypeColors = {
    [POPULATION_TYPES.NEONATAL]: '#ff6b6b',
    [POPULATION_TYPES.PEDIATRIC]: '#4ecdc4',
    [POPULATION_TYPES.ADOLESCENT]: '#45b7d1',
    [POPULATION_TYPES.ADULT]: '#5f27cd',
    // Handle legacy values from Firebase
    'pediatric': '#4ecdc4',
    'child': '#4ecdc4',
    'neonatal': '#ff6b6b',
    'adolescent': '#45b7d1',
    'adult': '#5f27cd'
  };
  
  // Load ingredients on mount
  onMount(async () => {
    console.log('IngredientManager mounted, checking Firebase configuration...');
    
    if (!isFirebaseConfigured()) {
      error = 'Firebase is not configured. Please set up your Firebase credentials.';
      loading = false;
      console.error('Firebase not configured - missing credentials');
      return;
    }
    
    console.log('Firebase is configured, attempting to load ingredients...');
    
    try {
      // Subscribe to real-time updates
      unsubscribe = ingredientService.subscribeToIngredients(async (updatedIngredients) => {
        console.log(`Received ${updatedIngredients.length} ingredients from Firebase:`, updatedIngredients);
        
        // Debug: Check for ingredients with parentheses issues and Multrys
        const ingredientsWithParens = updatedIngredients.filter(ing => 
          ing.id.includes('-') && (
            ing.id.includes('amino-acids') || 
            ing.id.includes('trace-elements') ||
            ing.id.includes('vitamins')
          )
        );
        if (ingredientsWithParens.length > 0) {
          console.log('Ingredients that might have parentheses:', ingredientsWithParens.map(ing => ({
            id: ing.id,
            name: ing.name,
            hasParentheses: ing.name?.includes('(')
          })));
        }
        
        // Debug: Check for Multrys and Tralement specifically
        const multrysIngredient = updatedIngredients.find(ing => 
          ing.id === 'multrys' || ing.name?.toLowerCase().includes('multrys')
        );
        const tralementIngredient = updatedIngredients.find(ing => 
          ing.id === 'tralement' || ing.name?.toLowerCase().includes('tralement')
        );
        
        if (multrysIngredient) {
          console.log('Found Multrys:', multrysIngredient);
        } else {
          console.log('Multrys not found in ingredients');
        }
        
        if (tralementIngredient) {
          console.log('Found Tralement:', tralementIngredient);
        } else {
          console.log('Tralement not found in ingredients');
        }
        
        // Show all additives for debugging
        const additives = updatedIngredients.filter(ing => 
          getKeyCategory(ing.name) === 'ADDITIVES'
        );
        console.log('All additives found:', additives.map(ing => ({ 
          id: ing.id, 
          name: ing.name,
          category: ing.category 
        })));
        
        ingredients = updatedIngredients;
        
        // Check shared status for ingredients
        for (const ingredient of updatedIngredients) {
          try {
            const sharedStatus = await isIngredientShared(ingredient.id);
            sharedStatuses[ingredient.id] = sharedStatus;
          } catch (err) {
            console.warn(`Failed to check shared status for ${ingredient.name}:`, err);
          }
        }
        
        // Don't pre-load references - load them on-demand for better performance
        // This significantly speeds up initial load time
        
        applyFilters();
        loading = false;
      });
    } catch (err) {
      console.error('Error setting up ingredient subscription:', err);
      error = err.message;
      loading = false;
    }
  });
  
  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    // Clear cache on unmount
    referenceCache.clear();
  });
  
  // Lazy load references for a specific ingredient
  async function loadReferencesForIngredient(ingredientId) {
    // Check cache first
    if (referenceCache.has(ingredientId)) {
      ingredientReferences[ingredientId] = referenceCache.get(ingredientId);
      return;
    }
    
    // Check if already loading
    if (referenceLoadingStates[ingredientId]) {
      return;
    }
    
    referenceLoadingStates[ingredientId] = true;
    referenceLoadingStates = { ...referenceLoadingStates }; // Trigger reactivity
    
    try {
      const refs = await referenceService.getReferencesForIngredient(ingredientId);
      console.log(`Loaded ${refs.length} references for ingredient ${ingredientId}`);
      const grouped = groupReferencesByPopulation(refs);
      
      // Update state and cache
      ingredientReferences[ingredientId] = grouped;
      referenceCache.set(ingredientId, grouped);
    } catch (err) {
      console.error(`Error loading references for ingredient ${ingredientId}:`, err);
      ingredientReferences[ingredientId] = {};
    } finally {
      referenceLoadingStates[ingredientId] = false;
      referenceLoadingStates = { ...referenceLoadingStates }; // Trigger reactivity
      ingredientReferences = { ...ingredientReferences }; // Trigger reactivity
    }
  }
  
  // Group references by population type
  function groupReferencesByPopulation(references) {
    const grouped = {};
    references.forEach(ref => {
      if (!grouped[ref.populationType]) {
        grouped[ref.populationType] = [];
      }
      grouped[ref.populationType].push(ref);
    });
    return grouped;
  }
  
  // Check if ingredient has differences across populations
  function hasDifferences(ingredientId) {
    const refs = ingredientReferences[ingredientId];
    // Can't determine differences if references not loaded yet
    if (!refs) return null;
    
    const populations = Object.keys(refs);
    if (populations.length < 2) return false;
    
    // Compare sections across populations
    const sectionStrings = populations.map(pop => {
      const popRefs = refs[pop];
      if (popRefs.length === 0) return '';
      // Get the first reference's sections as a string for comparison
      return JSON.stringify(popRefs[0].sections);
    });
    
    // Check if all section strings are the same
    return !sectionStrings.every(str => str === sectionStrings[0]);
  }
  
  // Apply filters
  function applyFilters() {
    filteredIngredients = ingredients.filter(ingredient => {
      // Active config filter - if a config is active, only show its ingredients
      if (activeConfigId && activeConfigIngredients.length > 0) {
        // Check if ingredient name matches any of the config ingredients
        // Format the names from config to match Firebase names
        const ingredientNames = activeConfigIngredients.map(ing => {
          const rawName = ing.KEYNAME || ing.Ingredient || ing.name || '';
          return formatIngredientName(rawName);
        });
        
        // Debug logging for additives
        if (getKeyCategory(ingredient.name) === 'ADDITIVES') {
          console.log(`Checking additive: "${ingredient.name}" against formatted config names:`, ingredientNames);
        }
        
        if (!ingredientNames.some(name => 
          name.toLowerCase() === ingredient.name.toLowerCase()
        )) {
          return false;
        }
      }
      
      // Search filter
      if (searchQuery && !ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (selectedCategory !== 'ALL') {
        const category = getKeyCategory(ingredient.name);
        if (category !== selectedCategory) {
          return false;
        }
      }
      
      // Health system filter - skip if references not loaded
      if (selectedHealthSystem !== 'ALL') {
        const refs = ingredientReferences[ingredient.id];
        if (refs) {
          const hasHealthSystem = Object.values(refs).some(popRefs => 
            popRefs.some(ref => ref.healthSystem === selectedHealthSystem)
          );
          if (!hasHealthSystem) {
            return false;
          }
        }
      }
      
      // Differences filter - skip ingredients with unloaded references when filter is on
      if (showOnlyWithDiffs) {
        const hasDiff = hasDifferences(ingredient.id);
        if (hasDiff === null || !hasDiff) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  // Toggle ingredient expansion
  async function toggleIngredient(ingredientId) {
    expandedIngredients[ingredientId] = !expandedIngredients[ingredientId];
    expandedIngredients = { ...expandedIngredients };
    
    // Load references when expanding if not already loaded
    if (expandedIngredients[ingredientId] && !ingredientReferences[ingredientId]) {
      await loadReferencesForIngredient(ingredientId);
    }
  }
  
  // Handle ingredient selection
  async function selectIngredient(ingredient, autoLoadReference = true) {
    console.log('IngredientManager: selectIngredient called', { 
      ingredient: ingredient.name, 
      autoLoadReference,
      hasReferences: !!ingredientReferences[ingredient.id]
    });
    
    currentIngredient = ingredient;
    
    // Load references if not already loaded
    if (!ingredientReferences[ingredient.id]) {
      console.log('IngredientManager: Loading references for', ingredient.name);
      await loadReferencesForIngredient(ingredient.id);
    }
    
    // If autoLoadReference is true, try to load the first available reference
    if (autoLoadReference && ingredientReferences[ingredient.id]) {
      const populations = Object.values(POPULATION_TYPES);
      for (const pop of populations) {
        const refs = ingredientReferences[ingredient.id][pop];
        if (refs && refs.length > 0) {
          // Load the first reference found
          console.log('IngredientManager: Auto-loading reference', {
            ingredient: ingredient.name,
            population: pop,
            reference: refs[0].name
          });
          editReference(ingredient, refs[0]);
          return;
        }
      }
    }
    
    console.log('IngredientManager: No reference to auto-load, calling onSelectIngredient');
    onSelectIngredient(ingredient);
  }
  
  // Create a new reference for an ingredient
  function createReference(ingredient, populationType) {
    onCreateReference(ingredient, populationType);
  }
  
  // Edit an existing reference
  async function editReference(ingredient, reference) {
    console.log('IngredientManager: editReference called', {
      ingredient: ingredient.name,
      reference: reference.name,
      hasOnEditReference: !!onEditReference
    });
    
    // Check if this reference is shared
    try {
      const sharedStatus = await isIngredientShared(ingredient.id, reference.id);
      if (sharedStatus.isShared) {
        const message = `⚠️ Warning: This reference is shared across multiple configurations.\n\n` +
                       `Editing it will affect all configurations that use this shared ingredient.\n\n` +
                       `Would you like to:\n` +
                       `• OK - Continue editing (affects all shared configs)\n` +
                       `• Cancel - Make an independent copy first`;
        
        if (!confirm(message)) {
          // User wants to make it independent first
          alert('To make this reference independent, use the share manager (🔗 button) and unshare it first.');
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to check shared status:', err);
      // Continue with edit even if check fails
    }
    
    onEditReference(ingredient, reference);
  }
  
  // Toggle selection mode
  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    if (!selectionMode) {
      selectedIngredients.clear();
      selectedIngredients = new Set();
    }
  }
  
  // Toggle ingredient selection
  function toggleIngredientSelection(ingredientId) {
    if (selectedIngredients.has(ingredientId)) {
      selectedIngredients.delete(ingredientId);
    } else {
      selectedIngredients.add(ingredientId);
    }
    selectedIngredients = new Set(selectedIngredients); // Trigger reactivity
  }
  
  // Select all visible ingredients
  function selectAll() {
    filteredIngredients.forEach(ingredient => {
      selectedIngredients.add(ingredient.id);
    });
    selectedIngredients = new Set(selectedIngredients);
  }
  
  // Clear selection
  function clearSelection() {
    selectedIngredients.clear();
    selectedIngredients = new Set();
  }
  
  // Open bulk operations
  function openBulkOperations() {
    if (selectedIngredients.size === 0) {
      alert('Please select at least one ingredient');
      return;
    }
    showBulkOperations = true;
  }
  
  // Get selected items for bulk operations
  function getSelectedItems() {
    return Array.from(selectedIngredients).map(id => {
      const ingredient = ingredients.find(i => i.id === id);
      const refs = ingredientReferences[id];
      return {
        id,
        name: ingredient?.name || id,
        ingredientId: id,
        configs: refs ? Object.values(refs).flat().map(r => r.configId).filter(Boolean) : [],
        references: refs
      };
    });
  }
  
  // Open version history for an ingredient
  function openVersionHistory(ingredient) {
    versionHistoryIngredientId = ingredient.id;
    showVersionHistory = true;
  }
  
  // Open shared ingredient manager
  function openSharedManager(ingredient) {
    sharedManagerIngredient = {
      id: ingredient.id,
      name: ingredient.name
    };
    showSharedManager = true;
  }
  
  // Open variation detector
  function openVariationDetector(ingredient) {
    variationTargetIngredient = ingredient;
    showVariationDetector = true;
  }
  
  // Handle merge of variations
  async function handleMergeVariations(primary, variations) {
    if (!primary || !variations || variations.length === 0) return;
    
    try {
      // Implementation would merge variations into primary
      // For now, just log the action
      console.log('Merging variations:', { primary, variations });
      alert(`Would merge ${variations.length} variations into "${primary.name}"`);
      
      // Reload ingredients after merge
      await loadIngredients();
    } catch (error) {
      console.error('Error merging variations:', error);
      alert('Failed to merge variations');
    }
  }
  
  // Check baseline status for a reference
  async function checkBaselineStatus(ingredient, reference) {
    if (!reference.configId) return null;
    
    try {
      const status = await configService.compareWithBaseline(reference.configId, ingredient.name);
      return status;
    } catch (error) {
      console.error('Error checking baseline status:', error);
      return null;
    }
  }
  
  // Open baseline comparison view
  async function openBaselineComparison(ingredient, reference) {
    if (!reference.configId) {
      console.warn('No config ID for baseline comparison');
      return;
    }
    
    const status = await checkBaselineStatus(ingredient, reference);
    if (status && status.differences) {
      baselineComparisonData = {
        ingredient,
        reference,
        status,
        configId: reference.configId
      };
      showBaselineComparison = true;
    }
  }
  
  // Revert to baseline
  async function revertToBaseline(ingredient, reference) {
    if (!confirm('Are you sure you want to revert this reference to its original imported state? This will discard all changes.')) {
      return;
    }
    
    try {
      await configService.revertToBaseline(reference.configId, ingredient.name);
      // Reload references to show updated data
      await loadReferences(ingredient.id);
      alert('Successfully reverted to baseline');
    } catch (error) {
      console.error('Error reverting to baseline:', error);
      alert('Failed to revert to baseline: ' + error.message);
    }
  }
  
  // Handle restoring a version from history
  async function handleRestoreVersion(version) {
    // Restore the version
    await ingredientService.saveIngredient({
      ...version,
      id: versionHistoryIngredientId
    });
    
    // Reload ingredients
    const updatedIngredients = await ingredientService.getAllIngredients();
    ingredients = updatedIngredients;
    applyFilters();
  }
  
  // Get all unique health systems from both pre-loaded and loaded references
  let healthSystems = $derived.by(() => {
    const systems = new Set(['ALL']);
    
    // Add pre-loaded health systems
    preloadedHealthSystems.forEach(system => {
      if (system) systems.add(system);
    });
    
    // Add health systems from loaded references
    Object.values(ingredientReferences).forEach(refs => {
      Object.values(refs).forEach(popRefs => {
        popRefs.forEach(ref => {
          if (ref.healthSystem) {
            systems.add(ref.healthSystem);
          }
        });
      });
    });
    
    // Convert to array and sort (keep ALL first)
    const systemsArray = Array.from(systems);
    return ['ALL', ...systemsArray.filter(s => s !== 'ALL').sort()];
  });
  
  // Reactive filtering
  $effect(() => {
    applyFilters();
  });
  
  // Group ingredients by category
  let groupedIngredients = $derived.by(() => {
    const groups = {};
    
    filteredIngredients.forEach(ingredient => {
      const category = getKeyCategory(ingredient.name);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(ingredient);
    });
    
    // Sort categories in a logical order
    const categoryOrder = [
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
    
    const sortedGroups = {};
    categoryOrder.forEach(cat => {
      if (groups[cat]) {
        sortedGroups[cat] = groups[cat];
      }
    });
    
    return sortedGroups;
  });
  
  // Get color for category
  function getCategoryColor(category) {
    const colors = {
      'BASIC_PARAMETERS': '#007bff',
      'MACRONUTRIENTS': '#28a745',
      'ELECTROLYTES': '#ffc107',
      'ADDITIVES': '#6c757d',
      'PREFERENCES': '#17a2b8',
      'CALCULATED_VOLUMES': '#e83e8c',
      'CLINICAL_CALCULATIONS': '#fd7e14',
      'WEIGHT_CALCULATIONS': '#6f42c1',
      'OTHER': '#333'
    };
    return colors[category] || colors.OTHER;
  }
  
  // Migrate existing configs to ingredients
  async function migrateConfigs() {
    migrating = true;
    error = null;
    migrationResult = null;
    
    try {
      const result = await configService.migrateExistingConfigs();
      migrationResult = result;
      console.log('Migration completed:', result);
      
      // Refresh the ingredients list
      if (unsubscribe) {
        // The subscription will automatically pick up the new ingredients
      }
    } catch (err) {
      console.error('Migration failed:', err);
      error = `Migration failed: ${err.message}`;
    } finally {
      migrating = false;
    }
  }
  
  // Fix ingredients with missing parentheses
  async function fixParentheses() {
    try {
      const fixedCount = await ingredientService.fixIngredientsWithParentheses();
      if (fixedCount > 0) {
        alert(`Successfully fixed ${fixedCount} ingredients with missing parentheses!`);
      } else {
        alert('No ingredients needed fixing - all parentheses are correct!');
      }
    } catch (err) {
      console.error('Error fixing parentheses:', err);
      alert('Failed to fix parentheses: ' + err.message);
    }
  }
  
  // Fix ingredient categories
  async function fixCategories() {
    try {
      const fixedCount = await ingredientService.fixIngredientCategories();
      if (fixedCount > 0) {
        alert(`Successfully fixed ${fixedCount} ingredient categories!`);
      } else {
        alert('All ingredient categories are correct!');
      }
    } catch (err) {
      console.error('Error fixing categories:', err);
      alert('Failed to fix categories: ' + err.message);
    }
  }
  
  // Clear all ingredients (for fresh start)
  async function clearAllIngredients() {
    if (!confirm('⚠️ WARNING: This will delete ALL ingredients and their references!\n\nAre you sure you want to continue?')) {
      return;
    }
    
    if (!confirm('This action cannot be undone. Are you REALLY sure?')) {
      return;
    }
    
    try {
      const deletedCount = await ingredientService.clearAllIngredients();
      alert(`Successfully deleted ${deletedCount} ingredients. You can now re-import your configs.`);
      // Refresh the view
      ingredients = [];
      filteredIngredients = [];
    } catch (err) {
      console.error('Error clearing ingredients:', err);
      alert('Failed to clear ingredients: ' + err.message);
    }
  }
</script>

<div class="ingredient-manager">
  <div class="manager-header">
    <h2>📦 Ingredient Library</h2>
    <div class="header-controls">
      <div class="header-stats">
        {#if activeConfigId}
          <span class="active-config-badge">
            ⚙️ Filtered by config: {activeConfigId}
          </span>
        {/if}
        {#if !loading}
          <span class="stat">{filteredIngredients.length} of {ingredients.length} ingredients</span>
        {/if}
      </div>
      
      <div class="selection-controls">
        <button 
          class="selection-toggle-btn {selectionMode ? 'active' : ''}"
          onclick={toggleSelectionMode}
          title="{selectionMode ? 'Exit selection mode' : 'Enter selection mode'}"
        >
          {selectionMode ? '✓ Selection Mode' : '☐ Select'}
        </button>
        
        {#if selectionMode}
          <span class="selection-count">{selectedIngredients.size} selected</span>
          <button 
            class="select-all-btn"
            onclick={selectAll}
            disabled={selectedIngredients.size === filteredIngredients.length}
          >
            Select All
          </button>
          <button 
            class="clear-selection-btn"
            onclick={clearSelection}
            disabled={selectedIngredients.size === 0}
          >
            Clear
          </button>
          <button 
            class="bulk-operations-btn"
            onclick={openBulkOperations}
            disabled={selectedIngredients.size === 0}
          >
            ⚙️ Bulk Operations
          </button>
        {/if}
      </div>
    </div>
  </div>
  
  {#if error}
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      {error}
    </div>
  {:else if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading ingredients...</p>
    </div>
  {:else}
    <div class="filters">
      <div class="filter-row">
        <input
          type="text"
          placeholder="🔍 Search ingredients..."
          bind:value={searchQuery}
          class="search-input"
        />
        
        <select bind:value={selectedCategory} class="filter-select">
          {#each categories as category}
            <option value={category}>
              {category === 'ALL' ? 'All Categories' : category.replace(/_/g, ' ')}
            </option>
          {/each}
        </select>
        
        <select bind:value={selectedHealthSystem} class="filter-select">
          {#each healthSystems as system}
            <option value={system}>
              {system === 'ALL' ? 'All Health Systems' : system}
            </option>
          {/each}
        </select>
        
        <label class="diff-filter">
          <input
            type="checkbox"
            bind:checked={showOnlyWithDiffs}
          />
          <span>Show only with differences</span>
        </label>
        
        <button
          class="variation-detector-btn"
          onclick={() => {
            variationTargetIngredient = null;
            showVariationDetector = true;
          }}
          title="Find all variation clusters"
        >
          🔍 Find All Variations
        </button>
      </div>
    </div>
    
    {#if migrationResult}
      <div class="migration-success">
        <span class="success-icon">✅</span>
        Migration complete! Created {migrationResult.totalIngredients} ingredients and {migrationResult.totalReferences} references from {migrationResult.totalConfigs} configs.
      </div>
    {/if}
    
    {#if ingredients.length > 0}
      <div class="fix-parentheses-prompt">
        <p>If some ingredients are missing parentheses (e.g., "Amino Acids Trophamine" instead of "Amino Acids (Trophamine)"), you can fix them.</p>
        <button 
          class="fix-btn"
          onclick={fixParentheses}
        >
          🔧 Fix Missing Parentheses
        </button>
        <button 
          class="fix-btn"
          onclick={fixCategories}
        >
          📁 Fix Categories
        </button>
        <button 
          class="clear-btn"
          onclick={clearAllIngredients}
        >
          🗑️ Clear All & Start Fresh
        </button>
      </div>
    {/if}
    
    {#if ingredients.length === 0 && !migrating}
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
    
    <div class="ingredients-container">
      {#each Object.entries(groupedIngredients) as [category, categoryIngredients]}
        <div class="category-section">
          <div class="category-header">
            <h3 class="category-title" style="border-color: {getCategoryColor(category)}">
              <span class="category-icon" style="background-color: {getCategoryColor(category)}"></span>
              {category.replace(/_/g, ' ')}
            </h3>
            <span class="category-count">{categoryIngredients.length} ingredient{categoryIngredients.length !== 1 ? 's' : ''}</span>
          </div>
          
          <div class="ingredients-grid">
            {#each categoryIngredients as ingredient (ingredient.id)}
              <div 
                class="ingredient-card {currentIngredient?.id === ingredient.id ? 'selected' : ''} {hasDifferences(ingredient.id) ? 'has-diffs' : ''} {selectionMode && selectedIngredients.has(ingredient.id) ? 'multi-selected' : ''}"
                onclick={() => {
                  if (selectionMode) {
                    toggleIngredientSelection(ingredient.id);
                  } else {
                    selectIngredient(ingredient, true);
                  }
                }}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (selectionMode) {
                      toggleIngredientSelection(ingredient.id);
                    } else {
                      selectIngredient(ingredient, true);
                    }
                  }
                }}
                role="button"
                tabindex="0"
                title="{selectionMode ? 'Click to select/deselect' : 'Click to load clinical notes'}"
              >
                {#if selectionMode}
                  <div class="selection-checkbox">
                    <input 
                      type="checkbox"
                      checked={selectedIngredients.has(ingredient.id)}
                      onclick={(e) => e.stopPropagation()}
                      onchange={() => toggleIngredientSelection(ingredient.id)}
                    />
                  </div>
                {/if}
                <div class="card-header">
                  <h4 class="card-title">{ingredient.name}</h4>
                  <div class="card-badges">
                    {#if ingredient.version}
                      <button 
                        class="version-badge clickable" 
                        title="Click to view version history"
                        onclick={(e) => {
                          e.stopPropagation();
                          openVersionHistory(ingredient);
                        }}
                      >
                        v{ingredient.version}
                      </button>
                    {/if}
                    {#if sharedStatuses[ingredient.id]?.isShared}
                      <button
                        class="shared-badge clickable"
                        title="Manage shared ingredient (shared across {sharedStatuses[ingredient.id].sharedCount || 'multiple'} configs)"
                        onclick={(e) => {
                          e.stopPropagation();
                          openSharedManager(ingredient);
                        }}
                      >
                        🔗 {sharedStatuses[ingredient.id].sharedCount || ''}
                      </button>
                    {:else}
                      <button
                        class="share-badge clickable"
                        title="Share this ingredient"
                        onclick={(e) => {
                          e.stopPropagation();
                          openSharedManager(ingredient);
                        }}
                      >
                        📄
                      </button>
                    {/if}
                    <button
                      class="variation-badge clickable"
                      title="Find variations of this ingredient"
                      onclick={(e) => {
                        e.stopPropagation();
                        openVariationDetector(ingredient);
                      }}
                    >
                      🔍
                    </button>
                    {#if hasDifferences(ingredient.id)}
                      <span class="diff-badge" title="Has differences across populations">⚡</span>
                    {/if}
                    {#if referenceLoadingStates[ingredient.id]}
                      <span class="loading-spinner" title="Loading references..."></span>
                    {/if}
                  </div>
                </div>
                
                {#if ingredient.description}
                  <p class="card-description">{ingredient.description}</p>
                {/if}
                
                {#if ingredient.lastModified}
                  <div class="card-metadata">
                    <span class="last-modified">
                      Updated: {new Date(ingredient.lastModified?.seconds * 1000 || ingredient.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                {/if}
                
                <div class="card-populations">
                  {#if ingredientReferences[ingredient.id]}
                    {#each Object.entries(POPULATION_TYPES) as [key, value]}
                      {@const popRefs = ingredientReferences[ingredient.id]?.[value] || []}
                      {@const filteredRefs = selectedHealthSystem === 'ALL' 
                        ? popRefs 
                        : popRefs.filter(ref => ref.healthSystem === selectedHealthSystem)}
                      {#if filteredRefs.length > 0}
                        <button 
                          class="population-item"
                          style="--pop-color: {populationTypeColors[value]}"
                          onclick={async (e) => {
                            e.stopPropagation();
                            await selectIngredient(ingredient, false);
                            // Load the first reference that matches the health system filter
                            if (filteredRefs.length > 0) {
                              editReference(ingredient, filteredRefs[0]);
                            }
                          }}
                          title="Click to load {populationTypeNames[value]} reference"
                        >
                          <span class="pop-name">{populationTypeNames[value]}</span>
                          <span class="pop-count">{filteredRefs.length}</span>
                        </button>
                      {/if}
                    {/each}
                  {:else if !referenceLoadingStates[ingredient.id]}
                    <button 
                      class="load-refs-btn"
                      onclick={async (e) => {
                        e.stopPropagation();
                        await loadReferencesForIngredient(ingredient.id);
                      }}
                    >
                      Load References
                    </button>
                  {/if}
                </div>
                
                <div class="card-footer">
                  <button 
                    class="card-action-btn view-btn"
                    onclick={(e) => {
                      e.stopPropagation();
                      toggleIngredient(ingredient.id);
                    }}
                  >
                    {expandedIngredients[ingredient.id] ? 'Hide Details' : 'View Details'}
                  </button>
                  {#if ingredientReferences[ingredient.id] && Object.keys(ingredientReferences[ingredient.id] || {}).length === 0}
                    <button 
                      class="card-action-btn add-btn"
                      onclick={(e) => {
                        e.stopPropagation();
                        createReference(ingredient, POPULATION_TYPES.ADULT);
                      }}
                    >
                      + Add Reference
                    </button>
                  {/if}
                </div>
                
                {#if expandedIngredients[ingredient.id]}
                  <div class="expanded-details">
                    {#if referenceLoadingStates[ingredient.id]}
                      <div class="loading-references">
                        <div class="spinner small"></div>
                        <span>Loading references...</span>
                      </div>
                    {:else if ingredientReferences[ingredient.id]}
                      <div class="references-compact">
                        {#each Object.entries(POPULATION_TYPES) as [key, value]}
                          {@const popRefs = ingredientReferences[ingredient.id]?.[value] || []}
                          {@const filteredRefs = selectedHealthSystem === 'ALL' 
                            ? popRefs 
                            : popRefs.filter(ref => ref.healthSystem === selectedHealthSystem)}
                          {#if filteredRefs.length > 0}
                            <div class="pop-references">
                              <h5 style="color: {populationTypeColors[value]}">{populationTypeNames[value]}</h5>
                              {#each filteredRefs as reference}
                                <div class="ref-chip-container">
                                  <button 
                                    class="ref-chip {reference.status === 'MODIFIED' ? 'modified' : ''}"
                                    onclick={(e) => {
                                      e.stopPropagation();
                                      editReference(ingredient, reference);
                                    }}
                                    title="{reference.status === 'MODIFIED' ? 'Modified from baseline' : reference.status === 'CLEAN' ? 'Matches baseline' : ''}"
                                  >
                                    {reference.healthSystem} {reference.version ? `v${reference.version}` : ''}
                                    {#if reference.isShared}
                                      <span class="status-indicator shared" title="Shared across configs">🔗</span>
                                    {/if}
                                    {#if reference.status === 'MODIFIED'}
                                      <span class="status-indicator modified" title="Modified from baseline">●</span>
                                    {:else if reference.status === 'CLEAN'}
                                      <span class="status-indicator clean" title="Matches baseline">✓</span>
                                    {/if}
                                  </button>
                                  <ValidationStatus 
                                    status={reference.validationStatus || 'untested'}
                                    validatedBy={reference.validatedBy}
                                    validatedAt={reference.validatedAt}
                                    testResults={reference.testResults}
                                    notes={reference.validationNotes || ''}
                                    compact={true}
                                    onUpdate={async (validationData) => {
                                      await referenceService.updateReferenceValidation(
                                        ingredient.id,
                                        reference.id,
                                        validationData
                                      );
                                      // Refresh the reference
                                      await loadReferencesForIngredient(ingredient.id);
                                    }}
                                  />
                                  {#if reference.configId}
                                    <button 
                                      class="baseline-action-btn"
                                      onclick={async (e) => {
                                        e.stopPropagation();
                                        const status = await checkBaselineStatus(ingredient, reference);
                                        if (status?.status === 'MODIFIED') {
                                          openBaselineComparison(ingredient, reference);
                                        } else if (status?.status === 'CLEAN') {
                                          alert('This reference matches the baseline.');
                                        }
                                      }}
                                      title="Compare with baseline"
                                    >
                                      🔍
                                    </button>
                                    {#if reference.status === 'MODIFIED'}
                                      <button 
                                        class="baseline-action-btn revert"
                                        onclick={(e) => {
                                          e.stopPropagation();
                                          revertToBaseline(ingredient, reference);
                                        }}
                                        title="Revert to baseline"
                                      >
                                        ↺
                                      </button>
                                    {/if}
                                  {/if}
                                </div>
                              {/each}
                            </div>
                          {:else if popRefs.length === 0}
                            <div class="pop-references empty">
                              <h5 style="color: {populationTypeColors[value]}">{populationTypeNames[value]}</h5>
                              <button 
                                class="add-ref-btn"
                                onclick={(e) => {
                                  e.stopPropagation();
                                  createReference(ingredient, value);
                                }}
                              >
                                + Add
                              </button>
                            </div>
                          {/if}
                        {/each}
                      </div>
                    {:else}
                      <div class="no-references">
                        <p>No reference data loaded</p>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
      
      {#if Object.keys(groupedIngredients).length === 0}
        <div class="no-results">
          <div class="no-results-icon">📦</div>
          <h3>No ingredients found</h3>
          <p>{#if ingredients.length === 0}
            {#if !isFirebaseConfigured()}
              Configure Firebase to start managing ingredients.
            {:else}
              Import your data using the migration tool or create new ingredients.
            {/if}
          {:else}
            Try adjusting your filters to see ingredients.
          {/if}</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if showBaselineComparison && baselineComparisonData}
  <div 
    class="modal-overlay" 
    onclick={() => showBaselineComparison = false}
    onkeydown={(e) => e.key === 'Enter' && (showBaselineComparison = false)}
    role="button"
    tabindex="0"
    aria-label="Close baseline comparison">
    <div 
      class="modal-content baseline-comparison" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="0">
      <div class="modal-header">
        <h3>Baseline Comparison: {baselineComparisonData.ingredient.name}</h3>
        <button class="close-btn" onclick={() => showBaselineComparison = false}>×</button>
      </div>
      
      <div class="comparison-info">
        <p>Config: {baselineComparisonData.reference.healthSystem} - {baselineComparisonData.reference.populationType}</p>
        <p>Status: <span class="status-badge {baselineComparisonData.status.status.toLowerCase()}">{baselineComparisonData.status.status}</span></p>
      </div>
      
      {#if baselineComparisonData.status.differences}
        <div class="comparison-grid">
          <div class="comparison-column">
            <h4>Baseline (Original Import)</h4>
            <div class="sections-list">
              {#each baselineComparisonData.status.differences.baseline as section}
                <div class="section-item {section.type}">
                  <span class="section-type">{section.type}</span>
                  <pre>{section.content}</pre>
                </div>
              {/each}
            </div>
          </div>
          
          <div class="comparison-column">
            <h4>Working Copy (Current)</h4>
            <div class="sections-list">
              {#each baselineComparisonData.status.differences.working as section}
                <div class="section-item {section.type}">
                  <span class="section-type">{section.type}</span>
                  <pre>{section.content}</pre>
                </div>
              {/each}
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button 
            class="btn revert-btn" 
            onclick={() => {
              revertToBaseline(baselineComparisonData.ingredient, baselineComparisonData.reference);
              showBaselineComparison = false;
            }}
          >
            ↺ Revert to Baseline
          </button>
          <button class="btn" onclick={() => showBaselineComparison = false}>
            Keep Working Copy
          </button>
        </div>
      {:else}
        <p>No differences found - working copy matches baseline.</p>
      {/if}
    </div>
  </div>
{/if}

{#if showBulkOperations}
  <div 
    class="modal-backdrop" 
    onclick={() => showBulkOperations = false}
    onkeydown={(e) => e.key === 'Enter' && (showBulkOperations = false)}
    role="button"
    tabindex="0"
    aria-label="Close bulk operations">
    <div 
      class="modal-content bulk-operations-modal" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="0">
      <div class="modal-header">
        <h2>Bulk Operations</h2>
        <button class="close-btn" onclick={() => showBulkOperations = false}>✕</button>
      </div>
      <BulkOperations 
        selectedItems={getSelectedItems()}
        onComplete={() => {
          showBulkOperations = false;
          clearSelection();
          loadIngredients(); // Reload to show changes
        }}
        onCancel={() => showBulkOperations = false}
      />
    </div>
  </div>
{/if}

<style>
  .ingredient-manager {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #f8f9fa;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .manager-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #fff;
    border-bottom: 1px solid #dee2e6;
  }
  
  .manager-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }
  
  .header-stats {
    font-size: 0.9rem;
    color: #666;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .stat {
    background-color: #e9ecef;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
  }
  
  .active-config-badge {
    background-color: #fff3cd;
    color: #856404;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    border: 1px solid #ffeeba;
    font-weight: 500;
  }
  
  .error-message {
    padding: 2rem;
    text-align: center;
    color: #dc3545;
    background-color: #fee;
    margin: 1rem;
    border-radius: 8px;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #646cff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .filters {
    padding: 1rem;
    background-color: #fff;
    border-bottom: 1px solid #dee2e6;
  }
  
  .filter-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .search-input {
    flex: 1;
    min-width: 200px;
    padding: 0.5rem 1rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  
  .filter-select {
    padding: 0.5rem 1rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 0.9rem;
    background-color: #fff;
  }
  
  .diff-filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
  }
  
  .diff-filter input {
    cursor: pointer;
  }
  
  .variation-detector-btn {
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .variation-detector-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
  }
  
  .ingredients-container {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background-color: #f5f7fa;
  }
  
  .category-section {
    margin-bottom: 2.5rem;
  }
  
  .category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #e9ecef;
  }
  
  .category-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    font-size: 1.25rem;
    color: #2c3e50;
    font-weight: 600;
  }
  
  .category-icon {
    width: 8px;
    height: 24px;
    border-radius: 4px;
  }
  
  .category-count {
    font-size: 0.9rem;
    color: #7f8c8d;
    background-color: #ecf0f1;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
  }
  
  .ingredients-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.25rem;
  }
  
  @media (min-width: 1200px) {
    .ingredients-grid {
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    }
  }
  
  .ingredient-card {
    background-color: #fff;
    border: 1px solid #e1e8ed;
    border-radius: 12px;
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .ingredient-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: #d1d9e0;
  }
  
  .ingredient-card.selected {
    border-color: #646cff;
    box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.15);
  }
  
  .ingredient-card.has-diffs::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background-color: #ffc107;
  }
  
  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  
  .card-badges {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .card-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #2c3e50;
    line-height: 1.4;
  }
  
  .version-badge {
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 4px;
    font-weight: 500;
  }
  
  .version-badge.clickable {
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .version-badge.clickable:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  }
  
  .diff-badge {
    font-size: 1.2rem;
    color: #ffc107;
    filter: drop-shadow(0 2px 4px rgba(255, 193, 7, 0.3));
  }
  
  .shared-badge,
  .share-badge {
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
    border-radius: 4px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .shared-badge {
    background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
    color: white;
  }
  
  .shared-badge:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
  }
  
  .share-badge {
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    color: white;
  }
  
  .share-badge:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(255, 152, 0, 0.4);
  }
  
  .variation-badge {
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
    border-radius: 4px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
    color: white;
    transition: all 0.2s;
  }
  
  .variation-badge:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(156, 39, 176, 0.4);
  }
  
  .card-metadata {
    margin: 0.5rem 0;
    font-size: 0.75rem;
    color: #9ca3af;
  }
  
  .last-modified {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    background-color: rgba(156, 163, 175, 0.1);
    border-radius: 4px;
  }
  
  .card-description {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    color: #5a6c7d;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .card-populations {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .population-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background-color: #f8f9fa;
    border-radius: 6px;
    font-size: 0.75rem;
    border-left: 3px solid var(--pop-color);
    border: none;
    border-right: none;
    border-top: none;
    border-bottom: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .population-item:hover {
    background-color: var(--pop-color);
    color: white;
  }
  
  .population-item:hover .pop-name,
  .population-item:hover .pop-count {
    color: white;
  }
  
  .pop-name {
    color: #5a6c7d;
    font-weight: 500;
  }
  
  .pop-count {
    background-color: var(--pop-color);
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.7rem;
  }
  
  .card-footer {
    display: flex;
    gap: 0.5rem;
    margin-top: auto;
  }
  
  .card-action-btn {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .view-btn {
    background-color: #ecf0f1;
    color: #2c3e50;
  }
  
  .view-btn:hover {
    background-color: #d5dbdc;
  }
  
  .add-btn {
    background-color: #e8f5e9;
    color: #27ae60;
  }
  
  .add-btn:hover {
    background-color: #c8e6c9;
  }
  
  .expanded-details {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e9ecef;
    animation: slideDown 0.3s ease-out;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .references-compact {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .pop-references {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .pop-references.empty {
    opacity: 0.7;
  }
  
  .pop-references h5 {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 600;
    min-width: 80px;
  }
  
  .ref-chip {
    padding: 0.25rem 0.5rem;
    background-color: #ecf0f1;
    border: 1px solid #bdc3c7;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #2c3e50;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .ref-chip:hover {
    background-color: #646cff;
    color: white;
    border-color: #646cff;
  }
  
  .add-ref-btn {
    padding: 0.25rem 0.5rem;
    background-color: transparent;
    border: 1px dashed #95a5a6;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #7f8c8d;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .add-ref-btn:hover {
    border-color: #27ae60;
    color: #27ae60;
    background-color: #e8f5e9;
  }
  
  .no-results {
    text-align: center;
    padding: 4rem 2rem;
    color: #7f8c8d;
  }
  
  .no-results-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  .no-results h3 {
    margin: 0 0 0.5rem;
    font-size: 1.5rem;
    color: #5a6c7d;
  }
  
  .no-results p {
    margin: 0;
    font-size: 1rem;
  }
  
  .migration-prompt {
    text-align: center;
    padding: 2rem;
    background-color: #f0f8ff;
    border: 1px dashed #4a90e2;
    border-radius: 8px;
    margin: 1rem 1.5rem;
  }
  
  .migration-prompt p {
    margin: 0 0 1rem;
    color: #4a90e2;
    font-size: 1rem;
  }
  
  .migrate-btn {
    padding: 0.75rem 1.5rem;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .migrate-btn:hover:not(:disabled) {
    background-color: #357abd;
    transform: translateY(-1px);
  }
  
  .migrate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .migration-success {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 8px;
    margin: 1rem 1.5rem;
    color: #155724;
  }
  
  .success-icon {
    font-size: 1.5rem;
  }
  
  .fix-population-prompt,
  .fix-parentheses-prompt {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background-color: #e8f4fd;
    border: 1px dashed #2196f3;
    border-radius: 8px;
    margin: 1rem 1.5rem;
  }
  
  .fix-btn {
    padding: 0.5rem 1.25rem;
    background-color: #2196f3;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .fix-btn:hover:not(:disabled) {
    background-color: #1976d2;
    transform: translateY(-1px);
  }
  
  .fix-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .clear-btn {
    padding: 0.5rem 1.25rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .clear-btn:hover {
    background-color: #c82333;
    transform: translateY(-1px);
  }
  
  .fix-help {
    font-size: 0.9rem;
    color: #555;
  }
  
  .loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #646cff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .spinner.small {
    width: 20px;
    height: 20px;
    border-width: 2px;
  }
  
  .loading-references {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    color: #666;
  }
  
  .load-refs-btn {
    padding: 0.25rem 0.5rem;
    background-color: #e3f2fd;
    border: 1px solid #2196f3;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #2196f3;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .load-refs-btn:hover {
    background-color: #bbdefb;
  }
  
  .no-references {
    text-align: center;
    padding: 1rem;
    color: #999;
    font-size: 0.875rem;
  }
  
  /* Baseline comparison styles */
  .ref-chip-container {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0.25rem;
  }
  
  .ref-chip.modified {
    border-color: #ff9800;
    background-color: #fff3e0;
  }
  
  .status-indicator {
    margin-left: 0.25rem;
    font-size: 0.75rem;
  }
  
  .status-indicator.modified {
    color: #ff9800;
  }
  
  .status-indicator.clean {
    color: #4caf50;
  }
  
  .baseline-action-btn {
    padding: 0.25rem 0.35rem;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .baseline-action-btn:hover {
    background-color: #f5f5f5;
    transform: translateY(-1px);
  }
  
  .baseline-action-btn.revert {
    color: #ff9800;
    border-color: #ff9800;
  }
  
  .baseline-action-btn.revert:hover {
    background-color: #fff3e0;
  }
  
  /* Baseline comparison modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    border-radius: 8px;
    max-width: 90%;
    max-height: 90vh;
    overflow: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .baseline-comparison {
    width: 1200px;
    padding: 1.5rem;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .modal-header h3 {
    margin: 0;
    color: #333;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    color: #000;
  }
  
  .comparison-info {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: #f5f5f5;
    border-radius: 4px;
  }
  
  .comparison-info p {
    margin: 0.25rem 0;
    color: #666;
  }
  
  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .status-badge.modified {
    background-color: #fff3e0;
    color: #ff9800;
  }
  
  .status-badge.clean {
    background-color: #e8f5e9;
    color: #4caf50;
  }
  
  .comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .comparison-column {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 1rem;
  }
  
  .comparison-column h4 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1rem;
  }
  
  .sections-list {
    max-height: 400px;
    overflow-y: auto;
  }
  
  .section-item {
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #fafafa;
  }
  
  .section-item.dynamic {
    background-color: #f0f7ff;
    border-color: #2196f3;
  }
  
  .section-type {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    background-color: #666;
    color: white;
    border-radius: 3px;
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .section-item.dynamic .section-type {
    background-color: #2196f3;
  }
  
  .section-item pre {
    margin: 0.5rem 0 0 0;
    white-space: pre-wrap;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    color: #333;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
    color: #333;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn:hover {
    background-color: #f5f5f5;
  }
  
  .btn.revert-btn {
    background-color: #ff9800;
    color: white;
    border-color: #ff9800;
  }
  
  .btn.revert-btn:hover {
    background-color: #f57c00;
  }
  
  /* Selection mode styles */
  .header-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .selection-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .selection-toggle-btn {
    padding: 0.375rem 0.75rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  .selection-toggle-btn:hover {
    background: #f5f5f5;
  }
  
  .selection-toggle-btn.active {
    background: #1976d2;
    color: white;
    border-color: #1976d2;
  }
  
  .selection-count {
    padding: 0.25rem 0.75rem;
    background: #e3f2fd;
    color: #1976d2;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .select-all-btn,
  .clear-selection-btn,
  .bulk-operations-btn {
    padding: 0.375rem 0.75rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  .select-all-btn:hover,
  .clear-selection-btn:hover,
  .bulk-operations-btn:hover {
    background: #f5f5f5;
  }
  
  .select-all-btn:disabled,
  .clear-selection-btn:disabled,
  .bulk-operations-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .bulk-operations-btn {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
  }
  
  .bulk-operations-btn:hover {
    background: #45a049;
  }
  
  .ingredient-card.multi-selected {
    background: #e3f2fd;
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }
  
  .selection-checkbox {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    z-index: 1;
  }
  
  .selection-checkbox input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
  }
  
  .ingredient-card {
    position: relative;
  }
  
  .bulk-operations-modal {
    max-width: 700px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
</style>

<VersionHistory 
  bind:isOpen={showVersionHistory}
  ingredientId={versionHistoryIngredientId}
  onRestore={handleRestoreVersion}
/>

{#if showSharedManager && sharedManagerIngredient}
  <SharedIngredientManager
    ingredientId={sharedManagerIngredient.id}
    ingredientName={sharedManagerIngredient.name}
    onClose={() => {
      showSharedManager = false;
      sharedManagerIngredient = null;
      // Refresh shared statuses
      ingredients.forEach(async (ingredient) => {
        try {
          const sharedStatus = await isIngredientShared(ingredient.id);
          sharedStatuses[ingredient.id] = sharedStatus;
        } catch (err) {
          console.warn(`Failed to refresh shared status for ${ingredient.name}:`, err);
        }
      });
    }}
  />
{/if}

<VariationDetector
  bind:isOpen={showVariationDetector}
  targetIngredient={variationTargetIngredient}
  onMerge={handleMergeVariations}
  onClose={() => {
    showVariationDetector = false;
    variationTargetIngredient = null;
  }}
/>