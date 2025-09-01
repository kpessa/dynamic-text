<script lang="ts">
  import { onMount } from 'svelte';
  import { KPTCrudService } from '../services/KPTCrudService';
  import type { CustomKPTFunction, KPTCategory } from '../services/KPTCrudService';
  import CodeEditor from '../CodeEditor.svelte';

  export let mode: 'create' | 'edit' = 'create';
  export let functionId: string | null = null;
  export let userId: string;
  export let showHistory: boolean = false;
  export let onSave: ((func: CustomKPTFunction) => void) | null = null;
  export let onCancel: (() => void) | null = null;

  let service: KPTCrudService;
  let currentFunction: CustomKPTFunction | null = null;
  let formData = {
    name: '',
    category: 'utility' as KPTCategory,
    signature: '',
    description: '',
    code: '',
    example: '',
    parameters: [] as any[],
    returns: ''
  };

  let errors: Record<string, string> = {};
  let validationMessage = '';
  let isValidating = false;
  let isSaving = false;
  let successMessage = '';
  let showDeleteModal = false;
  let versionHistory: any[] = [];

  const categories: KPTCategory[] = [
    'text', 'formatting', 'tpn', 'conditional', 
    'validation', 'html', 'utility', 'math'
  ];

  const reservedKeywords = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
    'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch',
    'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
    'let', 'static', 'enum', 'await', 'async'
  ]);

  onMount(async () => {
    service = new KPTCrudService();
    
    if (mode === 'edit' && functionId) {
      await loadFunction();
    }
  });

  async function loadFunction() {
    if (!functionId) return;
    
    try {
      currentFunction = await service.getFunction(functionId);
      if (currentFunction) {
        formData = {
          name: currentFunction.name,
          category: currentFunction.category,
          signature: currentFunction.signature,
          description: currentFunction.description,
          code: currentFunction.code,
          example: currentFunction.example || '',
          parameters: currentFunction.parameters || [],
          returns: currentFunction.returns || ''
        };

        if (showHistory) {
          versionHistory = await service.getFunctionHistory(functionId);
        }
      }
    } catch (error) {
      errors.general = `Failed to load function: ${error}`;
    }
  }

  function validateName() {
    errors.name = '';
    
    if (!formData.name) {
      errors.name = 'Function name is required';
      return false;
    }
    
    if (reservedKeywords.has(formData.name)) {
      errors.name = `"${formData.name}" is a reserved keyword`;
      return false;
    }
    
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.name)) {
      errors.name = 'Invalid function name format';
      return false;
    }
    
    return true;
  }

  function validateCode() {
    errors.code = '';
    
    if (!formData.code) {
      errors.code = 'Function code is required';
      return false;
    }
    
    const codeSize = new Blob([formData.code]).size;
    if (codeSize > 10 * 1024) {
      errors.code = `Code exceeds size limit (${(codeSize / 1024).toFixed(1)}KB / 10KB)`;
      return false;
    }
    
    return true;
  }

  async function validateFunction() {
    isValidating = true;
    validationMessage = '';
    
    try {
      const result = await service.validateFunction({
        name: formData.name,
        code: formData.code,
        category: formData.category,
        signature: formData.signature || `${formData.name}()`,
        description: formData.description
      });
      
      if (result.valid) {
        validationMessage = '✓ Valid syntax';
      } else {
        validationMessage = result.error || 'Invalid syntax';
        errors.code = result.error || 'Invalid function syntax';
      }
    } catch (error) {
      validationMessage = 'Validation error';
    } finally {
      isValidating = false;
    }
  }

  async function handleSubmit() {
    errors = {};
    successMessage = '';
    
    // Validate all fields
    const isNameValid = validateName();
    const isCodeValid = validateCode();
    
    if (!isNameValid || !isCodeValid) {
      return;
    }
    
    // Validate function syntax
    await validateFunction();
    if (errors.code) {
      return;
    }
    
    isSaving = true;
    
    try {
      let savedFunction: CustomKPTFunction;
      
      if (mode === 'create') {
        savedFunction = await service.createFunction({
          ...formData,
          signature: formData.signature || `${formData.name}()`,
          isCustom: true,
          userId
        });
        successMessage = 'Function created successfully';
      } else if (mode === 'edit' && functionId) {
        savedFunction = await service.updateFunction(functionId, {
          ...formData,
          signature: formData.signature || `${formData.name}()`
        });
        successMessage = 'Function updated successfully';
      } else {
        throw new Error('Invalid mode or missing function ID');
      }
      
      if (onSave) {
        onSave(savedFunction);
      }
      
      // Reset form if creating
      if (mode === 'create') {
        resetForm();
      }
    } catch (error: any) {
      errors.general = error.message || 'Failed to save function';
    } finally {
      isSaving = false;
    }
  }

  async function handleDelete() {
    if (!functionId || !currentFunction?.isCustom) return;
    
    try {
      await service.deleteFunction(functionId);
      successMessage = 'Function deleted successfully';
      showDeleteModal = false;
      
      if (onCancel) {
        setTimeout(() => onCancel(), 1000);
      }
    } catch (error: any) {
      errors.general = error.message || 'Failed to delete function';
    }
  }

  function resetForm() {
    formData = {
      name: '',
      category: 'utility',
      signature: '',
      description: '',
      code: '',
      example: '',
      parameters: [],
      returns: ''
    };
    errors = {};
    validationMessage = '';
  }

  function handleCodeChange(event: CustomEvent) {
    formData.code = event.detail;
    // Debounced validation
    setTimeout(() => {
      if (formData.code) {
        validateFunction();
      }
    }, 500);
  }

  $: isBuiltIn = currentFunction && !currentFunction.isCustom;
  $: canEdit = !isBuiltIn;
  $: canDelete = currentFunction?.isCustom;
