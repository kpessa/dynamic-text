<script>
  import { onMount, onDestroy } from 'svelte';
  import { ingredientService, referenceService, POPULATION_TYPES, configService } from './firebaseDataService.js';
  import { getKeyCategory } from './tpnLegacy.js';
  import { isFirebaseConfigured } from './firebase.js';
  
  let {
    onSelectIngredient = () => {},
    onCreateReference = () => {},
    onEditReference = () => {},
    currentIngredient = $bindable()
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
  let migrating = $state(false);
  let migrationResult = $state(null);
  
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
    [POPULATION_TYPES.PEDIATRIC]: 'Pediatric',
    [POPULATION_TYPES.ADOLESCENT]: 'Adolescent',
    [POPULATION_TYPES.ADULT]: 'Adult'
  };
  
  // Population type colors
  const populationTypeColors = {
    [POPULATION_TYPES.NEONATAL]: '#ff6b6b',
    [POPULATION_TYPES.PEDIATRIC]: '#4ecdc4',
    [POPULATION_TYPES.ADOLESCENT]: '#45b7d1',
    [POPULATION_TYPES.ADULT]: '#5f27cd'
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
        ingredients = updatedIngredients;
        
        // Load references for each ingredient
        for (const ingredient of updatedIngredients) {
          try {
            const refs = await referenceService.getReferencesForIngredient(ingredient.id);
            console.log(`Loaded ${refs.length} references for ingredient ${ingredient.name}`);
            ingredientReferences[ingredient.id] = groupReferencesByPopulation(refs);
          } catch (err) {
            console.error(`Error loading references for ${ingredient.name}:`, err);
            ingredientReferences[ingredient.id] = {};
          }
        }
        
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
  });
  
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
    if (!refs) return false;
    
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
      
      // Health system filter
      if (selectedHealthSystem !== 'ALL') {
        const refs = ingredientReferences[ingredient.id] || {};
        const hasHealthSystem = Object.values(refs).some(popRefs => 
          popRefs.some(ref => ref.healthSystem === selectedHealthSystem)
        );
        if (!hasHealthSystem) {
          return false;
        }
      }
      
      // Differences filter
      if (showOnlyWithDiffs && !hasDifferences(ingredient.id)) {
        return false;
      }
      
      return true;
    });
  }
  
  // Toggle ingredient expansion
  function toggleIngredient(ingredientId) {
    expandedIngredients[ingredientId] = !expandedIngredients[ingredientId];
    expandedIngredients = { ...expandedIngredients };
  }
  
  // Handle ingredient selection
  function selectIngredient(ingredient) {
    currentIngredient = ingredient;
    onSelectIngredient(ingredient);
  }
  
  // Create a new reference for an ingredient
  function createReference(ingredient, populationType) {
    onCreateReference(ingredient, populationType);
  }
  
  // Edit an existing reference
  function editReference(ingredient, reference) {
    onEditReference(ingredient, reference);
  }
  
  // Get all unique health systems from references
  let healthSystems = $derived.by(() => {
    const systems = new Set(['ALL']);
    Object.values(ingredientReferences).forEach(refs => {
      Object.values(refs).forEach(popRefs => {
        popRefs.forEach(ref => {
          if (ref.healthSystem) {
            systems.add(ref.healthSystem);
          }
        });
      });
    });
    return Array.from(systems);
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
</script>

<div class="ingredient-manager">
  <div class="manager-header">
    <h2>📦 Ingredient Library</h2>
    <div class="header-stats">
      {#if !loading}
        <span class="stat">{filteredIngredients.length} of {ingredients.length} ingredients</span>
      {/if}
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
      </div>
    </div>
    
    {#if migrationResult}
      <div class="migration-success">
        <span class="success-icon">✅</span>
        Migration complete! Created {migrationResult.totalIngredients} ingredients and {migrationResult.totalReferences} references from {migrationResult.totalConfigs} configs.
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
                class="ingredient-card {currentIngredient?.id === ingredient.id ? 'selected' : ''} {hasDifferences(ingredient.id) ? 'has-diffs' : ''}"
                onclick={() => selectIngredient(ingredient)}
              >
                <div class="card-header">
                  <h4 class="card-title">{ingredient.name}</h4>
                  {#if hasDifferences(ingredient.id)}
                    <span class="diff-badge" title="Has differences across populations">⚡</span>
                  {/if}
                </div>
                
                {#if ingredient.description}
                  <p class="card-description">{ingredient.description}</p>
                {/if}
                
                <div class="card-populations">
                  {#each Object.entries(POPULATION_TYPES) as [key, value]}
                    {#if ingredientReferences[ingredient.id]?.[value]?.length > 0}
                      <div 
                        class="population-item"
                        style="--pop-color: {populationTypeColors[value]}"
                      >
                        <span class="pop-name">{populationTypeNames[value]}</span>
                        <span class="pop-count">{ingredientReferences[ingredient.id][value].length}</span>
                      </div>
                    {/if}
                  {/each}
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
                  {#if Object.keys(ingredientReferences[ingredient.id] || {}).length === 0}
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
                    <div class="references-compact">
                      {#each Object.entries(POPULATION_TYPES) as [key, value]}
                        {#if ingredientReferences[ingredient.id]?.[value]?.length > 0}
                          <div class="pop-references">
                            <h5 style="color: {populationTypeColors[value]}">{populationTypeNames[value]}</h5>
                            {#each ingredientReferences[ingredient.id][value] as reference}
                              <button 
                                class="ref-chip"
                                onclick={(e) => {
                                  e.stopPropagation();
                                  editReference(ingredient, reference);
                                }}
                              >
                                {reference.healthSystem} {reference.version ? `v${reference.version}` : ''}
                              </button>
                            {/each}
                          </div>
                        {:else}
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
  }
  
  .stat {
    background-color: #e9ecef;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
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
  
  .card-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #2c3e50;
    line-height: 1.4;
  }
  
  .diff-badge {
    font-size: 1.2rem;
    color: #ffc107;
    filter: drop-shadow(0 2px 4px rgba(255, 193, 7, 0.3));
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
  
</style>