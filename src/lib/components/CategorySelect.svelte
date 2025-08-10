<script>
  import { CATEGORIES } from '../constants/ingredientConstants.js';
  
  // Props for category select component
  let { 
    value = $bindable('ALL'),
    disabled = false,
    ...restProps
  } = $props();
</script>

<select bind:value {disabled} class="filter-select" {...restProps}>
  {#each CATEGORIES as category}
    <option value={category}>
      {category === 'ALL' ? 'All Categories' : category.replace(/_/g, ' ')}
    </option>
  {/each}
</select>

<style>
  .filter-select {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background-color: var(--color-background);
    transition: var(--transition-fast);
  }
  
  .filter-select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }
  
  .filter-select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>