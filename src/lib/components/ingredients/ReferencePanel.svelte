<script>
  import ReferenceChip from './ReferenceChip.svelte';
  import { POPULATION_TYPES } from '../../firebaseDataService.js';
  import { POPULATION_TYPE_NAMES, POPULATION_TYPE_COLORS } from '../../constants/ingredientConstants.js';
  
  let {
    ingredient,
    references = null,
    isLoading = false,
    selectedHealthSystem = 'ALL',
    onEditReference = () => {},
    onCreateReference = () => {},
    onCompareBaseline = () => {},
    onRevertBaseline = () => {},
    onUpdateValidation = () => {}
  } = $props();
  
  function getFilteredReferences(populationType) {
    const popRefs = references?.[populationType] || [];
    return selectedHealthSystem === 'ALL' 
      ? popRefs 
      : popRefs.filter(ref => ref.healthSystem === selectedHealthSystem);
  }
</script>

<div class="expanded-details">
  {#if isLoading}
    <div class="loading-references">
      <div class="spinner small"></div>
      <span>Loading references...</span>
    </div>
  {:else if references}
    <div class="references-compact">
      {#each Object.entries(POPULATION_TYPES) as [key, value]}
        {@const filteredRefs = getFilteredReferences(value)}
        {#if filteredRefs.length > 0}
          <div class="pop-references">
            <h5 style="color: {POPULATION_TYPE_COLORS[value]}">{POPULATION_TYPE_NAMES[value]}</h5>
            {#each filteredRefs as reference}
              <ReferenceChip
                {reference}
                onEdit={(ref) => onEditReference(ingredient, ref)}
                onCompareBaseline={async (ref) => {
                  // Check baseline status first
                  const { checkBaselineStatus } = await import('../../firebaseDataService.js');
                  const status = await checkBaselineStatus(ingredient, ref);
                  if (status?.status === 'MODIFIED') {
                    onCompareBaseline(ingredient, ref);
                  } else if (status?.status === 'CLEAN') {
                    alert('This reference matches the baseline.');
                  }
                }}
                onRevertBaseline={(ref) => onRevertBaseline(ingredient, ref)}
                onUpdateValidation={async (validationData) => {
                  await onUpdateValidation(ingredient.id, reference.id, validationData);
                }}
              />
            {/each}
          </div>
        {:else}
          {@const popRefs = references[value] || []}
          {#if popRefs.length === 0}
            <div class="pop-references empty">
              <h5 style="color: {POPULATION_TYPE_COLORS[value]}">{POPULATION_TYPE_NAMES[value]}</h5>
              <button 
                class="add-ref-btn"
                onclick={(e) => {
                  e.stopPropagation();
                  onCreateReference(ingredient, value);
                }}
              >
                + Add
              </button>
            </div>
          {/if}
        {/if}
      {/each}
    </div>
  {:else}
    <div class="no-references">
      <p>No reference data loaded</p>
    </div>
  {/if}
</div>

<style>
  .expanded-details {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }
  
  .loading-references {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    color: var(--color-text-secondary);
  }
  
  .spinner {
    width: 1.5rem;
    height: 1.5rem;
    border: 3px solid var(--color-primary-200);
    border-top-color: var(--color-primary-600);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  .spinner.small {
    width: 1rem;
    height: 1rem;
    border-width: 2px;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .references-compact {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .pop-references {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .pop-references h5 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }
  
  .pop-references.empty {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }
  
  .add-ref-btn {
    padding: 0.25rem 0.5rem;
    background-color: var(--color-success-100);
    color: var(--color-success-700);
    border: 1px solid var(--color-success-300);
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .add-ref-btn:hover {
    background-color: var(--color-success-200);
    border-color: var(--color-success-500);
  }
  
  .no-references {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
</style>