<script lang="ts">
  import { tpnConfigService, type TPNConfiguration, type PopulationType } from '../services/tpnConfigService';
  import { tpnConfigFirebaseService } from '../services/tpnConfigFirebaseService';
  import { sectionStore } from '../../stores/sectionStore.svelte';
  
  const props = $props<{
    isOpen?: boolean;
    onImport?: (config: TPNConfiguration) => void;
  }>();
  
  let isOpen = $state(props.isOpen ?? false);
  let onImport = props.onImport;
  
  let importMethod = $state<'file' | 'firebase'>('file');
  let selectedFile = $state<File | null>(null);
  let selectedConfigId = $state<string | null>(null);
  let populationType = $state<PopulationType>('adult');
  let validationErrors = $state<string[]>([]);
  let isImporting = $state(false);
  let importSuccess = $state(false);
  let importError = $state<string | null>(null);
  let fileInputElement: HTMLInputElement;
  
  // Firebase configs list
  let firebaseConfigs = $state<any[]>([]);
  let loadingConfigs = $state(false);
  
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      selectedFile = input.files[0] || null;
      validationErrors = [];
      importError = null;
    }
  }
  
  async function loadFirebaseConfigs() {
    loadingConfigs = true;
    try {
      const result = await tpnConfigFirebaseService.listTPNConfigurations();
      if (result.success && result.configurations) {
        firebaseConfigs = result.configurations;
      } else {
        importError = result.error || 'Failed to load configurations';
      }
    } catch (err) {
      importError = err instanceof Error ? err.message : 'Failed to load configurations';
    } finally {
      loadingConfigs = false;
    }
  }
  
  async function validateAndPreview() {
    if (importMethod === 'file' && !selectedFile) {
      importError = 'Please select a file to import';
      return;
    }
    
    if (importMethod === 'firebase' && !selectedConfigId) {
      importError = 'Please select a configuration to import';
      return;
    }
    
    isImporting = true;
    validationErrors = [];
    importError = null;
    
    try {
      let config: TPNConfiguration;
      
      if (importMethod === 'file' && selectedFile) {
        // Read file content
        const text = await selectedFile.text();
        
        try {
          config = JSON.parse(text);
        } catch (parseError) {
          importError = 'Invalid JSON file format';
          isImporting = false;
          return;
        }
      } else if (importMethod === 'firebase' && selectedConfigId) {
        // Load from Firebase
        const result = await tpnConfigFirebaseService.loadTPNConfiguration(selectedConfigId);
        
        if (!result.success || !result.config) {
          importError = result.error || 'Failed to load configuration';
          isImporting = false;
          return;
        }
        
        config = result.config;
        
        // Update population type from metadata if available
        if (result.metadata?.populationType) {
          populationType = result.metadata.populationType;
        }
      } else {
        importError = 'No import source selected';
        isImporting = false;
        return;
      }
      
      // Validate configuration
      const validation = tpnConfigService.validateTPNConfig(config);
      
      if (!validation.valid) {
        validationErrors = validation.errors;
        importError = 'Configuration validation failed. Please review the errors below.';
      } else {
        // Show preview info
        importSuccess = true;
        
        // Call the import callback if provided
        if (onImport) {
          onImport(config);
        }
        
        // Import all sections from all ingredients
        const allSections = tpnConfigService.importTPNConfig(config);
        
        // Update the section store
        sectionStore.setSections(allSections as any);
        
        // Close modal after successful import
        setTimeout(() => {
          closeModal();
        }, 2000);
      }
    } catch (error) {
      importError = error instanceof Error ? error.message : 'Import failed';
    } finally {
      isImporting = false;
    }
  }
  
  function closeModal() {
    isOpen = false;
    resetForm();
  }
  
  function resetForm() {
    selectedFile = null;
    selectedConfigId = null;
    validationErrors = [];
    importSuccess = false;
    importError = null;
    isImporting = false;
    if (fileInputElement) {
      fileInputElement.value = '';
    }
  }
  
  function getPopulationTypeLabel(type: PopulationType): string {
    const labels: Record<PopulationType, string> = {
      neo: 'Neonatal',
      child: 'Child',
      adolescent: 'Adolescent',
      adult: 'Adult'
    };
    return labels[type] || type;
  }
  
  $effect(() => {
    if (isOpen && importMethod === 'firebase' && firebaseConfigs.length === 0) {
      loadFirebaseConfigs();
    }
  });
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={closeModal}>
    <div class="modal-container" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2 class="text-xl font-semibold">Import TPN Configuration</h2>
        <button 
          onclick={closeModal}
          class="btn btn-sm variant-ghost-surface"
          aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        {#if importSuccess}
          <div class="alert variant-filled-success">
            <div class="alert-message">
              <h3 class="font-semibold">Import Successful!</h3>
              <p>The TPN configuration has been imported successfully.</p>
            </div>
          </div>
        {:else}
          <div class="space-y-4">
            <!-- Import Method Selection -->
            <div class="radio-group">
              <label class="flex items-center space-x-2">
                <input 
                  type="radio" 
                  bind:group={importMethod} 
                  value="file"
                  class="radio" />
                <span>Import from File</span>
              </label>
              <label class="flex items-center space-x-2">
                <input 
                  type="radio" 
                  bind:group={importMethod} 
                  value="firebase"
                  class="radio" />
                <span>Import from Firebase</span>
              </label>
            </div>
            
            {#if importMethod === 'file'}
              <!-- File Upload -->
              <div class="space-y-2">
                <label class="label">
                  <span>Select TPN Configuration File (JSON)</span>
                  <input 
                    type="file" 
                    accept=".json,application/json"
                    onchange={handleFileSelect}
                    bind:this={fileInputElement}
                    class="input" />
                </label>
                
                {#if selectedFile}
                  <div class="text-sm text-surface-600 dark:text-surface-400">
                    Selected: {selectedFile.name}
                  </div>
                {/if}
              </div>
            {:else if importMethod === 'firebase'}
              <!-- Firebase Config Selection -->
              <div class="space-y-2">
                {#if loadingConfigs}
                  <div class="placeholder animate-pulse">
                    <div class="placeholder-content">Loading configurations...</div>
                  </div>
                {:else if firebaseConfigs.length === 0}
                  <div class="alert variant-ghost-warning">
                    <div class="alert-message">
                      <p>No saved configurations found in Firebase.</p>
                    </div>
                  </div>
                {:else}
                  <label class="label">
                    <span>Select Configuration</span>
                    <select 
                      bind:value={selectedConfigId}
                      class="select">
                      <option value={null}>Choose a configuration...</option>
                      {#each firebaseConfigs as config}
                        <option value={config.id}>
                          {config.name} ({getPopulationTypeLabel(config.populationType)}) - {config.ingredientCount} ingredients
                        </option>
                      {/each}
                    </select>
                  </label>
                {/if}
              </div>
            {/if}
            
            <!-- Population Type Selection (for file imports) -->
            {#if importMethod === 'file'}
              <label class="label">
                <span>Population Type</span>
                <select 
                  bind:value={populationType}
                  class="select">
                  <option value="neo">Neonatal</option>
                  <option value="child">Child</option>
                  <option value="adolescent">Adolescent</option>
                  <option value="adult">Adult</option>
                </select>
              </label>
            {/if}
            
            <!-- Validation Errors -->
            {#if validationErrors.length > 0}
              <div class="alert variant-filled-error">
                <div class="alert-message">
                  <h3 class="font-semibold mb-2">Validation Errors:</h3>
                  <ul class="list-disc list-inside space-y-1 text-sm">
                    {#each validationErrors as error}
                      <li>{error}</li>
                    {/each}
                  </ul>
                </div>
              </div>
            {/if}
            
            <!-- Import Error -->
            {#if importError}
              <div class="alert variant-filled-error">
                <div class="alert-message">
                  <p>{importError}</p>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button 
          onclick={closeModal}
          class="btn variant-ghost-surface">
          Cancel
        </button>
        <button 
          onclick={validateAndPreview}
          disabled={isImporting || importSuccess}
          class="btn variant-filled-primary">
          {#if isImporting}
            <span class="animate-spin mr-2">⟳</span>
            Importing...
          {:else if importSuccess}
            Imported
          {:else}
            Import Configuration
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    @apply fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4;
  }
  
  .modal-container {
    @apply bg-surface-100 dark:bg-surface-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col;
  }
  
  .modal-header {
    @apply flex justify-between items-center p-6 border-b border-surface-300 dark:border-surface-600;
  }
  
  .modal-body {
    @apply p-6 flex-1 overflow-y-auto;
  }
  
  .modal-footer {
    @apply flex justify-end gap-3 p-6 border-t border-surface-300 dark:border-surface-600;
  }
</style>