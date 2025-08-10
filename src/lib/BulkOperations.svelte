<script>
  import { ingredientService, referenceService, configService } from './firebaseDataService.js';
  import { createSharedIngredient, removeFromSharedIngredient, getSharedIngredientInfo } from './sharedIngredientService.js';
  
  let { 
    selectedItems = [],
    onComplete = () => {},
    onCancel = () => {}
  } = $props();

  let operation = $state('');
  let processing = $state(false);
  let progress = $state(0);
  let results = $state([]);
  
  const operations = [
    { value: 'share', label: 'Share Ingredients', icon: '🔗', color: '#4CAF50' },
    { value: 'unshare', label: 'Unshare Ingredients', icon: '🔓', color: '#FF9800' },
    { value: 'revert', label: 'Revert to Baseline', icon: '↩️', color: '#2196F3' },
    { value: 'delete', label: 'Delete References', icon: '🗑️', color: '#f44336' },
    { value: 'validate', label: 'Mark as Validated', icon: '✓', color: '#9C27B0' },
    { value: 'export', label: 'Export Selected', icon: '📦', color: '#607D8B' }
  ];
  
  async function executeBulkOperation() {
    if (!operation || selectedItems.length === 0) {
      alert('Please select an operation and at least one item');
      return;
    }
    
    if (operation === 'delete' && !confirm(`Are you sure you want to delete ${selectedItems.length} items? This action cannot be undone.`)) {
      return;
    }
    
    processing = true;
    progress = 0;
    results = [];
    
    try {
      const total = selectedItems.length;
      
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        let result = { item: item.name, status: 'processing' };
        
        try {
          switch (operation) {
            case 'share':
              // Get all references for this ingredient
              const refs = await referenceService.getIngredientReferences(item.id);
              if (refs && refs.length > 0) {
                // Check if already shared
                const sharedInfo = await getSharedIngredientInfo(item.id);
                if (!sharedInfo.isShared) {
                  // Create shared ingredient with all its references
                  const references = refs.map(ref => ({
                    ingredientId: item.id,
                    configId: ref.configId,
                    healthSystem: ref.healthSystem,
                    domain: ref.domain,
                    subdomain: ref.subdomain,
                    version: ref.version
                  }));
                  await createSharedIngredient(item.id, references);
                  result.status = 'success';
                  result.message = 'Shared successfully';
                } else {
                  result.status = 'skipped';
                  result.message = 'Already shared';
                }
              } else {
                result.status = 'skipped';
                result.message = 'No references to share';
              }
              break;
              
            case 'unshare':
              // Check if ingredient is shared
              const sharedInfo = await getSharedIngredientInfo(item.id);
              if (sharedInfo.isShared && sharedInfo.sharedIngredientId) {
                // Get all references for this ingredient
                const refs = await referenceService.getIngredientReferences(item.id);
                // Unshare from all configs
                for (const ref of refs) {
                  await removeFromSharedIngredient(sharedInfo.sharedIngredientId, {
                    ingredientId: item.id,
                    configId: ref.configId,
                    healthSystem: ref.healthSystem,
                    domain: ref.domain,
                    subdomain: ref.subdomain,
                    version: ref.version
                  });
                }
                result.status = 'success';
                result.message = 'Unshared successfully';
              } else {
                result.status = 'skipped';
                result.message = 'Not shared';
              }
              break;
              
            case 'revert':
              // Revert to baseline
              if (item.baselineId) {
                const baseline = await configService.getBaselineConfig(item.baselineId);
                if (baseline && baseline.ingredients[item.id]) {
                  await referenceService.saveReference(item.id, {
                    ...baseline.ingredients[item.id],
                    status: 'CLEAN'
                  });
                  result.status = 'success';
                  result.message = 'Reverted to baseline';
                }
              } else {
                result.status = 'warning';
                result.message = 'No baseline found';
              }
              break;
              
            case 'delete':
              // Delete the reference
              if (item.referenceId) {
                await referenceService.deleteReference(item.ingredientId, item.referenceId);
                result.status = 'success';
                result.message = 'Deleted successfully';
              } else {
                result.status = 'warning';
                result.message = 'No reference to delete';
              }
              break;
              
            case 'validate':
              // Mark as validated/tested
              if (item.referenceId) {
                await referenceService.updateReferenceValidation(item.ingredientId, item.referenceId, {
                  status: 'passed',
                  notes: 'Bulk validated',
                  validatedAt: new Date().toISOString()
                });
                result.status = 'success';
                result.message = 'Marked as validated';
              }
              break;
              
            case 'export':
              // Prepare for export (collect data)
              result.status = 'success';
              result.message = 'Added to export';
              break;
              
            default:
              result.status = 'error';
              result.message = 'Unknown operation';
          }
        } catch (error) {
          result.status = 'error';
          result.message = error.message;
        }
        
        results = [...results, result];
        progress = ((i + 1) / total) * 100;
      }
      
      // If export, trigger download
      if (operation === 'export') {
        await exportSelectedItems();
      }
      
    } catch (error) {
      console.error('Bulk operation failed:', error);
      alert(`Operation failed: ${error.message}`);
    } finally {
      processing = false;
    }
  }
  
  async function exportSelectedItems() {
    const exportData = {
      timestamp: new Date().toISOString(),
      items: selectedItems,
      operation: 'bulk_export'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function getOperationDetails(op) {
    return operations.find(o => o.value === op) || {};
  }
</script>

<div class="bulk-operations">
  <div class="bulk-header">
    <h3>Bulk Operations</h3>
    <span class="selected-count">{selectedItems.length} items selected</span>
  </div>
  
  <div class="operation-select">
    <span class="operation-label">Select Operation:</span>
    <div class="operation-grid">
      {#each operations as op}
        <button
          class="operation-btn {operation === op.value ? 'selected' : ''}"
          style="--op-color: {op.color}"
          onclick={() => operation = op.value}
          disabled={processing}
        >
          <span class="op-icon">{op.icon}</span>
          <span class="op-label">{op.label}</span>
        </button>
      {/each}
    </div>
  </div>
  
  {#if operation}
    {@const opDetails = getOperationDetails(operation)}
    <div class="operation-details">
      <div class="details-header" style="color: {opDetails.color}">
        <span>{opDetails.icon}</span>
        <span>{opDetails.label}</span>
      </div>
      
      <div class="selected-items">
        <h4>Selected Items:</h4>
        <div class="items-list">
          {#each selectedItems.slice(0, 5) as item}
            <div class="item-chip">{item.name}</div>
          {/each}
          {#if selectedItems.length > 5}
            <div class="item-chip more">+{selectedItems.length - 5} more</div>
          {/if}
        </div>
      </div>
      
      {#if operation === 'delete'}
        <div class="warning-message">
          ⚠️ This action cannot be undone. All selected items will be permanently deleted.
        </div>
      {/if}
    </div>
  {/if}
  
  {#if processing}
    <div class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progress}%"></div>
      </div>
      <div class="progress-text">{Math.round(progress)}% complete</div>
      
      {#if results.length > 0}
        <div class="results-list">
          {#each results as result}
            <div class="result-item {result.status}">
              <span class="result-name">{result.item}:</span>
              <span class="result-message">{result.message}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  
  <div class="bulk-actions">
    <button 
      class="btn-cancel" 
      onclick={onCancel}
      disabled={processing}
    >
      Cancel
    </button>
    <button 
      class="btn-execute"
      onclick={executeBulkOperation}
      disabled={!operation || selectedItems.length === 0 || processing}
      style="background-color: {operation ? getOperationDetails(operation).color : '#ccc'}"
    >
      {processing ? 'Processing...' : `Execute ${operation ? getOperationDetails(operation).label : 'Operation'}`}
    </button>
  </div>
</div>

<style>
  .bulk-operations {
    padding: 1.5rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    max-width: 600px;
    margin: 0 auto;
  }
  
  .bulk-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .bulk-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .selected-count {
    background: #e3f2fd;
    color: #1976d2;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .operation-select {
    margin-bottom: 1.5rem;
  }
  
  .operation-select .operation-label {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: 500;
    color: #333;
  }
  
  .operation-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }
  
  .operation-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .operation-btn:hover {
    border-color: var(--op-color);
    background: rgba(var(--op-color), 0.05);
  }
  
  .operation-btn.selected {
    border-color: var(--op-color);
    background: linear-gradient(135deg, transparent, rgba(0, 0, 0, 0.02));
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .operation-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .op-icon {
    font-size: 1.5rem;
  }
  
  .op-label {
    font-size: 0.75rem;
    text-align: center;
  }
  
  .operation-details {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .details-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    margin-bottom: 1rem;
  }
  
  .selected-items h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: #666;
  }
  
  .items-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .item-chip {
    background: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    border: 1px solid #ddd;
  }
  
  .item-chip.more {
    background: #e0e0e0;
    color: #666;
  }
  
  .warning-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #fff3e0;
    color: #e65100;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }
  
  .progress-section {
    margin: 1.5rem 0;
  }
  
  .progress-bar {
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.3s ease;
  }
  
  .progress-text {
    text-align: center;
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 1rem;
  }
  
  .results-list {
    max-height: 200px;
    overflow-y: auto;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 0.25rem;
    padding: 0.5rem;
  }
  
  .result-item {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
    font-size: 0.75rem;
  }
  
  .result-item.success {
    color: #4CAF50;
  }
  
  .result-item.error {
    color: #f44336;
  }
  
  .result-item.warning {
    color: #FF9800;
  }
  
  .result-name {
    font-weight: 500;
  }
  
  .bulk-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }
  
  .btn-cancel,
  .btn-execute {
    padding: 0.5rem 1.5rem;
    border: none;
    border-radius: 0.25rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  .btn-cancel {
    background: #f5f5f5;
    color: #666;
  }
  
  .btn-cancel:hover {
    background: #e0e0e0;
  }
  
  .btn-execute {
    color: white;
  }
  
  .btn-execute:hover {
    opacity: 0.9;
  }
  
  .btn-execute:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>