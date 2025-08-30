<script>
  import { onMount } from 'svelte';
  import { isFirebaseConfigured, signInAnonymouslyUser, onAuthStateChange } from '../firebase.js';
  import { referenceService, POPULATION_TYPES } from '../firebaseDataService.js';
  import { isIngredientShared } from '../sharedIngredientService.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  // Props using $props() rune
  let {
    sections = [],
    currentIngredient = null,
    currentReferenceName = '',
    loadedReferenceId = null,
    currentPopulationType = POPULATION_TYPES.ADULT,
    currentHealthSystem = null,
    hasUnsavedChanges = false
  } = $props();

  // Internal state
  let firebaseEnabled = $state(isFirebaseConfigured());
  let user = $state(null);
  let showPopulationDropdown = $state(false);
  let availablePopulations = $state([]);
  let loadingPopulations = $state(false);

  $effect(() => {
    if (firebaseEnabled) {
      const unsubscribe = onAuthStateChange((newUser) => {
        user = newUser;
        if (user) {
          console.log('FirebaseSync: User authenticated:', user.uid);
          dispatch('auth-state-changed', { user });
        } else {
          signInAnonymouslyUser().catch(error => {
            console.error('FirebaseSync: Failed to sign in anonymously:', error);
            dispatch('status-updated', { message: 'Firebase sign-in failed', type: 'error' });
          });
        }
      });
      return () => unsubscribe();
    }
  });

  async function saveReference(commitMessage) {
    if (!currentIngredient || !loadedReferenceId) {
      dispatch('status-updated', { message: 'No reference loaded to save', type: 'error' });
      return;
    }

    try {
      const referenceData = {
        id: loadedReferenceId,
        name: currentReferenceName,
        sections: sections,
        populationType: currentPopulationType,
        healthSystem: currentHealthSystem,
      };

      const sharedStatus = await isIngredientShared(currentIngredient.id);

      if (sharedStatus.isShared && sharedStatus.sharedCount > 1) {
        dispatch('request-selective-apply', { referenceData, commitMessage });
      } else {
        await referenceService.saveReference(currentIngredient.id, referenceData, commitMessage);
        dispatch('save-successful', { savedAt: new Date() });
        dispatch('status-updated', { message: 'Reference saved successfully', type: 'success' });
      }
    } catch (error) {
      console.error('Error saving reference:', error);
      dispatch('status-updated', { message: 'Failed to save reference', type: 'error' });
    }
  }

  async function handlePopulationClick() {
    if (loadingPopulations) return;
    loadingPopulations = true;
    try {
      const populations = await referenceService.getAvailablePopulations(currentIngredient.id);
      availablePopulations = populations.map(pop => ({
        ...pop,
        isActive: pop.populationType === currentPopulationType
      }));
      showPopulationDropdown = true;
    } catch (error) {
      console.error('Error loading available populations:', error);
      dispatch('status-updated', { message: 'Could not load population types', type: 'error' });
    } finally {
      loadingPopulations = false;
    }
  }

  function switchToPopulation(populationType, reference) {
    showPopulationDropdown = false;
    dispatch('population-switched', { populationType, reference });
  }

  function getPopulationColor(populationType) {
    const colors = {
      [POPULATION_TYPES.ADULT]: '#007bff',
      [POPULATION_TYPES.PEDIATRIC]: '#28a745',
      [POPULATION_TYPES.NEONATAL]: '#ffc107',
    };
    return colors[populationType] || '#6c757d';
  }

  function getPopulationName(populationType) {
    const names = {
      [POPULATION_TYPES.ADULT]: 'Adult',
      [POPULATION_TYPES.PEDIATRIC]: 'Pediatric',
      [POPULATION_TYPES.NEONATAL]: 'Neonatal',
    };
    return names[populationType] || populationType;
  }

  // Expose methods to parent component
  export {
    saveReference,
    handlePopulationClick,
    switchToPopulation,
    getPopulationColor,
    getPopulationName
  };
</script>

{#if showPopulationDropdown}
  <div class="population-dropdown-backdrop" onclick={() => showPopulationDropdown = false}></div>
  <div class="population-dropdown">
    <div class="dropdown-header">Switch Population Type</div>
    {#if availablePopulations.length === 0}
      <div class="dropdown-empty">No other population types available</div>
    {:else}
      {#each availablePopulations as popOption}
        <div class="population-option {popOption.isActive ? 'active' : ''}">
          <div 
            class="population-option-header"
            style="border-left-color: {getPopulationColor(popOption.populationType)}"
          >
            <span class="population-name">{getPopulationName(popOption.populationType)}</span>
            {#if popOption.isActive}
              <span class="active-badge">Current</span>
            {/if}
          </div>
          {#if popOption.references.length > 0}
            <div class="reference-list">
              {#each popOption.references as ref}
                <button 
                  class="reference-option"
                  onclick={() => switchToPopulation(popOption.populationType, ref)}
                  disabled={popOption.isActive && ref.id === loadedReferenceId}
                >
                  <span class="ref-health-system">🏥 {ref.healthSystem}</span>
                  {#if ref.version}
                    <span class="ref-version">v{ref.version}</span>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
{/if}

<svelte:options accessors={true} />

<style>
  .population-dropdown-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
  }
  
  .population-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 280px;
    max-width: 400px;
    z-index: 1000;
    overflow: hidden;
  }
  
  .dropdown-header {
    padding: 0.75rem 1rem;
    font-weight: 600;
    background-color: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    color: #495057;
  }
  
  .dropdown-empty {
    padding: 1.5rem;
    text-align: center;
    color: #6c757d;
    font-style: italic;
  }
  
  .population-option {
    border-bottom: 1px solid #e9ecef;
  }
  
  .population-option:last-child {
    border-bottom: none;
  }
  
  .population-option.active {
    background-color: #f8f9fa;
  }
  
  .population-option-header {
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-left: 4px solid transparent;
  }
  
  .population-name {
    font-weight: 500;
    color: #212529;
  }
  
  .active-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background-color: #28a745;
    color: white;
    border-radius: 12px;
  }
  
  .reference-list {
    padding: 0.5rem;
    background-color: #fafbfc;
  }
  
  .reference-option {
    width: 100%;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.25rem;
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }
  
  .reference-option:last-child {
    margin-bottom: 0;
  }
  
  .reference-option:hover:not(:disabled) {
    border-color: #0366d6;
    background-color: #f6f8fa;
  }
  
  .reference-option:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: #f1f3f5;
  }
  
  .ref-health-system {
    font-size: 0.875rem;
    color: #586069;
  }
  
  .ref-version {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background-color: #e1e4e8;
    color: #586069;
    border-radius: 10px;
  }
</style>