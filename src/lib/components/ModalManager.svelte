<script>
  import IngredientManager from '../IngredientManager.svelte';
  import IngredientDiffViewer from '../IngredientDiffViewer.svelte';
  import DataMigrationTool from '../DataMigrationTool.svelte';
  import SelectiveApply from '../SelectiveApply.svelte';
  import PreferencesModal from '../PreferencesModal.svelte';
  import CommitMessageDialog from '../CommitMessageDialog.svelte';
  import { uiStore } from '../../stores/uiStore.svelte.ts';
  import { workspaceStore } from '../../stores/workspaceStore.svelte.ts';
  
  export let activeConfigId = null;
  export let activeConfigIngredients = [];
  export let sections = [];
  export let onIngredientSelection = () => {};
  export let onCreateReference = () => {};
  export let onEditReference = () => {};
  export let onMigrationComplete = () => {};
  export let onCommitMessageConfirm = () => {};
  export let onSelectiveApply = async () => {};
</script>

{#if uiStore.showIngredientManager}
  <div 
    class="modal-overlay" 
    onclick={() => uiStore.setShowIngredientManager(false)}
    onkeydown={(e) => e.key === 'Escape' && uiStore.setShowIngredientManager(false)}
    role="button"
    tabindex="-1"
    aria-label="Close modal overlay"
  >
    <div 
      class="modal-content large-modal" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Ingredient Manager"
      tabindex="-1"
    >
      <button 
        class="modal-close"
        onclick={() => uiStore.setShowIngredientManager(false)}
      >
        ×
      </button>
      <IngredientManager
        currentIngredient={workspaceStore.currentIngredient}
        onSelectIngredient={onIngredientSelection}
        onCreateReference={onCreateReference}
        onEditReference={onEditReference}
        activeConfigId={activeConfigId}
        activeConfigIngredients={activeConfigIngredients}
      />
    </div>
  </div>
{/if}

<!-- Ingredient Diff Viewer -->
{#if uiStore.showDiffViewer && workspaceStore.selectedIngredientForDiff}
  <IngredientDiffViewer
    ingredient={workspaceStore.selectedIngredientForDiff}
    healthSystem={null}
    onClose={() => {
      uiStore.setShowDiffViewer(false);
      workspaceStore.setSelectedIngredientForDiff(null);
    }}
  />
{/if}

<!-- Data Migration Tool -->
<DataMigrationTool
  isOpen={uiStore.showMigrationTool}
  onClose={() => uiStore.setShowMigrationTool(false)}
  onMigrationComplete={onMigrationComplete}
/>

<!-- Commit Message Dialog -->
<CommitMessageDialog
  isOpen={uiStore.showCommitMessageDialog}
  onConfirm={onCommitMessageConfirm}
  onCancel={() => uiStore.setShowCommitMessageDialog(false)}
  title="Save Changes"
  defaultMessage=""
  showOptionalNote={true}
/>

<!-- Selective Apply Modal -->
{#if uiStore.showSelectiveApply && workspaceStore.loadedIngredient && workspaceStore.pendingReferenceData}
  <div class="modal-backdrop" onclick={() => uiStore.setShowSelectiveApply(false)}>
    <div class="modal-content selective-apply-modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Apply Changes to Shared Configurations</h2>
        <button class="close-btn" onclick={() => uiStore.setShowSelectiveApply(false)}>✕</button>
      </div>
      <SelectiveApply 
        ingredientId={workspaceStore.loadedIngredient.id}
        referenceData={workspaceStore.pendingReferenceData}
        onApply={onSelectiveApply}
        onCancel={() => uiStore.setShowSelectiveApply(false)}
      />
    </div>
  </div>
{/if}

<!-- Preferences Modal -->
<PreferencesModal 
  isOpen={uiStore.showPreferences}
  onClose={() => uiStore.setShowPreferences(false)}
/>