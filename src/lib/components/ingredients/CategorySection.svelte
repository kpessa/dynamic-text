<script>
  import IngredientCard from './IngredientCard.svelte';
  import { getCategoryColor } from '../../constants/ingredientConstants.js';
  
  let {
    category = '',
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
  
  let categoryColor = $derived(getCategoryColor(category));
  let formattedCategory = $derived(category.replace(/_/g, ' '));
</script>

<div class="category-section">
  <h3 class="category-title" style="--category-color: {categoryColor}">
    {formattedCategory}
    <span class="category-count">({ingredients.length})</span>
  </h3>
  
  <div class="category-grid">
    {#each ingredients as ingredient (ingredient.id)}
      <IngredientCard
        {ingredient}
        references={ingredientReferences[ingredient.id]}
        isExpanded={expandedIngredients.has(ingredient.id)}
        isSelected={selectedIngredients.has(ingredient.id)}
        {selectionMode}
        isLoading={referenceLoadingStates.has(ingredient.id)}
        {selectedHealthSystem}
        {currentIngredient}
        sharedStatus={sharedStatuses[ingredient.id]}
        onSelect={onSelectIngredient}
        onToggleExpand={onToggleExpand}
        onEditReference={onEditReference}
        onCreateReference={onCreateReference}
        onLoadReferences={onLoadReferences}
        onVersionClick={onVersionClick}
        onShareClick={onShareClick}
        onVariationClick={onVariationClick}
        onCompareBaseline={onCompareBaseline}
        onRevertBaseline={onRevertBaseline}
        onUpdateValidation={onUpdateValidation}
      />
    {/each}
  </div>
</div>

<style>
  @import '../../styles/ingredientDesignSystem.css';
  
  .category-section {
    margin-bottom: var(--space-8);
    animation: fadeInUp var(--duration-fast) var(--ease-out) both;
    animation-delay: calc(var(--section-index, 0) * 50ms);
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .category-title {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-2);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    position: relative;
    letter-spacing: -0.01em;
    
    /* Subtle monochrome for less distraction */
    color: var(--color-text-secondary);
    opacity: 0.8;
    transition: opacity var(--duration-base) var(--ease-out);
  }
  
  .category-section:hover .category-title {
    opacity: 1;
  }
  
  /* Simple underline - no animation to reduce distraction */
  .category-title::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--color-border);
    opacity: 0.3;
  }
  
  .category-count {
    font-size: var(--text-lg);
    font-weight: var(--font-weight-normal);
    background: linear-gradient(135deg, 
      var(--color-text-secondary) 0%, 
      var(--color-text-muted) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    opacity: 0.8;
    transition: opacity var(--duration-base) var(--ease-out);
  }
  
  .category-section:hover .category-count {
    opacity: 1;
  }
  
  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-4);
    container-type: inline-size;
    position: relative;
  }
  
  /* Add stagger index to cards */
  .category-grid > :global(*) {
    --stagger-index: var(--card-index, 0);
  }
  
  @container (min-width: 768px) {
    .category-grid {
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: var(--space-5);
    }
  }
  
  @container (min-width: 1200px) {
    .category-grid {
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: var(--space-6);
    }
  }
  
  /* Grid background pattern */
  .category-grid::before {
    content: '';
    position: absolute;
    inset: -20px;
    background-image: 
      radial-gradient(circle at 20% 50%, 
        color-mix(in srgb, var(--category-color, var(--color-primary)) 5%, transparent) 0%, 
        transparent 50%),
      radial-gradient(circle at 80% 80%, 
        color-mix(in srgb, var(--category-color, var(--color-primary)) 3%, transparent) 0%, 
        transparent 50%);
    z-index: -1;
    opacity: 0;
    transition: opacity var(--duration-slow) var(--ease-out);
    pointer-events: none;
  }
  
  .category-section:hover .category-grid::before {
    opacity: 1;
  }
  /* Dark theme adaptations */
  :global([data-theme="dark"]) .category-title {
    background: linear-gradient(135deg, 
      var(--category-color, var(--color-primary)) 0%, 
      color-mix(in srgb, var(--category-color, var(--color-primary)) 60%, white) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  :global([data-theme="dark"]) .category-title::after {
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.3),
      0 0 20px color-mix(in srgb, var(--category-color, var(--color-primary)) 30%, transparent);
  }
  
  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .category-section,
    .category-title::after {
      animation: none !important;
    }
    
    .category-grid::before {
      display: none;
    }
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .category-title {
      background: none;
      -webkit-text-fill-color: var(--category-color, var(--color-text-primary));
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-decoration-color: var(--category-color, var(--color-primary));
    }
    
    .category-title::after {
      display: none;
    }
  }
</style>