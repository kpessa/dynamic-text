<script>
  import { getPopulationColor } from '../lib/populationColors.js';
  
  let { 
    ingredientName = '',
    populationType = '',
    healthSystem = '',
    referenceVersion = '',
    availablePopulations = [],
    onPopulationSelect = () => {},
    onIngredientClick = () => {}
  } = $props();
  
  let showPopulationDropdown = $state(false);
  
  function togglePopulationDropdown() {
    showPopulationDropdown = !showPopulationDropdown;
  }
  
  function handlePopulationSelect(popType, ref) {
    onPopulationSelect(popType, ref);
    showPopulationDropdown = false;
  }
  
  function handleBackdropClick() {
    showPopulationDropdown = false;
  }
</script>

{#if ingredientName}
  <div class="ingredient-context-bar">
    <span class="context-label">Current Ingredient:</span>
    <button 
      class="ingredient-pill" 
      onclick={onIngredientClick}
      title="Click to manage ingredient"
    >
      {ingredientName}
    </button>
    
    {#if populationType}
      <span class="context-separator">|</span>
      <span class="context-label">Population:</span>
      <div style="position: relative;">
        <button
          class="population-pill clickable"
          style="background-color: {getPopulationColor(populationType)}"
          onclick={togglePopulationDropdown}
          disabled={!availablePopulations || availablePopulations.length === 0}
        >
          {populationType}
          {#if availablePopulations && availablePopulations.length > 0}
            <span class="dropdown-indicator">▼</span>
          {/if}
        </button>
        
        {#if showPopulationDropdown}
          <div class="population-dropdown-backdrop" onclick={handleBackdropClick}></div>
          <div class="population-dropdown">
            <div class="dropdown-header">Available Populations</div>
            {#if availablePopulations.length === 0}
              <div class="dropdown-empty">No other populations available</div>
            {:else}
              {#each availablePopulations as pop}
                <div class="population-option" class:active={pop.type === populationType}>
                  <div class="population-option-header">
                    <span class="population-name">{pop.type}</span>
                    {#if pop.type === populationType}
                      <span class="active-badge">Active</span>
                    {/if}
                  </div>
                  {#if pop.references && pop.references.length > 0}
                    <div class="reference-list">
                      {#each pop.references as ref}
                        <button
                          class="reference-option"
                          onclick={() => handlePopulationSelect(pop.type, ref)}
                          disabled={pop.type === populationType && ref.healthSystem === healthSystem && ref.version === referenceVersion}
                        >
                          <span class="ref-health-system">{ref.healthSystem}</span>
                          <span class="ref-version">v{ref.version}</span>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
      
      {#if healthSystem}
        <span class="health-system-pill">{healthSystem}</span>
      {/if}
      
      {#if referenceVersion}
        <span class="version-badge">v{referenceVersion}</span>
      {/if}
    {/if}
  </div>
{/if}

<style lang="scss">
  // All styles for this component are in src/styles/components/_sections.scss
  // This ensures consistent styling across the application
</style>