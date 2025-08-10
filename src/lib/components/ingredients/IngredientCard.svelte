<script>
  import IngredientCardHeader from './IngredientCardHeader.svelte';
  import PopulationItems from './PopulationItems.svelte';
  import ReferencePanel from './ReferencePanel.svelte';
  import { getCategoryColor } from '../../constants/ingredientConstants.js';
  import { getKeyCategory } from '../../tpnLegacy.js';
  import { POPULATION_TYPES } from '../../firebaseDataService.js';
  
  let {
    ingredient,
    references = null,
    isExpanded = $bindable(false),
    isSelected = $bindable(false),
    selectionMode = false,
    isLoading = false,
    selectedHealthSystem = 'ALL',
    currentIngredient = null,
    sharedStatus = null,
    onSelect = () => {},
    onToggleExpand = () => {},
    onEditReference = () => {},
    onCreateReference = () => {},
    onLoadReferences = () => {},
    onVersionClick = () => {},
    onShareClick = () => {},
    onVariationClick = () => {},
    onCompareBaseline = () => {},
    onRevertBaseline = () => {},
    onUpdateValidation = () => {}
  } = $props();
  
  let category = $derived(getKeyCategory(ingredient.name));
  let categoryColor = $derived(getCategoryColor(category));
  let hasDifferences = $derived(() => {
    if (!references) return false;
    const allRefs = Object.values(references).flat();
    return allRefs.some(ref => ref.status === 'MODIFIED');
  });
  
  function handleCardClick() {
    if (selectionMode) {
      isSelected = !isSelected;
    } else {
      onSelect(ingredient, true);
    }
  }
  
  function handleSelectionChange(e) {
    e.stopPropagation();
    isSelected = !isSelected;
  }
  
  function handlePopulationClick(populationType, reference) {
    onSelect(ingredient, false);
    if (reference) {
      onEditReference(ingredient, reference);
    }
  }
  
  function handleToggleExpand(e) {
    e.stopPropagation();
    isExpanded = !isExpanded;
    onToggleExpand(ingredient.id);
  }
  
  function handleAddReference(e) {
    e.stopPropagation();
    onCreateReference(ingredient, POPULATION_TYPES.ADULT);
  }
</script>

