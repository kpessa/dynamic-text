<script>
  import { migrationService, POPULATION_TYPES } from './firebaseDataService.js';
  import { isFirebaseConfigured } from './firebase.js';
  
  let {
    isOpen = $bindable(false),
    onMigrationComplete = () => {}
  } = $props();
  
  let migrationStatus = $state('idle'); // 'idle', 'loading', 'success', 'error'
  let migrationResult = $state(null);
  let error = $state(null);
  let localStorageData = $state(null);
  let selectedPopulationType = $state(POPULATION_TYPES.ADULT);
  let previewData = $state(null);
  
  // Load localStorage data when component opens
  $effect(() => {
    if (isOpen && migrationStatus === 'idle') {
      loadLocalStorageData();
    }
  });
  
  function loadLocalStorageData() {
    try {
      const saved = localStorage.getItem('referenceTexts');
      if (saved) {
        const data = JSON.parse(saved);
        localStorageData = data;
        generatePreview(data);
      } else {
        error = 'No data found in localStorage';
      }
    } catch (err) {
      console.error('Error loading localStorage:', err);
      error = 'Failed to load localStorage data';
    }
  }
  
  function generatePreview(data) {
    const preview = {
      referenceCount: Object.keys(data.referenceTexts || {}).length,
      ingredients: new Set(),
      healthSystems: new Set(),
      domains: new Set()
    };
    
    Object.values(data.referenceTexts || {}).forEach(ref => {
      if (ref.ingredient) preview.ingredients.add(ref.ingredient);
      if (ref.healthSystem) preview.healthSystems.add(ref.healthSystem);
      if (ref.domain) preview.domains.add(ref.domain);
    });
    
    preview.ingredientCount = preview.ingredients.size;
    preview.healthSystemCount = preview.healthSystems.size;
    preview.domainCount = preview.domains.size;
    
    previewData = preview;
  }
  
  async function startMigration() {
    if (!isFirebaseConfigured()) {
      error = 'Firebase is not configured. Please set up your Firebase credentials first.';
      return;
    }
    
    if (!localStorageData) {
      error = 'No data to migrate';
      return;
    }
    
    migrationStatus = 'loading';
    error = null;
    
    try {
      // Add population type to all references before migration
      const modifiedData = {
        ...localStorageData,
        referenceTexts: {}
      };
      
      Object.entries(localStorageData.referenceTexts || {}).forEach(([id, ref]) => {
        modifiedData.referenceTexts[id] = {
          ...ref,
          populationType: selectedPopulationType
        };
      });
      
      const result = await migrationService.migrateFromLocalStorage(modifiedData);
      migrationResult = result;
      migrationStatus = 'success';
      
      // Optionally clear localStorage after successful migration
      // localStorage.removeItem('referenceTexts');
      
      onMigrationComplete(result);
    } catch (err) {
      console.error('Migration error:', err);
      error = err.message;
      migrationStatus = 'error';
    }
  }
  
  function exportBackup() {
    if (!localStorageData) return;
    
    const backup = {
      ...localStorageData,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dynamic-text-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function closeMigration() {
    isOpen = false;
    migrationStatus = 'idle';
    migrationResult = null;
    error = null;
  }
</script>

{#if isOpen}
  <div 
    class="migration-overlay" 
    onclick={closeMigration}
    onkeydown={(e) => e.key === 'Escape' && closeMigration()}
    role="button"
    tabindex="-1"
    aria-label="Close migration overlay"
  >
    <div 
      class="migration-dialog" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Migrate to Firebase"
      tabindex="-1"
    >
      <div class="dialog-header">
        <h2>🚀 Migrate to Firebase</h2>
        <button class="close-btn" onclick={closeMigration}>×</button>
      </div>
      
      <div class="dialog-content">
        {#if migrationStatus === 'idle'}
          {#if previewData}
            <div class="preview-section">
              <h3>📊 Data Preview</h3>
              <div class="preview-stats">
                <div class="stat-item">
                  <span class="stat-label">References:</span>
                  <span class="stat-value">{previewData.referenceCount}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Unique Ingredients:</span>
                  <span class="stat-value">{previewData.ingredientCount}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Health Systems:</span>
                  <span class="stat-value">{previewData.healthSystemCount}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Domains:</span>
                  <span class="stat-value">{previewData.domainCount}</span>
                </div>
              </div>
            </div>
            
            <div class="migration-options">
              <h3>⚙️ Migration Options</h3>
              <div class="option-group">
                <label for="population-type">Default Population Type:</label>
                <select 
                  id="population-type"
                  bind:value={selectedPopulationType}
                  class="population-select"
                >
                  <option value={POPULATION_TYPES.NEO}>Neonatal</option>
                  <option value={POPULATION_TYPES.CHILD}>Child</option>
                  <option value={POPULATION_TYPES.ADOLESCENT}>Adolescent</option>
                  <option value={POPULATION_TYPES.ADULT}>Adult</option>
                </select>
                <p class="option-help">
                  All references will be initially categorized as this population type. 
                  You can change individual references later.
                </p>
              </div>
            </div>
            
            <div class="warning-section">
              <h3>⚠️ Important Notes</h3>
              <ul>
                <li>This will create new ingredients in Firebase based on your reference data</li>
                <li>References will be organized under their respective ingredients</li>
                <li>Your localStorage data will remain intact (not deleted)</li>
                <li>You can export a backup before migrating</li>
              </ul>
            </div>
            
            <div class="action-buttons">
              <button class="backup-btn" onclick={exportBackup}>
                💾 Export Backup
              </button>
              <button class="migrate-btn" onclick={startMigration}>
                🚀 Start Migration
              </button>
            </div>
          {:else if error}
            <div class="error-message">
              <span class="error-icon">❌</span>
              <p>{error}</p>
            </div>
          {:else}
            <div class="loading">
              <p>Loading localStorage data...</p>
            </div>
          {/if}
        {:else if migrationStatus === 'loading'}
          <div class="migration-progress">
            <div class="spinner"></div>
            <h3>Migrating your data...</h3>
            <p>This may take a few moments depending on the amount of data.</p>
          </div>
        {:else if migrationStatus === 'success'}
          <div class="success-message">
            <div class="success-icon">✅</div>
            <h3>Migration Successful!</h3>
            {#if migrationResult}
              <div class="result-stats">
                <p><strong>{migrationResult.ingredientCount}</strong> ingredients created</p>
                <p><strong>{migrationResult.referenceCount}</strong> references migrated</p>
              </div>
            {/if}
            <p>Your data has been successfully migrated to Firebase.</p>
            <button class="done-btn" onclick={closeMigration}>Done</button>
          </div>
        {:else if migrationStatus === 'error'}
          <div class="error-message">
            <div class="error-icon">❌</div>
            <h3>Migration Failed</h3>
            <p>{error || 'An unknown error occurred'}</p>
            <div class="error-actions">
              <button class="retry-btn" onclick={() => { migrationStatus = 'idle'; error = null; }}>
                Try Again
              </button>
              <button class="cancel-btn" onclick={closeMigration}>Cancel</button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .migration-overlay {
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
  }
  
  .migration-dialog {
    background-color: #fff;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }
  
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #dee2e6;
    background-color: #f8f9fa;
  }
  
  .dialog-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }
  
  .close-btn {
    font-size: 1.5rem;
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background-color: #e9ecef;
    color: #333;
  }
  
  .dialog-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
  
  .preview-section {
    margin-bottom: 1.5rem;
  }
  
  .preview-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #495057;
  }
  
  .preview-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .stat-item {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }
  
  .stat-label {
    display: block;
    font-size: 0.85rem;
    color: #6c757d;
    margin-bottom: 0.5rem;
  }
  
  .stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: #646cff;
  }
  
  .migration-options {
    margin-bottom: 1.5rem;
  }
  
  .migration-options h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #495057;
  }
  
  .option-group {
    margin-bottom: 1rem;
  }
  
  .option-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
  }
  
  .population-select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 1rem;
    background-color: #fff;
  }
  
  .option-help {
    margin: 0.5rem 0 0 0;
    font-size: 0.85rem;
    color: #6c757d;
  }
  
  .warning-section {
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .warning-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: #856404;
  }
  
  .warning-section ul {
    margin: 0;
    padding-left: 1.5rem;
    color: #856404;
  }
  
  .warning-section li {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }
  
  .action-buttons {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
  
  .backup-btn {
    padding: 0.75rem 1.5rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .backup-btn:hover {
    background-color: #5a6268;
  }
  
  .migrate-btn {
    padding: 0.75rem 1.5rem;
    background-color: #646cff;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .migrate-btn:hover {
    background-color: #535bf2;
  }
  
  .migration-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
  }
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #646cff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1.5rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .migration-progress h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }
  
  .migration-progress p {
    margin: 0;
    color: #6c757d;
  }
  
  .success-message {
    text-align: center;
    padding: 2rem;
  }
  
  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  .success-message h3 {
    margin: 0 0 1rem 0;
    color: #28a745;
  }
  
  .result-stats {
    background-color: #e8f5e9;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
  }
  
  .result-stats p {
    margin: 0.25rem 0;
    color: #155724;
  }
  
  .done-btn {
    padding: 0.75rem 2rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 1rem;
  }
  
  .done-btn:hover {
    background-color: #218838;
  }
  
  .error-message {
    text-align: center;
    padding: 2rem;
  }
  
  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    display: block;
  }
  
  .error-message h3 {
    margin: 0 0 1rem 0;
    color: #dc3545;
  }
  
  .error-message p {
    margin: 0 0 1.5rem 0;
    color: #666;
  }
  
  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  
  .retry-btn {
    padding: 0.75rem 1.5rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  
  .retry-btn:hover {
    background-color: #0056b3;
  }
  
  .cancel-btn {
    padding: 0.75rem 1.5rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  
  .cancel-btn:hover {
    background-color: #5a6268;
  }
  
  .loading {
    text-align: center;
    padding: 2rem;
    color: #6c757d;
  }
</style>