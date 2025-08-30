<script>
  import { referenceService, configService } from './firebaseDataService.js';
  import { getSharedIngredientInfo } from './sharedIngredientService.js';
  
  let { 
    ingredientId = null,
    referenceData = null,
    onApply = () => {},
    onCancel = () => {}
  } = $props();
  
  let loading = $state(true);
  let sharedConfigs = $state([]);
  let selectedConfigs = $state(new Set());
  let applyMode = $state('selected'); // 'all', 'selected', 'exclude'
  let applying = $state(false);
  let results = $state([]);
  
  // Load shared configs on mount
  $effect(async () => {
    if (ingredientId) {
      await loadSharedConfigs();
    }
  });
  
  async function loadSharedConfigs() {
    loading = true;
    try {
      // Get all configs that share this ingredient
      const sharedInfo = await getSharedIngredientInfo(ingredientId);
      
      if (sharedInfo && sharedInfo.sharedAcross) {
        // Load config details
        const configPromises = sharedInfo.sharedAcross.map(async (configId) => {
          const config = await configService.getConfig(configId);
          const references = await referenceService.getReferencesForIngredient(ingredientId);
          const configRef = references.find(ref => ref.configId === configId);
          
          return {
            id: configId,
            name: config?.name || configId,
            healthSystem: config?.healthSystem || 'Unknown',
            currentVersion: configRef?.version || 0,
            lastModified: configRef?.lastModified || null,
            status: configRef?.status || 'CLEAN'
          };
        });
        
        sharedConfigs = await Promise.all(configPromises);
        
        // By default, select all configs
        sharedConfigs.forEach(config => selectedConfigs.add(config.id));
        selectedConfigs = new Set(selectedConfigs);
      }
    } catch (error) {
      console.error('Failed to load shared configs:', error);
    } finally {
      loading = false;
    }
  }
  
  function toggleConfig(configId) {
    if (selectedConfigs.has(configId)) {
      selectedConfigs.delete(configId);
    } else {
      selectedConfigs.add(configId);
    }
    selectedConfigs = new Set(selectedConfigs);
  }
  
  function selectAll() {
    sharedConfigs.forEach(config => selectedConfigs.add(config.id));
    selectedConfigs = new Set(selectedConfigs);
  }
  
  function selectNone() {
    selectedConfigs.clear();
    selectedConfigs = new Set();
  }
  
  function selectModified() {
    selectedConfigs.clear();
    sharedConfigs
      .filter(config => config.status === 'MODIFIED')
      .forEach(config => selectedConfigs.add(config.id));
    selectedConfigs = new Set(selectedConfigs);
  }
  
  async function applyChanges() {
    if (selectedConfigs.size === 0 && applyMode === 'selected') {
      alert('Please select at least one configuration');
      return;
    }
    
    applying = true;
    results = [];
    
    try {
      // Determine which configs to update
      let targetConfigs = [];
      
      switch (applyMode) {
        case 'all':
          targetConfigs = sharedConfigs.map(c => c.id);
          break;
        case 'selected':
          targetConfigs = Array.from(selectedConfigs);
          break;
        case 'exclude':
          targetConfigs = sharedConfigs
            .filter(c => !selectedConfigs.has(c.id))
            .map(c => c.id);
          break;
      }
      
      // Apply changes to each target config
      for (const configId of targetConfigs) {
        let result = { configId, status: 'processing' };
        
        try {
          // Save the reference with the config context
          await referenceService.saveReference(ingredientId, {
            ...referenceData,
            configId
          });
          
          result.status = 'success';
          result.message = 'Updated successfully';
        } catch (error) {
          result.status = 'error';
          result.message = error.message;
        }
        
        results = [...results, result];
      }
      
      // Call onApply with results
      onApply(results);
      
    } catch (error) {
      console.error('Failed to apply changes:', error);
      alert(`Failed to apply changes: ${error.message}`);
    } finally {
      applying = false;
    }
  }
  
  function getConfigStatusColor(status) {
    switch (status) {
      case 'MODIFIED': return '#ff9800';
      case 'CLEAN': return '#4caf50';
      default: return '#9e9e9e';
    }
  }
</script>

