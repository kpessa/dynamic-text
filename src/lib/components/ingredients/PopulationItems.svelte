<script>
  import { POPULATION_TYPE_NAMES, POPULATION_TYPE_COLORS } from '../../constants/ingredientConstants.js';
  import { POPULATION_TYPES } from '../../firebaseDataService.js';
  
  let {
    references = {},
    selectedHealthSystem = 'ALL',
    onPopulationClick = () => {},
    onLoadReferences = () => {},
    isLoading = false
  } = $props();
  
  function getFilteredReferences(populationType) {
    const popRefs = references[populationType] || [];
    return selectedHealthSystem === 'ALL' 
      ? popRefs 
      : popRefs.filter(ref => ref.healthSystem === selectedHealthSystem);
  }
  
  let hasReferences = $derived(references && Object.keys(references).length > 0);
</script>

<div class="card-populations">
  {#if hasReferences}
    {#each Object.entries(POPULATION_TYPES) as [key, value]}
      {@const filteredRefs = getFilteredReferences(value)}
      {#if filteredRefs.length > 0}
        <button 
          class="population-item"
          style="--pop-color: {POPULATION_TYPE_COLORS[value]}"
          onclick={(e) => {
            e.stopPropagation();
            onPopulationClick(value, filteredRefs[0]);
          }}
          title="Click to load {POPULATION_TYPE_NAMES[value]} reference"
        >
          <span class="pop-name">{POPULATION_TYPE_NAMES[value]}</span>
          <span class="pop-count">{filteredRefs.length}</span>
        </button>
      {/if}
    {/each}
  {:else if !isLoading}
    <button 
      class="load-refs-btn"
      onclick={(e) => {
        e.stopPropagation();
        onLoadReferences();
      }}
    >
      Load References
    </button>
  {/if}
</div>

<style>
  @import '../../styles/ingredientDesignSystem.css';
  
  .card-populations {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-4);
    animation: fadeIn var(--duration-base) var(--ease-out);
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .population-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: linear-gradient(135deg, 
      var(--glass-bg) 0%, 
      var(--glass-bg-light) 100%
    );
    border: 2px solid var(--pop-color);
    border-radius: var(--radius-full);
    cursor: pointer;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    position: relative;
    overflow: hidden;
    transition: all var(--duration-base) var(--ease-bounce);
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  
  /* Color overlay on hover */
  .population-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--pop-color);
    opacity: 0;
    transition: opacity var(--duration-base) var(--ease-out);
  }
  
  .population-item:hover::before {
    opacity: 0.15;
  }
  
  .population-item:hover {
    transform: translateY(-3px) scale(1.05);
    border-color: var(--pop-color);
    box-shadow: 
      0 8px 20px rgba(0, 0, 0, 0.15),
      0 0 20px color-mix(in srgb, var(--pop-color) 30%, transparent),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  
  /* Pulse animation on hover */
  @keyframes popPulse {
    0%, 100% { 
      box-shadow: 
        0 8px 20px rgba(0, 0, 0, 0.15),
        0 0 20px color-mix(in srgb, var(--pop-color) 30%, transparent);
    }
    50% { 
      box-shadow: 
        0 8px 20px rgba(0, 0, 0, 0.15),
        0 0 30px color-mix(in srgb, var(--pop-color) 50%, transparent);
    }
  }
  
  .population-item:hover {
    animation: popPulse 1s infinite;
  }
  
  .pop-name {
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.01em;
    position: relative;
    z-index: 1;
  }
  
  .pop-count {
    background: linear-gradient(135deg, 
      var(--pop-color), 
      color-mix(in srgb, var(--pop-color) 80%, black)
    );
    color: white;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
    font-weight: var(--font-weight-bold);
    font-size: calc(var(--text-xs) * 0.9);
    min-width: 20px;
    text-align: center;
    box-shadow: 
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 2px 4px rgba(0, 0, 0, 0.2);
    position: relative;
    z-index: 1;
    transition: all var(--duration-base) var(--ease-out);
  }
  
  .population-item:hover .pop-count {
    transform: scale(1.1);
    box-shadow: 
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      0 4px 8px rgba(0, 0, 0, 0.3);
  }
  
  .load-refs-btn {
    padding: var(--space-2) var(--space-4);
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.1), 
      rgba(var(--color-primary-rgb), 0.2)
    );
    color: rgb(var(--color-primary-rgb));
    border: 2px solid rgba(var(--color-primary-rgb), 0.3);
    border-radius: var(--radius-full);
    cursor: pointer;
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    position: relative;
    overflow: hidden;
    transition: all var(--duration-base) var(--ease-out);
    box-shadow: var(--shadow-elevation-low);
  }
  
  /* Shimmer effect */
  .load-refs-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent, 
      rgba(255, 255, 255, 0.3), 
      transparent
    );
    transition: left var(--duration-slow) var(--ease-out);
  }
  
  .load-refs-btn:hover::before {
    left: 100%;
  }
  
  .load-refs-btn:hover {
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.2), 
      rgba(var(--color-primary-rgb), 0.3)
    );
    border-color: rgba(var(--color-primary-rgb), 0.5);
    transform: translateY(-2px) scale(1.05);
    box-shadow: 
      var(--shadow-elevation-medium),
      0 0 20px rgba(var(--color-primary-rgb), 0.3);
  }
  /* Dark theme adaptations */
  :global([data-theme="dark"]) .population-item {
    background: linear-gradient(135deg, 
      rgba(31, 41, 55, 0.8), 
      rgba(31, 41, 55, 0.6)
    );
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }
  
  :global([data-theme="dark"]) .load-refs-btn {
    box-shadow: 
      var(--shadow-elevation-low),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }
  
  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .population-item,
    .load-refs-btn {
      animation: none !important;
      transition-duration: 0.01ms !important;
    }
    
    .load-refs-btn::before {
      display: none;
    }
  }
  
  .population-item:focus-visible,
  .load-refs-btn:focus-visible {
    outline: var(--focus-ring-width) solid var(--focus-ring-color);
    outline-offset: var(--focus-ring-offset);
  }
</style>