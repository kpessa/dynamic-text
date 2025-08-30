<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ingredientService, type Ingredient } from '$lib/services/ingredientService';
  import IngredientSelector from './IngredientSelector.svelte';
  import type { Section } from '$lib/types';
  
  export let show = false;
  export let ingredients: Ingredient[] = [];
  export let sectionsMap: Map<string, Section[]> = new Map();
  
  const dispatch = createEventDispatcher();
  
  let selectedIngredients: Set<string> = new Set();
  let exportFormat: 'single' | 'multiple' = 'single';
  let fileName = 'ingredients';
  let showPreview = false;
  let jsonPreview = '';
  let copySuccess = false;

  function handleSelectionChange(selected: Set<string>) {
    selectedIngredients = selected;
  }

  function generatePreview() {
    const selectedItems = ingredients.filter(ing => selectedIngredients.has(ing.KEYNAME));
    
    if (selectedItems.length === 0) {
      jsonPreview = '';
      return;
    }
    
    if (exportFormat === 'single') {
      jsonPreview = ingredientService.exportIngredients(selectedItems, sectionsMap);
    } else {
      // For multiple files, show preview of first ingredient
      const first = selectedItems[0];
      const sections = sectionsMap.get(first.KEYNAME);
      jsonPreview = ingredientService.exportIngredient(first, sections);
      if (selectedItems.length > 1) {
        jsonPreview += `\n\n// ... and ${selectedItems.length - 1} more file(s)`;
      }
    }
  }

  function handleExport() {
    const selectedItems = ingredients.filter(ing => selectedIngredients.has(ing.KEYNAME));
    
    if (selectedItems.length === 0) {
      return;
    }
    
    if (exportFormat === 'single') {
      // Export all selected ingredients to a single file
      const json = ingredientService.exportIngredients(selectedItems, sectionsMap);
      downloadFile(`${fileName}.json`, json);
    } else {
      // Export each ingredient to a separate file
      if (selectedItems.length === 1) {
        const ingredient = selectedItems[0];
        const sections = sectionsMap.get(ingredient.KEYNAME);
        const json = ingredientService.exportIngredient(ingredient, sections);
        downloadFile(`${ingredient.KEYNAME}.json`, json);
      } else {
        // Create a ZIP file for multiple ingredients
        exportAsZip(selectedItems);
      }
    }
    
    dispatch('export', { count: selectedItems.length });
    close();
  }

  function downloadFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function exportAsZip(items: Ingredient[]) {
    // For now, we'll download them sequentially
    // In a real implementation, you'd use a ZIP library
    for (const ingredient of items) {
      const sections = sectionsMap.get(ingredient.KEYNAME);
      const json = ingredientService.exportIngredient(ingredient, sections);
      downloadFile(`${ingredient.KEYNAME}.json`, json);
      // Small delay to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(jsonPreview);
      copySuccess = true;
      setTimeout(() => copySuccess = false, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function close() {
    show = false;
    selectedIngredients = new Set();
    showPreview = false;
    jsonPreview = '';
    fileName = 'ingredients';
    copySuccess = false;
  }

  $: if (selectedIngredients.size > 0 && showPreview) {
    generatePreview();
  }
</script>

{#if show}
  <div class="modal-backdrop" on:click={close}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Export Ingredients</h2>
        <button on:click={close} class="btn-icon variant-filled-surface">
          <span>✕</span>
        </button>
      </div>
      
      <div class="modal-body">
        {#if !showPreview}
          <div class="export-config">
            <div class="section">
              <h3>Select Ingredients to Export</h3>
              <div class="selector-container">
                <IngredientSelector
                  {ingredients}
                  {selectedIngredients}
                  onSelectionChange={handleSelectionChange}
                />
              </div>
            </div>
            
            {#if selectedIngredients.size > 0}
              <div class="section">
                <h3>Export Options</h3>
                <div class="export-options">
                  <div class="option-group">
                    <label>
                      <input
                        type="radio"
                        bind:group={exportFormat}
                        value="single"
                      />
                      Single file (all ingredients)
                    </label>
                    <label>
                      <input
                        type="radio"
                        bind:group={exportFormat}
                        value="multiple"
                        disabled={selectedIngredients.size === 1}
                      />
                      Multiple files (one per ingredient)
                      {#if selectedIngredients.size === 1}
                        <span class="hint">(select multiple ingredients to enable)</span>
                      {/if}
                    </label>
                  </div>
                  
                  {#if exportFormat === 'single'}
                    <div class="filename-input">
                      <label for="filename">File name:</label>
                      <div class="input-group">
                        <input
                          id="filename"
                          type="text"
                          bind:value={fileName}
                          class="input"
                        />
                        <span class="extension">.json</span>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <div class="preview-section">
            <div class="preview-header">
              <h3>Export Preview</h3>
              <button
                on:click={copyToClipboard}
                class="btn variant-filled-surface btn-sm"
              >
                {copySuccess ? '✓ Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <pre class="json-preview">{jsonPreview}</pre>
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button on:click={close} class="btn variant-ghost">
          Cancel
        </button>
        {#if selectedIngredients.size > 0}
          {#if !showPreview}
            <button
              on:click={() => showPreview = true}
              class="btn variant-filled-surface"
            >
              Preview
            </button>
          {:else}
            <button
              on:click={() => showPreview = false}
              class="btn variant-ghost"
            >
              Back
            </button>
          {/if}
          <button
            on:click={handleExport}
            disabled={selectedIngredients.size === 0}
            class="btn variant-filled-primary"
          >
            Export {selectedIngredients.size} Ingredient{selectedIngredients.size !== 1 ? 's' : ''}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
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
    z-index: 999;
  }
  
  .modal-content {
    background: rgb(var(--color-surface-50));
    border-radius: 0.5rem;
    max-width: 800px;
    width: 90%;
    height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
  
  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid rgb(var(--color-surface-200));
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h2 {
      margin: 0;
      font-size: 1.5rem;
    }
  }
  
  .modal-body {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  
  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid rgb(var(--color-surface-200));
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  
  .export-config {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
  }
  
  .section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    
    h3 {
      margin: 0;
      font-size: 1.125rem;
      color: rgb(var(--color-surface-900));
    }
  }
  
  .selector-container {
    flex: 1;
    min-height: 300px;
    max-height: 400px;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem;
    padding: 1rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .export-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .option-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    
    label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      
      input[type="radio"] {
        margin: 0;
      }
      
      .hint {
        font-size: 0.875rem;
        color: rgb(var(--color-surface-500));
        font-style: italic;
      }
    }
  }
  
  .filename-input {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    
    label {
      font-size: 0.875rem;
      color: rgb(var(--color-surface-700));
    }
    
    .input-group {
      display: flex;
      align-items: center;
      gap: 0;
      
      input {
        flex: 1;
        border-radius: 0.25rem 0 0 0.25rem;
      }
      
      .extension {
        padding: 0.5rem 0.75rem;
        background: rgb(var(--color-surface-200));
        border: 1px solid rgb(var(--color-surface-400));
        border-left: none;
        border-radius: 0 0.25rem 0.25rem 0;
        font-family: monospace;
      }
    }
  }
  
  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }
  
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h3 {
      margin: 0;
      font-size: 1.125rem;
    }
  }
  
  .json-preview {
    flex: 1;
    background: rgb(var(--color-surface-900));
    color: rgb(var(--color-surface-50));
    padding: 1rem;
    border-radius: 0.25rem;
    overflow: auto;
    font-family: monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0;
  }
  
  .btn-sm {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
  }
</style>