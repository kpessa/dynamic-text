<script>
  import { getPreferences, savePreferences } from './preferencesService.js';
  
  let { isOpen = false, onClose = () => {} } = $props();
  
  let preferences = $state(getPreferences());
  let saveStatus = $state('');
  
  function handleSave() {
    if (savePreferences(preferences)) {
      saveStatus = 'saved';
      setTimeout(() => {
        saveStatus = '';
        onClose();
      }, 1000);
    } else {
      saveStatus = 'error';
    }
  }
  
  function handleReset() {
    preferences = { ...getPreferences() };
  }
</script>

{#if isOpen}
  <div class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Preferences</h2>
        <button class="close-btn" onclick={onClose}>×</button>
      </div>
      
      <div class="modal-body">
        <div class="preference-section">
          <h3>Import Settings</h3>
          
          <div class="preference-item">
            <label>
              <input 
                type="checkbox" 
                bind:checked={preferences.autoDeduplicateOnImport}
              />
              <span class="label-text">Automatically deduplicate on import</span>
            </label>
            <p class="description">
              When enabled, identical ingredients will be automatically shared across configurations during import.
            </p>
          </div>
          
          <div class="preference-item">
            <label>
              <input 
                type="checkbox" 
                bind:checked={preferences.showDeduplicationPrompt}
                disabled={!preferences.autoDeduplicateOnImport}
              />
              <span class="label-text">Show confirmation before auto-deduplication</span>
            </label>
            <p class="description">
              Display a summary of what will be deduplicated before applying changes.
            </p>
          </div>
          
          <div class="preference-item">
            <label>
              <span class="label-text">Deduplication threshold</span>
              <select bind:value={preferences.deduplicationThreshold}>
                <option value={1.0}>Exact match only</option>
                <option value={0.95}>95% similarity</option>
                <option value={0.90}>90% similarity</option>
              </select>
            </label>
            <p class="description">
              How similar ingredients must be to be considered duplicates.
            </p>
          </div>
        </div>
        
        <div class="preference-section">
          <h3>History Settings</h3>
          
          <div class="preference-item">
            <label>
              <input 
                type="checkbox" 
                bind:checked={preferences.preserveImportHistory}
              />
              <span class="label-text">Preserve import history</span>
            </label>
            <p class="description">
              Keep a record of all import operations for undo capability.
            </p>
          </div>
        </div>
        
        {#if saveStatus}
          <div class="status-message {saveStatus}">
            {saveStatus === 'saved' ? 'Preferences saved!' : 'Error saving preferences'}
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={handleReset}>Reset</button>
        <button class="btn btn-primary" onclick={handleSave}>Save</button>
      </div>
    </div>
  </div>
{/if}

<style>
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
    background: white;
    border-radius: 8px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0.25rem 0.5rem;
  }
  
  .close-btn:hover {
    color: #333;
  }
  
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
  
  .preference-section {
    margin-bottom: 2rem;
  }
  
  .preference-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: #333;
  }
  
  .preference-item {
    margin-bottom: 1.5rem;
  }
  
  .preference-item label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  
  .preference-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
  
  .preference-item select {
    margin-left: 1rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .label-text {
    font-weight: 500;
  }
  
  .description {
    margin: 0.5rem 0 0 1.75rem;
    font-size: 0.875rem;
    color: #666;
  }
  
  .status-message {
    padding: 0.75rem;
    border-radius: 4px;
    text-align: center;
    margin-top: 1rem;
  }
  
  .status-message.saved {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .status-message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #e0e0e0;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }
  
  .btn-primary:hover {
    background: #0056b3;
    border-color: #0056b3;
  }
  
  .btn-secondary {
    background: white;
    color: #333;
    border-color: #ccc;
  }
  
  .btn-secondary:hover {
    background: #f8f9fa;
  }
</style>