<div 
  class="ingredient-card {isSelected ? 'selected' : ''} {currentIngredient?.id === ingredient.id ? 'active' : ''}"
  style="--category-color: {categoryColor}"
  onclick={handleCardClick}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleCardClick();
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
        checked={isSelected}
        onclick={(e) => e.stopPropagation()}
        onchange={handleSelectionChange}
      />
    </div>
  {/if}
  
  <IngredientCardHeader
    name={ingredient.name}
    version={ingredient.version}
    isShared={sharedStatus?.isShared}
    sharedCount={sharedStatus?.sharedCount}
    hasDifferences={hasDifferences()}
    isLoading={isLoading}
    onVersionClick={() => onVersionClick(ingredient)}
    onShareClick={() => onShareClick(ingredient)}
    onVariationClick={() => onVariationClick(ingredient)}
  />
  
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
  
  <PopulationItems
    references={references}
    selectedHealthSystem={selectedHealthSystem}
    isLoading={isLoading}
    onPopulationClick={handlePopulationClick}
    onLoadReferences={() => onLoadReferences(ingredient.id)}
  />
  
  <div class="card-footer">
    <button 
      class="card-action-btn view-btn"
      onclick={handleToggleExpand}
    >
      {isExpanded ? 'Hide Details' : 'View Details'}
    </button>
    {#if references && Object.keys(references || {}).length === 0}
      <button 
        class="card-action-btn add-btn"
        onclick={handleAddReference}
      >
        + Add Reference
      </button>
    {/if}
  </div>
  
  {#if isExpanded}
    <ReferencePanel
      ingredient={ingredient}
      references={references}
      isLoading={isLoading}
      selectedHealthSystem={selectedHealthSystem}
      onEditReference={onEditReference}
      onCreateReference={onCreateReference}
      onCompareBaseline={onCompareBaseline}
      onRevertBaseline={onRevertBaseline}
      onUpdateValidation={onUpdateValidation}
    />
  {/if}
</div>

<style>
  @import '../../styles/ingredientDesignSystem.css';
  
  .ingredient-card {
    /* Enhanced prominence - cards are the focus */
    background: var(--glass-bg-heavy);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
    box-shadow: var(--shadow-elevation-medium);
    
    /* Slightly larger by default for prominence */
    transform: scale(1.02) translateZ(0);
    
    /* Animation and interaction */
    transition: all var(--duration-base) var(--ease-out);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    
    /* Staggered animation */
    animation: fadeInUp var(--duration-base) var(--ease-out) both;
    animation-delay: calc(var(--stagger-index, 0) * 50ms);
  }
  
  /* Category color gradient accent */
  .ingredient-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, 
      var(--category-color, var(--color-primary)), 
      color-mix(in srgb, var(--category-color, var(--color-primary)) 80%, white)
    );
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }
  
  .ingredient-card:hover {
    transform: translateY(-6px) scale(1.04) translateZ(0);
    box-shadow: var(--shadow-elevation-high);
    background: var(--glass-bg-heavy);
    border-color: rgba(var(--color-primary-rgb), 0.4);
    z-index: 10;
  }
  
  /* Subtle glow on hover */
  .ingredient-card:hover::after {
    content: '';
    position: absolute;
    inset: -1px;
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.1), 
      rgba(var(--color-secondary-rgb), 0.1)
    );
    border-radius: inherit;
    z-index: -1;
    opacity: 0;
    animation: glowPulse var(--duration-slow) ease-in-out;
  }
  
  @keyframes glowPulse {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }
  
  .ingredient-card.selected {
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.15), 
      rgba(var(--color-primary-rgb), 0.05)
    );
    border-color: rgba(var(--color-primary-rgb), 0.5);
    box-shadow: 
      var(--shadow-elevation-low),
      0 0 20px rgba(var(--color-primary-rgb), 0.2);
  }
  
  .ingredient-card.active {
    background: linear-gradient(135deg, 
      rgba(var(--color-success-rgb), 0.15), 
      rgba(var(--color-success-rgb), 0.05)
    );
    border-color: rgba(var(--color-success-rgb), 0.5);
    box-shadow: 
      var(--shadow-elevation-low),
      0 0 20px rgba(var(--color-success-rgb), 0.2);
  }
  
  .selection-checkbox {
    position: absolute;
    top: var(--space-4);
    left: var(--space-4);
    z-index: 10;
  }
  
  .selection-checkbox input[type="checkbox"] {
    cursor: pointer;
    width: 1.25rem;
    height: 1.25rem;
    accent-color: rgb(var(--color-primary-rgb));
    transition: transform var(--duration-fast) var(--ease-bounce);
  }
  
  .selection-checkbox input[type="checkbox"]:checked {
    transform: scale(1.1);
  }
  
  .card-description {
    margin: 0.5rem 0;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    line-height: 1.5;
  }
  
  .card-metadata {
    margin: 0.5rem 0;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
  
  .card-footer {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }
  
  .card-action-btn {
    padding: var(--space-2) var(--space-4);
    border: none;
    border-radius: var(--radius-lg);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all var(--duration-base) var(--ease-out);
  }
  
  /* Ripple effect on click */
  .card-action-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: translate(-50%, -50%);
    transition: width var(--duration-slow), height var(--duration-slow);
  }
  
  .card-action-btn:active::after {
    width: 100px;
    height: 100px;
  }
  
  .card-action-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-elevation-low);
  }
  
  .view-btn {
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.1), 
      rgba(var(--color-primary-rgb), 0.2)
    );
    color: rgb(var(--color-primary-rgb));
    border: 1px solid rgba(var(--color-primary-rgb), 0.3);
  }
  
  .view-btn:hover {
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.2), 
      rgba(var(--color-primary-rgb), 0.3)
    );
    border-color: rgba(var(--color-primary-rgb), 0.5);
    box-shadow: 
      var(--shadow-elevation-low),
      0 0 15px rgba(var(--color-primary-rgb), 0.3);
  }
  
  .add-btn {
    background: linear-gradient(135deg, 
      rgba(var(--color-success-rgb), 0.1), 
      rgba(var(--color-success-rgb), 0.2)
    );
    color: rgb(var(--color-success-rgb));
    border: 1px solid rgba(var(--color-success-rgb), 0.3);
  }
  
  .add-btn:hover {
    background: linear-gradient(135deg, 
      rgba(var(--color-success-rgb), 0.2), 
      rgba(var(--color-success-rgb), 0.3)
    );
    border-color: rgba(var(--color-success-rgb), 0.5);
    box-shadow: 
      var(--shadow-elevation-low),
      0 0 15px rgba(var(--color-success-rgb), 0.3);
  }
  /* Dark theme adaptations */
  :global([data-theme="dark"]) .ingredient-card {
    background: var(--glass-bg);
    border-color: var(--glass-border);
  }
  
  :global([data-theme="dark"]) .ingredient-card:hover {
    background: var(--glass-bg-heavy);
  }
  
  /* Accessibility enhancements */
  .ingredient-card:focus-visible {
    outline: var(--focus-ring-width) solid var(--focus-ring-color);
    outline-offset: var(--focus-ring-offset);
  }
  
  @media (prefers-reduced-motion: reduce) {
    .ingredient-card {
      animation: none !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>