<div class="selective-apply">
  <div class="apply-header">
    <h3>Apply Changes Selectively</h3>
    <p class="subtitle">Choose which configurations to update with these changes</p>
  </div>
  
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading shared configurations...</p>
    </div>
  {:else if sharedConfigs.length === 0}
    <div class="no-configs">
      <p>This ingredient is not shared across any configurations.</p>
      <p>Changes will only affect the current configuration.</p>
    </div>
  {:else}
    <div class="apply-mode">
      <span>Apply Mode:</span>
      <div class="mode-options">
        <button 
          class="mode-btn {applyMode === 'all' ? 'active' : ''}"
          onclick={() => applyMode = 'all'}
          disabled={applying}
        >
          Apply to All ({sharedConfigs.length})
        </button>
        <button 
          class="mode-btn {applyMode === 'selected' ? 'active' : ''}"
          onclick={() => applyMode = 'selected'}
          disabled={applying}
        >
          Apply to Selected ({selectedConfigs.size})
        </button>
        <button 
          class="mode-btn {applyMode === 'exclude' ? 'active' : ''}"
          onclick={() => applyMode = 'exclude'}
          disabled={applying}
        >
          Exclude Selected ({sharedConfigs.length - selectedConfigs.size})
        </button>
      </div>
    </div>
    
    <div class="config-list">
      <div class="list-header">
        <span>Shared Configurations</span>
        <div class="quick-select">
          <button onclick={selectAll} disabled={applying}>All</button>
          <button onclick={selectNone} disabled={applying}>None</button>
          <button onclick={selectModified} disabled={applying}>Modified</button>
        </div>
      </div>
      
      <div class="configs">
        {#each sharedConfigs as config}
          <div 
            class="config-item {selectedConfigs.has(config.id) ? 'selected' : ''}"
            class:disabled={applying}
          >
            <input 
              type="checkbox"
              checked={selectedConfigs.has(config.id)}
              onchange={() => toggleConfig(config.id)}
              disabled={applying}
            />
            <div class="config-info">
              <div class="config-name">{config.name}</div>
              <div class="config-details">
                <span class="health-system">🏥 {config.healthSystem}</span>
                <span class="version">v{config.currentVersion}</span>
                <span 
                  class="status"
                  style="color: {getConfigStatusColor(config.status)}"
                >
                  {config.status}
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    {#if applying && results.length > 0}
      <div class="apply-results">
        <h4>Applying Changes...</h4>
        {#each results as result}
          <div class="result-item {result.status}">
            <span class="config-name">{sharedConfigs.find(c => c.id === result.configId)?.name}</span>
            <span class="result-status">
              {#if result.status === 'processing'}
                ⏳ Processing...
              {:else if result.status === 'success'}
                ✓ {result.message}
              {:else}
                ✗ {result.message}
              {/if}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
  
  <div class="apply-actions">
    <button 
      class="btn-cancel"
      onclick={onCancel}
      disabled={applying}
    >
      Cancel
    </button>
    <button 
      class="btn-apply"
      onclick={applyChanges}
      disabled={applying || (applyMode === 'selected' && selectedConfigs.size === 0)}
    >
      {applying ? 'Applying...' : `Apply Changes`}
    </button>
  </div>
</div>

<style>
  .selective-apply {
    padding: 1.5rem;
    background: white;
    border-radius: 0.5rem;
  }
  
  .apply-header {
    margin-bottom: 1.5rem;
  }
  
  .apply-header h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
  }
  
  .subtitle {
    margin: 0;
    color: #666;
    font-size: 0.875rem;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
  }
  
  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #1976d2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .no-configs {
    text-align: center;
    padding: 2rem;
    background: #f5f5f5;
    border-radius: 0.5rem;
    color: #666;
  }
  
  .apply-mode {
    margin-bottom: 1.5rem;
  }
  
  .apply-mode label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .mode-options {
    display: flex;
    gap: 0.5rem;
  }
  
  .mode-btn {
    flex: 1;
    padding: 0.5rem;
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .mode-btn:hover {
    background: #f5f5f5;
  }
  
  .mode-btn.active {
    background: #1976d2;
    color: white;
    border-color: #1976d2;
  }
  
  .mode-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .config-list {
    margin-bottom: 1.5rem;
  }
  
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .list-header span {
    font-weight: 500;
  }
  
  .quick-select {
    display: flex;
    gap: 0.5rem;
  }
  
  .quick-select button {
    padding: 0.25rem 0.5rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.75rem;
  }
  
  .quick-select button:hover {
    background: #f5f5f5;
  }
  
  .configs {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #e0e0e0;
    border-radius: 0.25rem;
  }
  
  .config-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-bottom: 1px solid #f0f0f0;
    transition: background 0.2s;
  }
  
  .config-item:last-child {
    border-bottom: none;
  }
  
  .config-item:hover {
    background: #f5f5f5;
  }
  
  .config-item.selected {
    background: #e3f2fd;
  }
  
  .config-item.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  
  .config-info {
    flex: 1;
  }
  
  .config-name {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .config-details {
    display: flex;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: #666;
  }
  
  .health-system,
  .version,
  .status {
    display: inline-flex;
    align-items: center;
  }
  
  .apply-results {
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 0.25rem;
  }
  
  .apply-results h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
  }
  
  .result-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    margin-bottom: 0.25rem;
    background: white;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }
  
  .result-item.success {
    border-left: 3px solid #4caf50;
  }
  
  .result-item.error {
    border-left: 3px solid #f44336;
  }
  
  .result-item.processing {
    border-left: 3px solid #2196f3;
  }
  
  .apply-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
  }
  
  .btn-cancel,
  .btn-apply {
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
  
  .btn-apply {
    background: #1976d2;
    color: white;
  }
  
  .btn-apply:hover {
    background: #1565c0;
  }
  
  .btn-cancel:disabled,
  .btn-apply:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>