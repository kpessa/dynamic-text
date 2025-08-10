<script>
  import BaseModal from './BaseModal.svelte';
  import Icons from './Icons.svelte';
  import { sectionsToNoteArray, createNoteFormatIngredient, downloadNoteFormat } from './noteFormatConverter.js';
  
  let {
    isOpen = $bindable(false),
    sections = [],
    currentIngredient = '',
    currentReferenceName = '',
    healthSystem = '',
    populationType = '',
    onClose = () => {}
  } = $props();
  
  let exportFormat = $state('note'); // 'note' or 'legacy'
  let preview = $state('');
  let copied = $state(false);
  
  // Generate preview based on selected format
  $effect(() => {
    if (!isOpen) return;
    
    if (exportFormat === 'note') {
      // Generate NOTE format
      const noteData = createNoteFormatIngredient({
        sections: sections,
        ingredient: currentIngredient,
        name: currentReferenceName
      });
      preview = JSON.stringify(noteData, null, 2);
    } else {
      // Legacy format (current export format)
      const result = [];
      sections.forEach(section => {
        if (section.type === 'static') {
          const lines = section.content.split('\n');
          lines.forEach(line => {
            result.push({ TEXT: line });
          });
        } else if (section.type === 'dynamic') {
          result.push({ TEXT: '[f(' });
          const lines = section.content.split('\n');
          lines.forEach(line => {
            result.push({ TEXT: line });
          });
          result.push({ TEXT: ')]' });
        }
      });
      preview = JSON.stringify(result, null, 2);
    }
  });
  
  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(preview);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  }
  
  function downloadFile() {
    const filename = exportFormat === 'note' 
      ? `${currentIngredient || 'export'}_NOTE.json`
      : `${currentIngredient || 'export'}_sections.json`;
      
    const blob = new Blob([preview], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
</script>

<BaseModal
  bind:isOpen
  title="Export Options"
  size="large"
  {onClose}
>
  {#snippet children()}
    <div class="export-modal-content">
      <!-- Format Selection -->
      <div class="modal-section">
        <h3 class="modal-section-title">Export Format</h3>
        <div class="modal-tabs">
          <button 
            class="modal-tab {exportFormat === 'note' ? 'active' : ''}"
            onclick={() => exportFormat = 'note'}
          >
            <Icons icon="document" size={16} />
            NOTE Format (Recommended)
          </button>
          <button 
            class="modal-tab {exportFormat === 'legacy' ? 'active' : ''}"
            onclick={() => exportFormat = 'legacy'}
          >
            <Icons icon="code" size={16} />
            Legacy Format
          </button>
        </div>
        
        {#if exportFormat === 'note'}
          <div class="modal-alert alert-info">
            <Icons icon="info" size={20} className="alert-icon" />
            <div class="alert-content">
              NOTE format is the recommended format for importing into TPN systems. 
              It preserves all metadata and is compatible with the latest TPN configurator.
            </div>
          </div>
        {:else}
          <div class="modal-alert alert-warning">
            <Icons icon="warning" size={20} className="alert-icon" />
            <div class="alert-content">
              Legacy format is provided for backward compatibility. 
              Consider using NOTE format for better compatibility with modern systems.
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Export Details -->
      {#if currentIngredient || currentReferenceName}
        <div class="modal-section">
          <h3 class="modal-section-title">Export Details</h3>
          <div class="export-details">
            {#if currentIngredient}
              <div class="detail-row">
                <span class="detail-label">Ingredient:</span>
                <span class="detail-value">{currentIngredient}</span>
              </div>
            {/if}
            {#if currentReferenceName}
              <div class="detail-row">
                <span class="detail-label">Reference:</span>
                <span class="detail-value">{currentReferenceName}</span>
              </div>
            {/if}
            {#if healthSystem}
              <div class="detail-row">
                <span class="detail-label">Health System:</span>
                <span class="detail-value">{healthSystem}</span>
              </div>
            {/if}
            {#if populationType}
              <div class="detail-row">
                <span class="detail-label">Population:</span>
                <span class="detail-value">{populationType}</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
      
      <!-- Preview -->
      <div class="modal-section">
        <h3 class="modal-section-title">Preview</h3>
        <div class="code-preview">
          <pre class="modal-scroll-area">{preview}</pre>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={() => isOpen = false}>
          Cancel
        </button>
        <button 
          class="btn btn-primary"
          onclick={copyToClipboard}
        >
          <Icons icon={copied ? "check" : "copy"} size={16} />
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
        <button 
          class="btn btn-success"
          onclick={downloadFile}
        >
          <Icons icon="download" size={16} />
          Download File
        </button>
      </div>
    </div>
  {/snippet}
</BaseModal>

<style lang="scss">
  @use '../styles/abstracts/variables' as *;
  @use '../styles/abstracts/mixins' as *;
  @use '../styles/components/modals';
  
  .export-modal-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }
  
  .export-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    
    .detail-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      
      .detail-label {
        font-weight: var(--font-weight-medium);
        color: var(--color-text-muted);
        min-width: 120px;
      }
      
      .detail-value {
        flex: 1;
        color: var(--color-text);
        font-family: var(--font-family-mono);
      }
    }
  }
  
  .code-preview {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    
    pre {
      margin: 0;
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      color: var(--color-text);
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 300px;
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
    
    &.btn-success {
      background: var(--color-success);
      border-color: var(--color-success);
      color: white;
      
      &:hover {
        background: var(--color-success-dark);
        border-color: var(--color-success-dark);
      }
    }
  }
  
  // Dark mode adjustments
  :global([data-theme="dark"]) {
    .code-preview {
      background: var(--color-surface-dark);
      
      pre {
        color: var(--color-text-light);
      }
    }
  }
</style>