<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ingredientService, type Ingredient, type MergeStrategy, type ImportResult } from '$lib/services/ingredientService';
  import type { Section } from '$lib/types';
  
  export let show = false;
  export let existingIngredients: Ingredient[] = [];
  
  const dispatch = createEventDispatcher();
  
  let fileInput: HTMLInputElement;
  let importContent = '';
  let parsedIngredients: Ingredient[] = [];
  let duplicates: Map<string, MergeStrategy> = new Map();
  let validationErrors: string[] = [];
  let importMode: 'file' | 'text' = 'file';
  let isValidating = false;
  let previewMode = false;

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        importContent = e.target?.result as string;
        validateImport();
      };
      reader.readAsText(file);
    }
  }

  function validateImport() {
    isValidating = true;
    validationErrors = [];
    parsedIngredients = [];
    duplicates.clear();
    
    try {
      // Try to parse as array first
      let parsed = JSON.parse(importContent);
      
      // If it's a single ingredient, wrap in array
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }
      
      const result = ingredientService.importIngredients(JSON.stringify(parsed));
      
      if (result.failed.length > 0) {
        validationErrors = result.failed.map(f => f.error);
      }
      
      parsedIngredients = result.successful;
      
      // Check for duplicates
      for (const ingredient of parsedIngredients) {
        if (ingredientService.checkDuplicateIngredient(ingredient.KEYNAME, existingIngredients)) {
          duplicates.set(ingredient.KEYNAME, 'skip');
        }
      }
      
      if (parsedIngredients.length > 0 && validationErrors.length === 0) {
        previewMode = true;
      }
    } catch (error) {
      validationErrors = [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`];
    } finally {
      isValidating = false;
    }
  }

  function handleImport() {
    const importedIngredients: Ingredient[] = [];
    const results: ImportResult[] = [];
    
    for (const ingredient of parsedIngredients) {
      const strategy = duplicates.get(ingredient.KEYNAME) || 'skip';
      const mergeResult = ingredientService.mergeIngredient(
        ingredient,
        [...existingIngredients, ...importedIngredients],
        strategy
      );
      
      if (mergeResult.result.success && mergeResult.result.ingredient) {
        importedIngredients.push(mergeResult.result.ingredient);
      }
      
      results.push(mergeResult.result);
    }
    
    dispatch('import', {
      ingredients: importedIngredients,
      results
    });
    
    close();
  }

  function close() {
    show = false;
    importContent = '';
    parsedIngredients = [];
    duplicates.clear();
    validationErrors = [];
    previewMode = false;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function updateStrategy(keyname: string, strategy: MergeStrategy) {
    duplicates.set(keyname, strategy);
    duplicates = duplicates;
  }
</script>

{#if show}
  <div class="modal-backdrop" on:click={close}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Import Ingredients</h2>
        <button on:click={close} class="btn-icon variant-filled-surface">
          <span>✕</span>
        </button>
      </div>
      
      <div class="modal-body">
        {#if !previewMode}
          <div class="import-options">
            <div class="tab-group">
              <button
                class="tab {importMode === 'file' ? 'active' : ''}"
                on:click={() => importMode = 'file'}
              >
                Upload File
              </button>
              <button
                class="tab {importMode === 'text' ? 'active' : ''}"
                on:click={() => importMode = 'text'}
              >
                Paste JSON
              </button>
            </div>
            
            {#if importMode === 'file'}
              <div class="file-upload">
                <input
                  bind:this={fileInput}
                  type="file"
                  accept=".json"
                  on:change={handleFileSelect}
                  class="input"
                />
                <p class="help-text">
                  Select a JSON file containing one or more ingredients
                </p>
              </div>
            {:else}
              <div class="text-import">
                <textarea
                  bind:value={importContent}
                  placeholder="Paste ingredient JSON here..."
                  class="textarea"
                  rows="10"
                />
                <button
                  on:click={validateImport}
                  disabled={!importContent || isValidating}
                  class="btn variant-filled-primary"
                >
                  Validate Import
                </button>
              </div>
            {/if}
          </div>
          
          {#if validationErrors.length > 0}
            <div class="alert variant-filled-error">
              <h4>Validation Errors:</h4>
              <ul>
                {#each validationErrors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          {/if}
        {:else}
          <div class="preview">
            <h3>Import Preview</h3>
            <p class="summary">
              {parsedIngredients.length} ingredient{parsedIngredients.length !== 1 ? 's' : ''} ready to import
              {#if duplicates.size > 0}
                ({duplicates.size} duplicate{duplicates.size !== 1 ? 's' : ''} found)
              {/if}
            </p>
            
            <div class="ingredient-preview-list">
              {#each parsedIngredients as ingredient}
                <div class="ingredient-preview">
                  <div class="ingredient-header">
                    <strong>{ingredient.DISPLAY}</strong>
                    <span class="badge variant-soft">{ingredient.TYPE}</span>
                  </div>
                  <div class="ingredient-meta">
                    <span>Key: {ingredient.KEYNAME}</span>
                    <span>Mnemonic: {ingredient.MNEMONIC}</span>
                    <span>Unit: {ingredient.UOM_DISP}</span>
                  </div>
                  
                  {#if duplicates.has(ingredient.KEYNAME)}
                    <div class="duplicate-warning">
                      <span class="warning-icon">⚠️</span>
                      <span>Duplicate found</span>
                      <select
                        value={duplicates.get(ingredient.KEYNAME)}
                        on:change={(e) => updateStrategy(ingredient.KEYNAME, e.currentTarget.value as MergeStrategy)}
                        class="select select-sm"
                      >
                        <option value="skip">Skip (keep existing)</option>
                        <option value="overwrite">Overwrite existing</option>
                        <option value="rename">Import with new name</option>
                      </select>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button on:click={close} class="btn variant-ghost">
          Cancel
        </button>
        {#if previewMode}
          <button on:click={() => previewMode = false} class="btn variant-ghost">
            Back
          </button>
          <button on:click={handleImport} class="btn variant-filled-primary">
            Import {parsedIngredients.length} Ingredient{parsedIngredients.length !== 1 ? 's' : ''}
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
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
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
  }
  
  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid rgb(var(--color-surface-200));
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  
  .tab-group {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1rem;
    
    .tab {
      flex: 1;
      padding: 0.5rem 1rem;
      border: 1px solid rgb(var(--color-surface-300));
      background: rgb(var(--color-surface-100));
      cursor: pointer;
      transition: all 0.2s;
      
      &.active {
        background: rgb(var(--color-primary-500));
        color: white;
        border-color: rgb(var(--color-primary-500));
      }
      
      &:first-child {
        border-radius: 0.25rem 0 0 0.25rem;
      }
      
      &:last-child {
        border-radius: 0 0.25rem 0.25rem 0;
      }
    }
  }
  
  .file-upload {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .text-import {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .help-text {
    font-size: 0.875rem;
    color: rgb(var(--color-surface-600));
  }
  
  .preview {
    .summary {
      margin: 0.5rem 0 1rem;
      color: rgb(var(--color-surface-700));
    }
  }
  
  .ingredient-preview-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .ingredient-preview {
    background: rgb(var(--color-surface-100));
    padding: 1rem;
    border-radius: 0.25rem;
    border: 1px solid rgb(var(--color-surface-200));
  }
  
  .ingredient-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .ingredient-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: rgb(var(--color-surface-600));
  }
  
  .duplicate-warning {
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: rgb(var(--color-warning-50));
    border: 1px solid rgb(var(--color-warning-200));
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .warning-icon {
      font-size: 1.25rem;
    }
    
    select {
      margin-left: auto;
    }
  }
  
  .alert {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 0.25rem;
    
    h4 {
      margin: 0 0 0.5rem;
    }
    
    ul {
      margin: 0;
      padding-left: 1.5rem;
    }
  }
</style>