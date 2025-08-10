<script>
  import { sectionStore } from '../../stores/sectionStore.svelte.ts';
  import { workspaceStore } from '../../stores/workspaceStore.svelte.ts';
  import { uiStore } from '../../stores/uiStore.svelte.ts';
  import SectionList from './SectionList.svelte';
  import TestRunner from './TestRunner.svelte';
  import ValidationStatus from '../ValidationStatus.svelte';
  import { POPULATION_TYPES } from '../firebaseDataService.js';
  
  // Props
  let { 
    onRunAllTests = () => {},
    onPopulationClick = () => {},
    onSwitchPopulation = () => {},
    getPopulationColor = () => '#ccc',
    getPopulationName = () => 'Unknown'
  } = $props();
  
  // Reactive getters from stores
  const sections = $derived(sectionStore.sections);
  const loadedIngredient = $derived(workspaceStore.loadedIngredient);
  const loadedReference = $derived(workspaceStore.loadedReference);
  const currentPopulationType = $derived(workspaceStore.currentPopulationType);
  const currentHealthSystem = $derived(workspaceStore.currentHealthSystem);
  const showPopulationDropdown = $derived(uiStore.showPopulationDropdown);
  const availablePopulations = $derived(workspaceStore.availablePopulations);
  const loadingPopulations = $derived(uiStore.loadingPopulations);
  const hasUnsavedChanges = $derived(workspaceStore.hasUnsavedChanges);
  const loadedReferenceId = $derived(workspaceStore.loadedReferenceId);
  
  function handleAddSection(type) {
    sectionStore.addSection(type);
    workspaceStore.markAsChanged();
  }
  
  function handleValidationUpdate(validationData) {
    workspaceStore.updateValidation(validationData);
  }
</script>

<div class="editor-panel">
  <div class="panel-header">
    <h2>Content Sections</h2>
    <div class="header-controls">
      <TestRunner {onRunAllTests} />
      <div class="add-section-buttons">
        <button class="add-btn" onclick={() => handleAddSection('static')}>
          + Static HTML
        </button>
        <button class="add-btn" onclick={() => handleAddSection('dynamic')}>
          + Dynamic JS
        </button>
      </div>
    </div>
  </div>
  
  {#if loadedIngredient && loadedReference}
    <div class="ingredient-context-bar">
      <span class="context-label">Editing:</span>
      <button 
        class="ingredient-pill"
        onclick={() => uiStore.setShowIngredientManager(true)}
        title="Click to open ingredient manager"
      >
        📦 {loadedIngredient.name}
      </button>
      <span class="context-separator">→</span>
      <button 
        class="population-pill clickable"
        style="background-color: {getPopulationColor(currentPopulationType)}"
        onclick={onPopulationClick}
        disabled={loadingPopulations}
        title="Click to switch population type"
      >
        {getPopulationName(currentPopulationType)}
        <span class="dropdown-indicator">▼</span>
      </button>
      
      {#if showPopulationDropdown}
        <div 
          class="population-dropdown-backdrop" 
          onclick={() => uiStore.setShowPopulationDropdown(false)}
          onkeydown={(e) => e.key === 'Enter' && uiStore.setShowPopulationDropdown(false)}
          role="button"
          tabindex="0"
          aria-label="Close population dropdown"
        ></div>
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
                        onclick={() => onSwitchPopulation(popOption.populationType, ref)}
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
      {#if currentHealthSystem}
        <span class="context-separator">→</span>
        <span class="health-system-pill">
          🏥 {currentHealthSystem}
        </span>
      {/if}
      {#if loadedReference.version}
        <span class="version-badge">v{loadedReference.version}</span>
      {/if}
    </div>
    
    <!-- Validation Status Section -->
    <div class="validation-section">
      <ValidationStatus 
        status={workspaceStore.currentValidationStatus}
        validatedBy={workspaceStore.currentValidatedBy}
        validatedAt={workspaceStore.currentValidatedAt}
        testResults={workspaceStore.currentTestResults}
        notes={workspaceStore.currentValidationNotes}
        compact={false}
        onUpdate={handleValidationUpdate}
      />
    </div>
  {/if}
  
  <SectionList />
</div>

<style>
  .editor-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
  }
  
  .header-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .add-section-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .add-btn {
    padding: 0.5rem 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }
  
  .add-btn:hover {
    background: #0056b3;
  }
  
  .ingredient-context-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    font-size: 0.9rem;
    position: relative;
  }
  
  .context-label {
    color: #6c757d;
    font-weight: 500;
  }
  
  .ingredient-pill, .population-pill, .health-system-pill {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 500;
    border: 1px solid #dee2e6;
    background: white;
  }
  
  .ingredient-pill {
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .ingredient-pill:hover {
    background: #e9ecef;
  }
  
  .population-pill.clickable {
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  
  .population-pill.clickable:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .dropdown-indicator {
    margin-left: 0.5rem;
    font-size: 0.7rem;
  }
  
  .context-separator {
    color: #adb5bd;
    margin: 0 0.25rem;
  }
  
  .version-badge {
    padding: 0.2rem 0.5rem;
    background: #28a745;
    color: white;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .population-dropdown-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 998;
  }
  
  .population-dropdown {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999;
    min-width: 300px;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .dropdown-header {
    padding: 0.75rem 1rem;
    font-weight: 600;
    border-bottom: 1px solid #e9ecef;
    background: #f8f9fa;
    font-size: 0.9rem;
  }
  
  .dropdown-empty {
    padding: 1rem;
    text-align: center;
    color: #6c757d;
    font-style: italic;
  }
  
  .population-option {
    border-bottom: 1px solid #f1f3f4;
  }
  
  .population-option:last-child {
    border-bottom: none;
  }
  
  .population-option-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-left: 3px solid;
    font-weight: 500;
  }
  
  .population-option.active .population-option-header {
    background: #f8f9fa;
  }
  
  .active-badge {
    background: #28a745;
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .reference-list {
    padding: 0.5rem 1rem 0.75rem 2rem;
  }
  
  .reference-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.5rem;
    margin: 0.25rem 0;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .reference-option:hover {
    background: #f8f9fa;
    border-color: #007bff;
  }
  
  .reference-option:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .ref-health-system {
    font-weight: 500;
  }
  
  .ref-version {
    background: #6c757d;
    color: white;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }
  
  .validation-section {
    border-bottom: 1px solid #e0e0e0;
  }
</style>