<script>
  import BaseModal from './BaseModal.svelte';
  import Icons from './Icons.svelte';
  import { getPreferences, savePreferences } from './preferencesService.js';
  
  let { 
    isOpen = $bindable(false), 
    onClose = () => {} 
  } = $props();
  
  let preferences = $state(getPreferences());
  let saveStatus = $state('');
  
  function handleSave() {
    if (savePreferences(preferences)) {
      saveStatus = 'saved';
      setTimeout(() => {
        saveStatus = '';
        onClose();
        isOpen = false;
      }, 1000);
    } else {
      saveStatus = 'error';
    }
  }
  
  function handleReset() {
    preferences = { ...getPreferences() };
  }
</script>

<BaseModal
  bind:isOpen
  title="Preferences"
  size="medium"
  {onClose}
>
  {#snippet children()}
    <div class="preferences-modal-content">
      <!-- Import Settings Section -->
      <div class="modal-section">
        <h3 class="modal-section-title">
          <Icons icon="import" size={18} />
          Import Settings
        </h3>
        
        <div class="modal-options">
          <div class="option-item">
            <input 
              type="checkbox" 
              id="auto-dedupe"
              bind:checked={preferences.autoDeduplicateOnImport}
            />
            <label for="auto-dedupe">
              Automatically deduplicate on import
              <div class="option-description">
                When enabled, identical ingredients will be automatically shared across configurations during import.
              </div>
            </label>
          </div>
          
          <div class="option-item">
            <input 
              type="checkbox" 
              id="show-prompt"
              bind:checked={preferences.showDeduplicationPrompt}
              disabled={!preferences.autoDeduplicateOnImport}
            />
            <label for="show-prompt" class:disabled={!preferences.autoDeduplicateOnImport}>
              Show confirmation before auto-deduplication
              <div class="option-description">
                Display a summary of what will be deduplicated before applying changes.
              </div>
            </label>
          </div>
        </div>
        
        <div class="modal-form">
          <div class="form-group">
            <label for="dedupe-threshold">Deduplication threshold</label>
            <select 
              id="dedupe-threshold"
              bind:value={preferences.deduplicationThreshold}
            >
              <option value={1.0}>Exact match only</option>
              <option value={0.95}>95% similarity</option>
              <option value={0.90}>90% similarity</option>
            </select>
            <div class="form-hint">
              How similar ingredients must be to be considered duplicates.
            </div>
          </div>
        </div>
      </div>
      
      <!-- History Settings Section -->
      <div class="modal-section">
        <h3 class="modal-section-title">
          <Icons icon="history" size={18} />
          History Settings
        </h3>
        
        <div class="modal-options">
          <div class="option-item">
            <input 
              type="checkbox" 
              id="preserve-history"
              bind:checked={preferences.preserveImportHistory}
            />
            <label for="preserve-history">
              Preserve import history
              <div class="option-description">
                Keep a record of all import operations for undo capability.
              </div>
            </label>
          </div>
        </div>
      </div>
      
      <!-- Status Messages -->
      {#if saveStatus === 'saved'}
        <div class="modal-alert alert-success">
          <Icons icon="check" size={20} className="alert-icon" />
          <div class="alert-content">
            Preferences saved successfully!
          </div>
        </div>
      {:else if saveStatus === 'error'}
        <div class="modal-alert alert-danger">
          <Icons icon="error" size={20} className="alert-icon" />
          <div class="alert-content">
            Error saving preferences. Please try again.
          </div>
        </div>
      {/if}
      
      <!-- Actions -->
      <div class="modal-footer modal-footer-spread">
        <button class="btn btn-secondary" onclick={handleReset}>
          <Icons icon="refresh" size={16} />
          Reset to Defaults
        </button>
        <div class="modal-button-group">
          <button class="btn btn-secondary" onclick={() => isOpen = false}>
            Cancel
          </button>
          <button class="btn btn-primary" onclick={handleSave}>
            <Icons icon="save" size={16} />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  {/snippet}
</BaseModal>

<style lang="scss">
  @use '../styles/abstracts/variables' as *;
  @use '../styles/abstracts/mixins' as *;
  @use '../styles/components/modals';
  
  .preferences-modal-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }
  
  // Section title with icon
  .modal-section-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  
  // Disabled label styling
  label.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    .option-description {
      opacity: 0.8;
    }
  }
  
  // Button styles
  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }
    
    &.btn-primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
      
      &:hover {
        background: var(--color-primary-dark);
        border-color: var(--color-primary-dark);
      }
    }
    
    &.btn-secondary {
      background: var(--color-background);
      border-color: var(--color-border);
      color: var(--color-text);
      
      &:hover {
        background: var(--color-surface-hover);
      }
    }
  }
  
  // Dark mode adjustments
  :global([data-theme="dark"]) {
    .modal-section {
      .modal-section-title {
        color: var(--color-text-light);
      }
    }
  }
</style>