<script lang="ts">
  import type { Ingredient, Section, TestCase } from '../models';
  import CodeEditor from './CodeEditor.svelte';
  
  // Props with TypeScript
  let {
    ingredient = null as Ingredient | null,
    onSave = (updated: Ingredient) => {},
    onCancel = () => {},
    readOnly = false
  } = $props();

  // Local state for editing
  let editedIngredient = $state<Ingredient | null>(null);
  let activeTab = $state<'sections' | 'tests' | 'variants' | 'metadata'>('sections');
  let hasChanges = $state(false);
  let selectedSectionId = $state<string | null>(null);

  // Watch for ingredient changes
  $effect(() => {
    if (ingredient) {
      // Create a deep copy for editing
      editedIngredient = JSON.parse(JSON.stringify(ingredient));
      hasChanges = false;
      selectedSectionId = editedIngredient.sections?.[0]?.id || null;
    } else {
      editedIngredient = null;
    }
  });

  // Get selected section
  const selectedSection = $derived(() => {
    if (!editedIngredient || !selectedSectionId) return null;
    return editedIngredient.sections.find(s => s.id === selectedSectionId) || null;
  });

  // Update section content
  function updateSectionContent(sectionId: string, newContent: string) {
    if (!editedIngredient || readOnly) return;
    
    const sectionIndex = editedIngredient.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex !== -1) {
      editedIngredient.sections[sectionIndex].content = newContent;
      hasChanges = true;
    }
  }

  // Add new section
  function addSection() {
    if (!editedIngredient || readOnly) return;
    
    const newSection: Section = {
      id: `sec-${Date.now()}`,
      type: 'javascript',
      content: '// New section',
      order: editedIngredient.sections.length
    };
    
    editedIngredient.sections = [...editedIngredient.sections, newSection];
    selectedSectionId = newSection.id;
    hasChanges = true;
  }

  // Delete section
  function deleteSection(sectionId: string) {
    if (!editedIngredient || readOnly) return;
    
    editedIngredient.sections = editedIngredient.sections.filter(s => s.id !== sectionId);
    
    // Select another section if current was deleted
    if (selectedSectionId === sectionId) {
      selectedSectionId = editedIngredient.sections[0]?.id || null;
    }
    
    hasChanges = true;
  }

  // Toggle section type
  function toggleSectionType(sectionId: string) {
    if (!editedIngredient || readOnly) return;
    
    const section = editedIngredient.sections.find(s => s.id === sectionId);
    if (section) {
      section.type = section.type === 'javascript' ? 'html' : 'javascript';
      hasChanges = true;
    }
  }

  // Add new test
  function addTest() {
    if (!editedIngredient || readOnly) return;
    
    const newTest: TestCase = {
      id: `test-${Date.now()}`,
      name: `Test ${editedIngredient.tests.length + 1}`,
      variables: {}
    };
    
    editedIngredient.tests = [...editedIngredient.tests, newTest];
    hasChanges = true;
  }

  // Update test
  function updateTest(testId: string, updates: Partial<TestCase>) {
    if (!editedIngredient || readOnly) return;
    
    const testIndex = editedIngredient.tests.findIndex(t => t.id === testId);
    if (testIndex !== -1) {
      editedIngredient.tests[testIndex] = {
        ...editedIngredient.tests[testIndex],
        ...updates
      };
      hasChanges = true;
    }
  }

  // Delete test
  function deleteTest(testId: string) {
    if (!editedIngredient || readOnly) return;
    
    editedIngredient.tests = editedIngredient.tests.filter(t => t.id !== testId);
    hasChanges = true;
  }

  // Save changes
  function handleSave() {
    if (!editedIngredient || !hasChanges) return;
    onSave(editedIngredient);
    hasChanges = false;
  }

  // Cancel editing
  function handleCancel() {
    onCancel();
    hasChanges = false;
  }

  // Update metadata field
  function updateMetadataField(field: string, value: any) {
    if (!editedIngredient || readOnly) return;
    
    if (!editedIngredient.metadata) {
      editedIngredient.metadata = {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    editedIngredient.metadata = {
      ...editedIngredient.metadata,
      [field]: value
    };
    hasChanges = true;
  }
</script>

{#if editedIngredient}
<div class="ingredient-editor">
  <!-- Header -->
  <div class="editor-header">
    <h2 class="editor-title">
      {readOnly ? 'View' : 'Edit'}: {editedIngredient.displayName || editedIngredient.keyname}
    </h2>
    <div class="editor-actions">
      {#if !readOnly && hasChanges}
        <button
          onclick={handleSave}
          class="btn btn-primary btn-sm"
          data-testid="save-button"
        >
          Save Changes
        </button>
      {/if}
      <button
        onclick={handleCancel}
        class="btn btn-ghost btn-sm"
        data-testid="cancel-button"
      >
        {readOnly ? 'Close' : 'Cancel'}
      </button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs tabs-boxed">
    <button
      class="tab"
      class:tab-active={activeTab === 'sections'}
      onclick={() => activeTab = 'sections'}
    >
      Sections ({editedIngredient.sections.length})
    </button>
    <button
      class="tab"
      class:tab-active={activeTab === 'tests'}
      onclick={() => activeTab = 'tests'}
    >
      Tests ({editedIngredient.tests.length})
    </button>
    <button
      class="tab"
      class:tab-active={activeTab === 'variants'}
      onclick={() => activeTab = 'variants'}
    >
      Variants
    </button>
    <button
      class="tab"
      class:tab-active={activeTab === 'metadata'}
      onclick={() => activeTab = 'metadata'}
    >
      Metadata
    </button>
  </div>

  <!-- Tab Content -->
  <div class="tab-content">
    {#if activeTab === 'sections'}
      <div class="sections-tab">
        <div class="sections-sidebar">
          <div class="sections-header">
            <h3>Sections</h3>
            {#if !readOnly}
              <button
                onclick={addSection}
                class="btn btn-ghost btn-xs"
                data-testid="add-section"
              >
                + Add
              </button>
            {/if}
          </div>
          <div class="sections-list">
            {#each editedIngredient.sections as section (section.id)}
              <div
                class="section-item"
                class:selected={section.id === selectedSectionId}
                onclick={() => selectedSectionId = section.id}
              >
                <div class="section-info">
                  <span class="section-type badge badge-sm">
                    {section.type}
                  </span>
                  <span class="section-name">
                    Section {section.order + 1}
                  </span>
                </div>
                {#if !readOnly}
                  <div class="section-actions">
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        toggleSectionType(section.id);
                      }}
                      class="btn btn-ghost btn-xs"
                      title="Toggle type"
                    >
                      ⚡
                    </button>
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        deleteSection(section.id);
                      }}
                      class="btn btn-ghost btn-xs text-error"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <div class="section-editor">
          {#if selectedSection}
            <div class="section-editor-header">
              <h4>Edit Section</h4>
              <span class="badge">{selectedSection.type}</span>
            </div>
            <CodeEditor
              value={selectedSection.content}
              language={selectedSection.type === 'javascript' ? 'javascript' : 'html'}
              onChange={(newContent) => updateSectionContent(selectedSection.id, newContent)}
              readOnly={readOnly}
            />
          {:else}
            <div class="empty-state">
              <p>No section selected</p>
              {#if !readOnly && editedIngredient.sections.length === 0}
                <button onclick={addSection} class="btn btn-primary btn-sm">
                  Add First Section
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>

    {:else if activeTab === 'tests'}
      <div class="tests-tab">
        <div class="tests-header">
          <h3>Test Cases</h3>
          {#if !readOnly}
            <button
              onclick={addTest}
              class="btn btn-primary btn-sm"
              data-testid="add-test"
            >
              Add Test
            </button>
          {/if}
        </div>
        <div class="tests-list">
          {#each editedIngredient.tests as test (test.id)}
            <div class="test-item">
              <div class="test-header">
                <input
                  type="text"
                  bind:value={test.name}
                  disabled={readOnly}
                  class="input input-bordered input-sm"
                  placeholder="Test name"
                />
                {#if !readOnly}
                  <button
                    onclick={() => deleteTest(test.id)}
                    class="btn btn-ghost btn-xs text-error"
                  >
                    Delete
                  </button>
                {/if}
              </div>
              <div class="test-variables">
                <label>Variables (JSON):</label>
                <textarea
                  value={JSON.stringify(test.variables, null, 2)}
                  oninput={(e) => {
                    try {
                      const vars = JSON.parse(e.currentTarget.value);
                      updateTest(test.id, { variables: vars });
                    } catch {}
                  }}
                  disabled={readOnly}
                  class="textarea textarea-bordered w-full"
                  rows="3"
                />
              </div>
              {#if test.expected !== undefined}
                <div class="test-expected">
                  <label>Expected:</label>
                  <input
                    type="text"
                    bind:value={test.expected}
                    disabled={readOnly}
                    class="input input-bordered input-sm w-full"
                  />
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

    {:else if activeTab === 'variants'}
      <div class="variants-tab">
        <h3>Population Variants</h3>
        <p class="text-sm opacity-70">
          Population-specific overrides for this ingredient.
        </p>
        {#if editedIngredient.variants && editedIngredient.variants.size > 0}
          <div class="variants-list">
            {#each Array.from(editedIngredient.variants.entries()) as [population, variant]}
              <div class="variant-item">
                <h4>{population}</h4>
                <pre>{JSON.stringify(variant, null, 2)}</pre>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty-state">No population variants defined.</p>
        {/if}
      </div>

    {:else if activeTab === 'metadata'}
      <div class="metadata-tab">
        <h3>Metadata</h3>
        <div class="form-control">
          <label class="label">Display Name</label>
          <input
            type="text"
            bind:value={editedIngredient.displayName}
            disabled={readOnly}
            class="input input-bordered"
          />
        </div>
        <div class="form-control">
          <label class="label">Category</label>
          <input
            type="text"
            bind:value={editedIngredient.category}
            disabled={readOnly}
            class="input input-bordered"
          />
        </div>
        {#if editedIngredient.metadata}
          <div class="form-control">
            <label class="label">Version</label>
            <input
              type="number"
              value={editedIngredient.metadata.version}
              disabled
              class="input input-bordered"
            />
          </div>
          <div class="form-control">
            <label class="label">Created</label>
            <input
              type="text"
              value={new Date(editedIngredient.metadata.createdAt).toLocaleString()}
              disabled
              class="input input-bordered"
            />
          </div>
          <div class="form-control">
            <label class="label">Updated</label>
            <input
              type="text"
              value={new Date(editedIngredient.metadata.updatedAt).toLocaleString()}
              disabled
              class="input input-bordered"
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
{:else}
  <div class="empty-state">
    <p>Select an ingredient to edit</p>
  </div>
{/if}

<style>
  .ingredient-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 1rem;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--base-200);
    border-radius: 0.5rem;
  }

  .editor-title {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .editor-actions {
    display: flex;
    gap: 0.5rem;
  }

  .tabs {
    margin-bottom: 1rem;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    background: var(--base-100);
    border-radius: 0.5rem;
  }

  /* Sections Tab */
  .sections-tab {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 1rem;
    height: 100%;
  }

  .sections-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sections-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
  }

  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    overflow-y: auto;
  }

  .section-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: var(--base-200);
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .section-item:hover,
  .section-item.selected {
    background: var(--primary-focus);
  }

  .section-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-actions {
    display: flex;
    gap: 0.25rem;
  }

  .section-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
  }

  /* Tests Tab */
  .tests-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .tests-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tests-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .test-item {
    padding: 1rem;
    background: var(--base-200);
    border-radius: 0.5rem;
  }

  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .test-variables,
  .test-expected {
    margin-top: 0.5rem;
  }

  /* Variants Tab */
  .variants-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .variants-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .variant-item {
    padding: 1rem;
    background: var(--base-200);
    border-radius: 0.5rem;
  }

  /* Metadata Tab */
  .metadata-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 500px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: var(--base-content-secondary);
  }
</style>