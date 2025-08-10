<script>
  // Props for search input component
  let { 
    value = $bindable(''),
    placeholder = '🔍 Search ingredients...',
    disabled = false,
    ...restProps
  } = $props();
</script>

<input
  type="text"
  {placeholder}
  {disabled}
  bind:value
  class="search-input"
  {...restProps}
/>

<style>
  .search-input {
    flex: 1;
    min-width: 200px;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background-color: var(--color-background);
    transition: var(--transition-fast);
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }
  
  .search-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>