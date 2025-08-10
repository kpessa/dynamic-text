<script>
  let {
    title = 'Ingredient Library',
    totalIngredients = 0,
    filteredCount = 0,
    activeConfigId = null
  } = $props();
  
  let showStats = $derived(filteredCount < totalIngredients || activeConfigId);
</script>

<header class="minimal-header">
  <h1 class="header-title">{title}</h1>
  
  {#if showStats}
    <div class="header-stats">
      {#if activeConfigId}
        <span class="stat-badge config">
          Config: {activeConfigId}
        </span>
      {/if}
      {#if filteredCount < totalIngredients}
        <span class="stat-badge filtered">
          {filteredCount} of {totalIngredients}
        </span>
      {/if}
    </div>
  {/if}
</header>

<style>
  @import '../../styles/ingredientDesignSystem.css';
  
  .minimal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    margin-bottom: var(--space-4);
    
    /* Subtle presence - not competing with content */
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  .header-title {
    margin: 0;
    font-size: var(--text-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    letter-spacing: -0.01em;
    
    /* Subtle gradient for elegance without distraction */
    background: linear-gradient(135deg, 
      var(--color-text-primary) 0%, 
      rgba(var(--color-primary-rgb), 0.8) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .header-stats {
    display: flex;
    gap: var(--space-2);
  }
  
  .stat-badge {
    padding: var(--space-1) var(--space-3);
    background: rgba(0, 0, 0, 0.05);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    white-space: nowrap;
  }
  
  .stat-badge.config {
    background: rgba(var(--color-info-rgb), 0.1);
    color: rgb(var(--color-info-rgb));
  }
  
  .stat-badge.filtered {
    background: rgba(var(--color-warning-rgb), 0.1);
    color: rgb(var(--color-warning-rgb));
  }
  
  /* Dark theme */
  :global([data-theme="dark"]) .minimal-header {
    background: rgba(31, 41, 55, 0.5);
    border-bottom-color: rgba(255, 255, 255, 0.05);
  }
  
  :global([data-theme="dark"]) .stat-badge {
    background: rgba(255, 255, 255, 0.05);
  }
  
  /* Mobile */
  @media (max-width: 640px) {
    .minimal-header {
      padding: var(--space-3) var(--space-4);
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
    }
    
    .header-title {
      font-size: var(--text-lg);
    }
  }
</style>