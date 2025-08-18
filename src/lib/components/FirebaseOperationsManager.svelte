import { logError } from '$lib/logger';
<script lang="ts">
  import { firebaseDataService } from '../firebaseDataService';
  import { workspaceStore } from '../../stores/workspaceStore.svelte';
  import { sectionStore } from '../../stores/sectionStore.svelte';
  import { eventBus } from '../utils/eventBus';
  import type { Section, Reference, Ingredient, ConfigData } from '../types';
  
  interface Props {
    firebaseEnabled?: boolean;
    currentIngredient?: string;
    activeConfigId?: string | null;
    onReferenceLoad?: (reference: Reference, ingredient?: Ingredient) => void;
    onReferenceSave?: (sections: Section[]) => Promise<Section[]>;
    onConfigActivate?: (configId: string, ingredients: Ingredient[]) => void;
    onIngredientSelect?: (ingredient: Ingredient) => void;
    onReferenceCreate?: (data: any) => void;
    onReferenceEdit?: (referenceId: string, data: any) => void;
  }
  
  let {
    firebaseEnabled = false,
    currentIngredient = '',
    activeConfigId = null,
    onReferenceLoad = () => {},
    onReferenceSave = async (sections) => sections,
    onConfigActivate = () => {},
    onIngredientSelect = () => {},
    onReferenceCreate = () => {},
    onReferenceEdit = () => {}
  }: Props = $props();
  
  // Local state for Firebase operations
  let showIngredientManager = $state(false);
  let showMigrationTool = $state(false);
  let showDiffViewer = $state(false);
  let showConfigImport = $state(false);
  let showReferenceSelector = $state(false);
  let selectedHealthSystem = $state('');
  let selectedPopulation = $state('');
  let loadingReferences = $state(false);
  let availableReferences = $state([]);
  let selectedReference = $state(null);
  
  // Load reference from Firebase
  async function handleLoadReference(referenceId: string, ingredientId?: string) {
    if (!firebaseEnabled) return;
    
    try {
      loadingReferences = true;
      
      // Get the reference data
      const referenceDoc = await firebaseDataService.getReference(
        ingredientId || currentIngredient,
        referenceId
      );
      
      if (!referenceDoc.exists()) {
        throw new Error('Reference not found');
      }
      
      const reference = {
        id: referenceDoc.id,
        ...referenceDoc.data()
      };
      
      // Get the ingredient data if needed
      let ingredient = null;
      if (ingredientId) {
        const ingredientDoc = await firebaseDataService.getIngredient(ingredientId);
        if (ingredientDoc.exists()) {
          ingredient = {
            id: ingredientDoc.id,
            ...ingredientDoc.data()
          };
        }
      }
      
      // Update stores
      workspaceStore.setLoadedIngredient(ingredientId || currentIngredient);
      workspaceStore.setLoadedReferenceId(referenceId);
      workspaceStore.setCurrentHealthSystem(reference.healthSystem);
      
      // Call parent handler
      onReferenceLoad(reference, ingredient);
      
      // Emit event
      eventBus.emit('firebase:reference-loaded', {
        referenceId,
        ingredientId: ingredientId || currentIngredient,
        reference,
        ingredient
      });
      
    } catch (error) {
      logError('Failed to load reference:', error);
      eventBus.emit('firebase:error', { 
        operation: 'load-reference', 
        error 
      });
    } finally {
      loadingReferences = false;
    }
  }
  
  // Save reference to Firebase
  async function handleSaveReference() {
    if (!firebaseEnabled || !currentIngredient) return;
    
    try {
      const sections = sectionStore.getSections();
      const processedSections = await onReferenceSave(sections);
      
      const referenceId = workspaceStore.getLoadedReferenceId();
      if (!referenceId) {
        throw new Error('No reference loaded to save');
      }
      
      // Save to Firebase
      await firebaseDataService.saveReference(
        currentIngredient,
        referenceId,
        {
          sections: processedSections,
          lastModified: Date.now(),
          modifiedBy: 'user' // Would come from auth in real app
        }
      );
      
      // Emit success event
      eventBus.emit('firebase:reference-saved', {
        referenceId,
        ingredientId: currentIngredient,
        sections: processedSections
      });
      
    } catch (error) {
      logError('Failed to save reference:', error);
      eventBus.emit('firebase:error', { 
        operation: 'save-reference', 
        error 
      });
    }
  }
  
  // Activate configuration
  async function handleConfigActivate(configId: string) {
    if (!firebaseEnabled) return;
    
    try {
      // Get config data
      const config = await firebaseDataService.getConfig(configId);
      if (!config.exists()) {
        throw new Error('Configuration not found');
      }
      
      const configData = config.data();
      
      // Get ingredients for this config
      const ingredientsSnapshot = await firebaseDataService.getConfigIngredients(configId);
      const ingredients = [];
      
      ingredientsSnapshot.forEach(doc => {
        ingredients.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Update stores
      workspaceStore.setActiveConfigId(configId);
      workspaceStore.setActiveConfigIngredients(ingredients);
      
      // Call parent handler
      onConfigActivate(configId, ingredients);
      
      // Emit event
      eventBus.emit('firebase:config-activated', {
        configId,
        config: configData,
        ingredients
      });
      
    } catch (error) {
      logError('Failed to activate config:', error);
      eventBus.emit('firebase:error', { 
        operation: 'activate-config', 
        error 
      });
    }
  }
  
  // Handle ingredient selection
  function handleIngredientSelection(ingredient: Ingredient) {
    workspaceStore.setLoadedIngredient(ingredient.id);
    onIngredientSelect(ingredient);
    showIngredientManager = false;
    
    eventBus.emit('firebase:ingredient-selected', { ingredient });
  }
  
  // Create new reference
  async function handleCreateReference(data: any) {
    if (!firebaseEnabled || !currentIngredient) return;
    
    try {
      const newReference = {
        ...data,
        ingredientId: currentIngredient,
        createdAt: Date.now(),
        createdBy: 'user', // Would come from auth
        sections: sectionStore.getSections()
      };
      
      const docRef = await firebaseDataService.createReference(
        currentIngredient,
        newReference
      );
      
      workspaceStore.setLoadedReferenceId(docRef.id);
      onReferenceCreate(newReference);
      
      eventBus.emit('firebase:reference-created', {
        referenceId: docRef.id,
        reference: newReference
      });
      
    } catch (error) {
      logError('Failed to create reference:', error);
      eventBus.emit('firebase:error', { 
        operation: 'create-reference', 
        error 
      });
    }
  }
  
  // Edit existing reference
  async function handleEditReference(referenceId: string, updates: any) {
    if (!firebaseEnabled || !currentIngredient) return;
    
    try {
      await firebaseDataService.updateReference(
        currentIngredient,
        referenceId,
        {
          ...updates,
          lastModified: Date.now(),
          modifiedBy: 'user'
        }
      );
      
      onReferenceEdit(referenceId, updates);
      
      eventBus.emit('firebase:reference-updated', {
        referenceId,
        updates
      });
      
    } catch (error) {
      logError('Failed to update reference:', error);
      eventBus.emit('firebase:error', { 
        operation: 'update-reference', 
        error 
      });
    }
  }
  
  // Load references by population type
  async function loadReferencesByPopulation(populationType: string) {
    if (!firebaseEnabled || !currentIngredient) return;
    
    try {
      loadingReferences = true;
      
      const refs = await firebaseDataService.getReferencesByPopulation(
        currentIngredient,
        populationType
      );
      
      availableReferences = [];
      refs.forEach(doc => {
        availableReferences.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
    } catch (error) {
      logError('Failed to load references:', error);
    } finally {
      loadingReferences = false;
    }
  }
  
  // Handle population type selection
  function handlePopulationClick(populationType: string) {
    selectedPopulation = populationType;
    loadReferencesByPopulation(populationType);
    showReferenceSelector = true;
  }
  
  // Listen for Firebase events from other components
  $effect(() => {
    const handlers = [
      eventBus.on('firebase:load-reference', ({ referenceId, ingredientId }) => {
        handleLoadReference(referenceId, ingredientId);
      }),
      eventBus.on('firebase:save-reference', handleSaveReference),
      eventBus.on('firebase:activate-config', ({ configId }) => {
        handleConfigActivate(configId);
      }),
      eventBus.on('firebase:select-ingredient', ({ ingredient }) => {
        handleIngredientSelection(ingredient);
      })
    ];
    
    return () => handlers.forEach(h => h());
  });
</script>

<!-- Firebase UI Controls -->
<div class="firebase-operations">
  {#if firebaseEnabled}
    <div class="firebase-toolbar">
      <button 
        onclick={() => showIngredientManager = true}
        class="toolbar-btn"
      >
        📦 Manage Ingredients
      </button>
      
      <button 
        onclick={() => showReferenceSelector = true}
        class="toolbar-btn"
        disabled={!currentIngredient}
      >
        📄 Load Reference
      </button>
      
      <button 
        onclick={handleSaveReference}
        class="toolbar-btn"
        disabled={!currentIngredient || !workspaceStore.getLoadedReferenceId()}
      >
        💾 Save Reference
      </button>
      
      <button 
        onclick={() => showConfigImport = true}
        class="toolbar-btn"
      >
        📥 Import Config
      </button>
      
      <button 
        onclick={() => showDiffViewer = true}
        class="toolbar-btn"
        disabled={!currentIngredient}
      >
        🔍 Compare References
      </button>
      
      <button 
        onclick={() => showMigrationTool = true}
        class="toolbar-btn"
      >
        🔄 Migration Tools
      </button>
    </div>
    
    {#if currentIngredient}
      <div class="current-context">
        <span class="context-label">Working on:</span>
        <span class="context-value">{currentIngredient}</span>
        {#if selectedHealthSystem}
          <span class="context-separator">|</span>
          <span class="context-value">{selectedHealthSystem}</span>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<!-- Modals would be rendered here based on state -->
{#if showIngredientManager}
  <div class="modal-backdrop">
    <div class="modal-content">
      <h2>Ingredient Manager</h2>
      <!-- Ingredient manager content would go here -->
      <button onclick={() => showIngredientManager = false}>Close</button>
    </div>
  </div>
{/if}

{#if showReferenceSelector && availableReferences.length > 0}
  <div class="modal-backdrop">
    <div class="modal-content">
      <h2>Select Reference</h2>
      <div class="reference-list">
        {#each availableReferences as reference}
          <div 
            class="reference-item"
            onclick={() => {
              handleLoadReference(reference.id);
              showReferenceSelector = false;
            }}
          >
            <h3>{reference.name}</h3>
            <p>{reference.healthSystem} - {reference.version}</p>
          </div>
        {/each}
      </div>
      <button onclick={() => showReferenceSelector = false}>Cancel</button>
    </div>
  </div>
{/if}

<style>
  .firebase-operations {
    padding: 1rem;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }
  
  .firebase-toolbar {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .toolbar-btn {
    padding: 0.5rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s;
  }
  
  .toolbar-btn:hover:not(:disabled) {
    background: var(--color-bg-hover);
  }
  
  .toolbar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .current-context {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--color-bg);
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .context-label {
    color: var(--color-text-muted);
    margin-right: 0.5rem;
  }
  
  .context-value {
    font-weight: 500;
    color: var(--color-primary);
  }
  
  .context-separator {
    margin: 0 0.5rem;
    color: var(--color-text-muted);
  }
  
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: var(--color-bg);
    border-radius: 8px;
    padding: 2rem;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .reference-list {
    margin: 1rem 0;
  }
  
  .reference-item {
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .reference-item:hover {
    background: var(--color-bg-hover);
  }
  
  .reference-item h3 {
    margin: 0 0 0.5rem 0;
    color: var(--color-primary);
  }
  
  .reference-item p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.875rem;
  }
</style>