<script>
  import CategorySection from './CategorySection.svelte';
  import { 
    groupIngredientsByCategory, 
    sortGroupsByCategory 
  } from '../../utils/ingredientUtils.js';
  import { onMount } from 'svelte';
  
  let {
    ingredients = [],
    ingredientReferences = {},
    expandedIngredients = new Map(),
    selectedIngredients = new Set(),
    selectionMode = false,
    referenceLoadingStates = new Map(),
    selectedHealthSystem = 'ALL',
    currentIngredient = null,
    sharedStatuses = {},
    onSelectIngredient = () => {},
    onToggleExpand = () => {},
    onEditReference = () => {},
    onCreateReference = () => {},
    onLoadReferences = () => {},
    onToggleSelection = () => {},
    onVersionClick = () => {},
    onShareClick = () => {},
    onVariationClick = () => {},
    onCompareBaseline = () => {},
    onRevertBaseline = () => {},
    onUpdateValidation = () => {}
  } = $props();
  
  // Group and sort ingredients by category
  let groupedIngredients = $derived.by(() => {
    const grouped = groupIngredientsByCategory(ingredients);
    return sortGroupsByCategory(grouped);
  });
  
  let hasIngredients = $derived(Object.keys(groupedIngredients).length > 0);
  let mounted = $state(false);
  
  onMount(() => {
    // Trigger staggered animations after mount
    requestAnimationFrame(() => {
      mounted = true;
    });
  });
</script>

<div class="ingredients-grid-container {mounted ? 'mounted' : ''}">
  {#if hasIngredients}
    {#each Object.entries(groupedIngredients) as [category, categoryIngredients], sectionIndex (category)}
      <div style="--section-index: {sectionIndex}">
        <CategorySection
        {category}
        ingredients={categoryIngredients}
        {ingredientReferences}
        {expandedIngredients}
        {selectedIngredients}
        {selectionMode}
        {referenceLoadingStates}
        {selectedHealthSystem}
        {currentIngredient}
        {sharedStatuses}
        {onSelectIngredient}
        {onToggleExpand}
        {onEditReference}
        {onCreateReference}
        {onLoadReferences}
        {onToggleSelection}
        {onVersionClick}
        {onShareClick}
        {onVariationClick}
        {onCompareBaseline}
        {onRevertBaseline}
        {onUpdateValidation}
        />
      </div>
    {/each}
  {:else}
    <div class="no-results">
      <div class="no-results-icon">📦</div>
      <h3>No ingredients found</h3>
      <p>
        {#if ingredients.length === 0}
          Import your data using the migration tool or create new ingredients.
        {:else}
          Try adjusting your filters to see ingredients.
        {/if}
      </p>
    </div>
  {/if}
</div>

<style>
  @import '../../styles/ingredientDesignSystem.css';
  
  .ingredients-grid-container {
    /* Minimal padding - content is the focus */
    padding: var(--space-2) 0;
    position: relative;
    min-height: 200px;
  }
  
  /* Faster, subtler entrance animation */
  .ingredients-grid-container > :global(*) {
    opacity: 0;
    transform: translateY(10px);
    transition: 
      opacity var(--duration-base) var(--ease-out),
      transform var(--duration-base) var(--ease-out);
    transition-delay: calc(var(--section-index, 0) * 50ms);
  }
  
  .ingredients-grid-container.mounted > :global(*) {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* Subtle, always-visible background for depth */
  .ingredients-grid-container::before {
    content: '';
    position: absolute;
    top: -50px;
    left: -50px;
    right: -50px;
    bottom: -50px;
    background: 
      radial-gradient(circle at 10% 20%, 
        rgba(var(--color-primary-rgb), 0.01) 0%, 
        transparent 50%),
      radial-gradient(circle at 80% 80%, 
        rgba(var(--color-secondary-rgb), 0.01) 0%, 
        transparent 50%);
    z-index: -1;
    opacity: 1;
    pointer-events: none;
  }
  
  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12) var(--space-8);
    text-align: center;
    color: var(--color-text-secondary);
    animation: fadeIn var(--duration-slow) var(--ease-out);
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .no-results-icon {
    font-size: 5rem;
    margin-bottom: var(--space-6);
    opacity: 0.3;
    animation: bounce 2s infinite;
  }
  
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  .no-results h3 {
    font-size: var(--text-2xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-3);
    background: linear-gradient(135deg, 
      var(--color-text-primary) 0%, 
      var(--color-text-secondary) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .no-results p {
    max-width: 400px;
    line-height: 1.6;
    font-size: var(--text-base);
    opacity: 0.8;
  }
  /* Dark theme adaptations */
  :global([data-theme="dark"]) .ingredients-grid-container::before {
    background: 
      radial-gradient(circle at 10% 20%, 
        rgba(var(--color-primary-rgb), 0.05) 0%, 
        transparent 50%),
      radial-gradient(circle at 80% 80%, 
        rgba(var(--color-secondary-rgb), 0.05) 0%, 
        transparent 50%);
  }
  
  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .ingredients-grid-container > :global(*),
    .no-results,
    .no-results-icon {
      animation: none !important;
      transition: none !important;
    }
    
    .ingredients-grid-container.mounted > :global(*) {
      opacity: 1;
      transform: none;
    }
  }
</style>