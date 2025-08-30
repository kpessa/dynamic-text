<script lang="ts">
  import { tpnConfigService, type TPNConfiguration, type PopulationType } from '../services/tpnConfigService';
  import { tpnConfigFirebaseService } from '../services/tpnConfigFirebaseService';
  import { sectionStore } from '../../stores/sectionStore.svelte';
  
  const props = $props<{
    isOpen?: boolean;
    baseConfig?: TPNConfiguration;
    onExport?: (config: TPNConfiguration) => void;
  }>();
  
  let isOpen = $state(props.isOpen ?? false);
  let baseConfig = props.baseConfig;
  let onExport = props.onExport;
  
  let exportMethod = $state<'file' | 'firebase'>('file');
  let configName = $state('');
  let configDescription = $state('');
  let populationType = $state<PopulationType>('adult');
  let isExporting = $state(false);
  let exportSuccess = $state(false);
  let exportError = $state<string | null>(null);
  let downloadUrl = $state<string | null>(null);
  
  async function handleExport() {
    if (exportMethod === 'firebase' && !configName) {
      exportError = 'Please enter a name for the configuration';
      return;
    }
    
    isExporting = true;
    exportError = null;
    exportSuccess = false;
    
    try {
      // Get current sections from store
      const sections = sectionStore.sections;
      
      // Create or update configuration with current sections
      let exportConfig: TPNConfiguration;
      
      if (baseConfig) {
        // Update existing config with current sections
        exportConfig = tpnConfigService.exportTPNConfig(sections as any, baseConfig);
      } else {
        // Create new configuration
        exportConfig = tpnConfigService.createEmptyConfig(populationType);
        
        // For this example, we're exporting all sections
        // In a real scenario, you'd map sections to specific ingredients
        exportConfig = tpnConfigService.exportTPNConfig(sections as any, exportConfig);
      }
      
      // Validate before export
      const validation = tpnConfigService.validateTPNConfig(exportConfig);
      if (!validation.valid) {
        exportError = `Configuration validation failed: ${validation.errors.join(', ')}`;
        isExporting = false;
        return;
      }
      
      if (exportMethod === 'file') {
        // Export to file
        const jsonContent = JSON.stringify(exportConfig, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        downloadUrl = URL.createObjectURL(blob);
        
        // Create download link
        const fileName = `tpn-config-${populationType}-${Date.now()}.json`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.click();
        
        exportSuccess = true;
        
        // Call export callback if provided
        if (onExport) {
          onExport(exportConfig);
        }
        
        // Close modal after short delay
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else if (exportMethod === 'firebase') {
        // Save to Firebase
        const result = await tpnConfigFirebaseService.saveTPNConfiguration(
          configName,
          exportConfig,
          populationType,
          configDescription || undefined
        );
        
        if (result.success) {
          exportSuccess = true;
          
          // Call export callback if provided
          if (onExport) {
            onExport(exportConfig);
          }
          
          // Close modal after short delay
          setTimeout(() => {
            closeModal();
          }, 2000);
        } else {
          exportError = result.error || 'Failed to save configuration';
        }
      }
    } catch (error) {
      exportError = error instanceof Error ? error.message : 'Export failed';
    } finally {
      isExporting = false;
    }
  }
  
  function closeModal() {
    isOpen = false;
    resetForm();
  }
  
  function resetForm() {
    configName = '';
    configDescription = '';
    exportSuccess = false;
    exportError = null;
    isExporting = false;
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      downloadUrl = null;
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
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={closeModal}>
    <div class="modal-container" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2 class="text-xl font-semibold">Export TPN Configuration</h2>
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
        {#if exportSuccess}
          <div class="alert variant-filled-success">
            <div class="alert-message">
              <h3 class="font-semibold">Export Successful!</h3>
              <p>
                {#if exportMethod === 'file'}
                  The TPN configuration has been downloaded to your device.
                {:else}
                  The TPN configuration has been saved to Firebase.
                {/if}
              </p>
            </div>
          </div>
        {:else}
          <div class="space-y-4">
            <!-- Export Method Selection -->
            <div class="radio-group">
              <label class="flex items-center space-x-2">
                <input 
                  type="radio" 
                  bind:group={exportMethod} 
                  value="file"
                  class="radio" />
                <span>Export to File</span>
              </label>
              <label class="flex items-center space-x-2">
                <input 
                  type="radio" 
                  bind:group={exportMethod} 
                  value="firebase"
                  class="radio" />
                <span>Save to Firebase</span>
              </label>
            </div>
            
            <!-- Population Type Selection -->
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
            
            {#if exportMethod === 'firebase'}
              <!-- Firebase Save Options -->
              <div class="space-y-4">
                <label class="label">
                  <span>Configuration Name <span class="text-error-500">*</span></span>
                  <input 
                    type="text" 
                    bind:value={configName}
                    placeholder="Enter a name for this configuration"
                    class="input" />
                </label>
                
                <label class="label">
                  <span>Description (Optional)</span>
                  <textarea 
                    bind:value={configDescription}
                    placeholder="Add a description to help identify this configuration"
                    rows="3"
                    class="textarea"></textarea>
                </label>
              </div>
            {:else}
              <!-- File Export Info -->
              <div class="alert variant-ghost-primary">
                <div class="alert-message">
                  <p class="text-sm">
                    The configuration will be downloaded as a JSON file that can be imported later or shared with others.
                  </p>
                </div>
              </div>
            {/if}
            
            <!-- Configuration Summary -->
            <div class="card variant-ghost-surface p-4">
              <h3 class="font-semibold mb-2">Configuration Summary</h3>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>Population Type:</span>
                  <span class="font-medium">{getPopulationTypeLabel(populationType)}</span>
                </div>
                {#if baseConfig}
                  <div class="flex justify-between">
                    <span>Ingredients:</span>
                    <span class="font-medium">{baseConfig.INGREDIENT?.length || 0}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Flex Configs:</span>
                    <span class="font-medium">{baseConfig.FLEX?.length || 0}</span>
                  </div>
                {/if}
                <div class="flex justify-between">
                  <span>Sections:</span>
                  <span class="font-medium">{sectionStore.sections.length}</span>
                </div>
              </div>
            </div>
            
            <!-- Export Error -->
            {#if exportError}
              <div class="alert variant-filled-error">
                <div class="alert-message">
                  <p>{exportError}</p>
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
          {exportSuccess ? 'Close' : 'Cancel'}
        </button>
        {#if !exportSuccess}
          <button 
            onclick={handleExport}
            disabled={isExporting}
            class="btn variant-filled-primary">
            {#if isExporting}
              <span class="animate-spin mr-2">⟳</span>
              Exporting...
            {:else}
              {exportMethod === 'file' ? 'Download' : 'Save'} Configuration
            {/if}
          </button>
        {/if}
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