<script>
  import VersionHistory from '../../VersionHistory.svelte';
  import SharedIngredientManager from '../../SharedIngredientManager.svelte';
  import VariationDetector from '../../VariationDetector.svelte';
  import BulkOperations from '../../BulkOperations.svelte';
  
  let {
    // Version History
    showVersionHistory = $bindable(false),
    versionHistoryIngredientId = null,
    
    // Shared Manager
    showSharedManager = $bindable(false),
    sharedManagerIngredient = null,
    
    // Variation Detector
    showVariationDetector = $bindable(false),
    variationTargetIngredient = null,
    
    // Baseline Comparison
    showBaselineComparison = $bindable(false),
    baselineComparisonData = null,
    
    // Bulk Operations
    showBulkOperations = $bindable(false),
    selectedItems = [],
    
    // Callbacks
    onRestoreVersion = () => {},
    onMergeVariations = () => {},
    onRevertBaseline = () => {},
    onRefresh = () => {}
  } = $props();
</script>

{#if showVersionHistory && versionHistoryIngredientId}
  <VersionHistory
    ingredientId={versionHistoryIngredientId}
    onClose={() => showVersionHistory = false}
    onRestore={async (version) => {
      await onRestoreVersion(version);
      showVersionHistory = false;
      onRefresh();
    }}
  />
{/if}

{#if showSharedManager && sharedManagerIngredient}
  <SharedIngredientManager
    ingredient={sharedManagerIngredient}
    onClose={() => showSharedManager = false}
    onUpdate={() => {
      showSharedManager = false;
      onRefresh();
    }}
  />
{/if}

{#if showVariationDetector}
  <VariationDetector
    targetIngredient={variationTargetIngredient}
    onClose={() => showVariationDetector = false}
    onMerge={async (primary, variations) => {
      await onMergeVariations(primary, variations);
      showVariationDetector = false;
      onRefresh();
    }}
  />
{/if}

{#if showBulkOperations}
  <BulkOperations
    {selectedItems}
    onClose={() => showBulkOperations = false}
    onComplete={() => {
      showBulkOperations = false;
      onRefresh();
    }}
  />
{/if}

{#if showBaselineComparison && baselineComparisonData}
  <div 
    class="modal-overlay" 
    onclick={() => showBaselineComparison = false}
    onkeydown={(e) => e.key === 'Escape' && (showBaselineComparison = false)}
    role="button"
    tabindex="0"
    aria-label="Close baseline comparison"
  >
    <div 
      class="modal-content baseline-comparison" 
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-header">
        <h2>Baseline Comparison</h2>
        <button 
          class="close-btn" 
          onclick={() => showBaselineComparison = false}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      
      <div class="modal-body">
        <div class="comparison-info">
          <h3>{baselineComparisonData.ingredient.name}</h3>
          <p>
            Health System: {baselineComparisonData.reference.healthSystem}<br>
            Population: {baselineComparisonData.reference.populationType}
          </p>
        </div>
        
        <div class="comparison-grid">
          <div class="comparison-pane">
            <h4>Current Version</h4>
            <pre class="code-block">{baselineComparisonData.reference.content || 'No content'}</pre>
          </div>
          
          <div class="comparison-pane">
            <h4>Baseline Version</h4>
            <pre class="code-block">{baselineComparisonData.baselineContent || 'No baseline found'}</pre>
          </div>
        </div>
        
        <div class="modal-footer">
          <button 
            class="btn btn-secondary" 
            onclick={() => showBaselineComparison = false}
          >
            Close
          </button>
          <button 
            class="btn btn-warning" 
            onclick={async () => {
              await onRevertBaseline(
                baselineComparisonData.ingredient, 
                baselineComparisonData.reference
              );
              showBaselineComparison = false;
              onRefresh();
            }}
          >
            Revert to Baseline
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }
  
  .modal-content {
    background-color: var(--color-surface);
    border-radius: 0.5rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
    position: relative;
  }
  
  .baseline-comparison {
    width: 1000px;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--color-text-primary);
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text-primary);
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .comparison-info {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: var(--color-surface-hover);
    border-radius: 0.375rem;
  }
  
  .comparison-info h3 {
    margin: 0 0 0.5rem 0;
    color: var(--color-text-primary);
  }
  
  .comparison-info p {
    margin: 0;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
  
  .comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .comparison-pane {
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    overflow: hidden;
  }
  
  .comparison-pane h4 {
    margin: 0;
    padding: 0.75rem 1rem;
    background-color: var(--color-surface-hover);
    border-bottom: 1px solid var(--color-border);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    color: var(--color-text-secondary);
  }
  
  .code-block {
    margin: 0;
    padding: 1rem;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    background-color: var(--color-surface);
    min-height: 200px;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid var(--color-border);
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secondary {
    background-color: var(--color-surface-hover);
    color: var(--color-text-primary);
  }
  
  .btn-secondary:hover {
    background-color: var(--color-neutral-200);
  }
  
  .btn-warning {
    background-color: var(--color-warning-500);
    color: white;
  }
  
  .btn-warning:hover {
    background-color: var(--color-warning-600);
  }
</style>