</script>

<div class="kpt-function-editor">
  {#if errors.general}
    <div class="alert variant-filled-error mb-4">
      <span>{errors.general}</span>
    </div>
  {/if}

  {#if successMessage}
    <div class="alert variant-filled-success mb-4">
      <span>{successMessage}</span>
    </div>
  {/if}

  {#if isBuiltIn}
    <div class="alert variant-filled-warning mb-4">
      <span>Cannot edit built-in functions</span>
    </div>
  {/if}

  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <!-- Function Name -->
    <label class="label">
      <span>Function Name *</span>
      <input
        type="text"
        class="input"
        class:input-error={errors.name}
        bind:value={formData.name}
        on:blur={validateName}
        disabled={!canEdit || mode === 'edit'}
        placeholder="myCustomFunction"
        name="functionName"
        aria-label="Function name"
      />
      {#if errors.name}
        <span class="text-error-500 text-sm">{errors.name}</span>
      {/if}
    </label>

    <!-- Category -->
    <label class="label">
      <span>Category *</span>
      <select
        class="select"
        bind:value={formData.category}
        disabled={!canEdit}
        name="category"
        aria-label="Category"
      >
        {#each categories as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
    </label>

    <!-- Signature -->
    <label class="label">
      <span>Signature</span>
      <input
        type="text"
        class="input"
        bind:value={formData.signature}
        disabled={!canEdit}
        placeholder="{formData.name || 'functionName'}(param1: type, param2: type): returnType"
        name="signature"
        aria-label="Signature"
      />
    </label>

    <!-- Description -->
    <label class="label">
      <span>Description *</span>
      <textarea
        class="textarea"
        bind:value={formData.description}
        disabled={!canEdit}
        rows="2"
        placeholder="Describe what this function does"
        name="description"
        aria-label="Description"
      />
    </label>

    <!-- Function Code -->
    <div class="label">
      <span>Function Code *</span>
      {#if canEdit}
        <div class="relative">
          <CodeEditor
            value={formData.code}
            language="javascript"
            on:change={handleCodeChange}
            placeholder="// Write your function code here&#10;// You have access to 'this' context with getValue() and other TPN functions&#10;return result;"
          />
          {#if validationMessage}
            <div class="absolute top-2 right-2 px-2 py-1 rounded text-sm"
                 class:bg-success-500={validationMessage.includes('✓')}
                 class:bg-error-500={!validationMessage.includes('✓')}>
              {validationMessage}
            </div>
          {/if}
        </div>
      {:else}
        <textarea
          class="textarea font-mono"
          value={formData.code}
          disabled
          rows="10"
          name="code"
          aria-label="Function code"
        />
      {/if}
      {#if errors.code}
        <span class="text-error-500 text-sm">{errors.code}</span>
      {/if}
    </div>

    <!-- Example -->
    <label class="label">
      <span>Example Usage</span>
      <input
        type="text"
        class="input font-mono"
        bind:value={formData.example}
        disabled={!canEdit}
        placeholder="const result = me.kpt.{formData.name || 'functionName'}(args);"
        name="example"
      />
    </label>

    <!-- Buttons -->
    <div class="flex gap-4 justify-end">
      {#if onCancel}
        <button
          type="button"
          class="btn variant-ghost"
          on:click={onCancel}
        >
          Cancel
        </button>
      {/if}

      {#if canDelete && mode === 'edit'}
        <button
          type="button"
          class="btn variant-filled-error"
          on:click={() => showDeleteModal = true}
          aria-label="Delete {formData.name}"
        >
          Delete Function
        </button>
      {/if}

      {#if canEdit}
        <button
          type="submit"
          class="btn variant-filled-primary"
          disabled={isSaving || isValidating}
        >
          {#if isSaving}
            <span class="animate-spin">⟳</span>
          {:else if mode === 'create'}
            Create Function
          {:else}
            Save Changes
          {/if}
        </button>
      {/if}
    </div>
  </form>

  <!-- Version History -->
  {#if showHistory && versionHistory.length > 0}
    <div class="mt-8">
      <h3 class="h3 mb-4">Version History</h3>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Description</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each versionHistory as version}
              <tr>
                <td>Version {version.version}</td>
                <td>{version.description}</td>
                <td>{new Date(version.updatedAt).toLocaleString()}</td>
                <td>
                  <button
                    class="btn btn-sm variant-ghost"
                    on:click={() => service.restoreVersion(functionId, version.version)}
                    aria-label="Restore Version {version.version}"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal}
    <div class="modal-backdrop" on:click={() => showDeleteModal = false}>
      <div class="modal card p-6" on:click|stopPropagation>
        <h3 class="h3 mb-4">Confirm Delete</h3>
        <p>Are you sure you want to delete the function "{formData.name}"?</p>
        <p class="text-warning-500 mt-2">This action cannot be undone.</p>
        <div class="flex gap-4 justify-end mt-6">
          <button
            class="btn variant-ghost"
            on:click={() => showDeleteModal = false}
          >
            Cancel
          </button>
          <button
            class="btn variant-filled-error"
            on:click={handleDelete}
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .kpt-function-editor {
    max-width: 800px;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
  }

  .modal {
    max-width: 500px;
    width: 90%;
  }
</style>