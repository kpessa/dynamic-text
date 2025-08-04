<script>
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
  
  function handleClose() {
    isOpen = false;
    onClose();
  }
</script>

{#if isOpen}
  <div 
    class="modal-overlay" 
    onclick={handleClose}
    onkeydown={(e) => e.key === 'Escape' && handleClose()}
    role="button"
    tabindex="-1"
  >
    <div 
      class="modal-content" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Export Options"
    >
      <div class="modal-header">
        <h2>Export Options</h2>
        <button class="close-btn" onclick={handleClose}>×</button>
      </div>
      
      <div class="export-info">
        {#if currentIngredient}
          <div class="info-row">
            <span class="info-label">Ingredient:</span>
            <span class="info-value">{currentIngredient}</span>
          </div>
        {/if}
        {#if currentReferenceName}
          <div class="info-row">
            <span class="info-label">Reference:</span>
            <span class="info-value">{currentReferenceName}</span>
          </div>
        {/if}
        {#if healthSystem}
          <div class="info-row">
            <span class="info-label">Health System:</span>
            <span class="info-value">{healthSystem}</span>
          </div>
        {/if}
        {#if populationType}
          <div class="info-row">
            <span class="info-label">Population:</span>
            <span class="info-value">{populationType}</span>
          </div>
        {/if}
      </div>
      
      <div class="format-selection">
        <label class="format-option">
          <input 
            type="radio" 
            bind:group={exportFormat} 
            value="note"
          />
          <div class="option-content">
            <span class="option-title">NOTE Format (Production)</span>
            <span class="option-desc">Export as NOTE array format for TPN configurator</span>
          </div>
        </label>
        
        <label class="format-option">
          <input 
            type="radio" 
            bind:group={exportFormat} 
            value="legacy"
          />
          <div class="option-content">
            <span class="option-title">Sections Format (Editor)</span>
            <span class="option-desc">Export as sections array for re-import into editor</span>
          </div>
        </label>
      </div>
      
      <div class="preview-section">
        <div class="preview-header">
          <h3>Preview</h3>
          <div class="preview-actions">
            <button 
              class="preview-btn {copied ? 'copied' : ''}"
              onclick={copyToClipboard}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            <button 
              class="preview-btn"
              onclick={downloadFile}
            >
              💾 Download
            </button>
          </div>
        </div>
        <pre class="preview-content">{preview}</pre>
      </div>
      
      <div class="modal-actions">
        <button class="btn-secondary" onclick={handleClose}>Close</button>
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
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.2s ease-out;
  }
  
  .modal-content {
    background: var(--color-bg, white);
    border-radius: 8px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.2s ease-out;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--color-border, #e0e0e0);
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--color-text, #333);
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text-secondary, #666);
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  .close-btn:hover {
    background: var(--color-hover-bg, #f0f0f0);
  }
  
  .export-info {
    padding: 20px;
    background: var(--color-bg-secondary, #f8f9fa);
    border-bottom: 1px solid var(--color-border, #e0e0e0);
  }
  
  .info-row {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
  }
  
  .info-row:last-child {
    margin-bottom: 0;
  }
  
  .info-label {
    font-weight: 600;
    color: var(--color-text-secondary, #666);
    min-width: 120px;
  }
  
  .info-value {
    color: var(--color-text, #333);
  }
  
  .format-selection {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-bottom: 1px solid var(--color-border, #e0e0e0);
  }
  
  .format-option {
    display: flex;
    align-items: flex-start;
    padding: 12px;
    border: 2px solid var(--color-border, #e0e0e0);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .format-option:hover {
    background: var(--color-hover-bg, #f8f9fa);
  }
  
  .format-option:has(input:checked) {
    border-color: var(--color-primary, #007bff);
    background: var(--color-primary-light, #e7f3ff);
  }
  
  .format-option input {
    margin-right: 12px;
    margin-top: 2px;
  }
  
  .option-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .option-title {
    font-weight: 600;
    color: var(--color-text, #333);
  }
  
  .option-desc {
    font-size: 0.875rem;
    color: var(--color-text-secondary, #666);
  }
  
  .preview-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 20px;
  }
  
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .preview-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: var(--color-text, #333);
  }
  
  .preview-actions {
    display: flex;
    gap: 8px;
  }
  
  .preview-btn {
    padding: 6px 12px;
    background: var(--color-bg-secondary, #f8f9fa);
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .preview-btn:hover {
    background: var(--color-hover-bg, #e9ecef);
  }
  
  .preview-btn.copied {
    background: var(--color-success, #28a745);
    color: white;
    border-color: var(--color-success, #28a745);
  }
  
  .preview-content {
    flex: 1;
    background: var(--color-code-bg, #f6f8fa);
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: 4px;
    padding: 16px;
    overflow: auto;
    font-family: monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0;
    min-height: 200px;
  }
  
  .modal-actions {
    padding: 20px;
    border-top: 1px solid var(--color-border, #e0e0e0);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  
  .btn-secondary {
    padding: 8px 16px;
    background: transparent;
    color: var(--color-text, #333);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .btn-secondary:hover {
    background: var(--color-hover-bg, #f8f8f8);
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>