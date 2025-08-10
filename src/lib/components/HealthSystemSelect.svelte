<script>
  // Props for health system select component
  let { 
    value = $bindable('ALL'),
    healthSystems = [],
    disabled = false,
    ...restProps
  } = $props();
</script>

<select bind:value {disabled} class="filter-select" {...restProps}>
  {#each healthSystems as system}
    <option value={system}>
      {system === 'ALL' ? 'All Health Systems' : system}
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