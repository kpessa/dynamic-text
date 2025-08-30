<script>
  import { createEventDispatcher } from 'svelte';
  import ExportModal from '../ExportModal.svelte';

  const dispatch = createEventDispatcher();

  // Props using $props() rune
  let {
    sections = [],
    currentIngredient = '',
    currentReferenceName = '',
    healthSystem = null,
    populationType = '',
    showOutput = false,
    previewMode = 'preview'
  } = $props();

  let showExportModal = $state(false);
  let outputMode = $state('json'); // 'json' or 'configurator'

  // Convert sections to JSON format
  const jsonOutput = $derived(sectionsToJSON());
  const lineObjects = $derived(sectionsToLineObjects());

  function sectionsToJSON() {
    const result = [];
    sections.forEach(section => {
      if (section.type === 'static') {
        const lines = section.content.split('\n');
        lines.forEach(line => result.push({ TEXT: line }));
      } else if (section.type === 'dynamic') {
        result.push({ TEXT: '[f(' });
        const lines = section.content.split('\n');
        lines.forEach(line => result.push({ TEXT: line }));
        result.push({ TEXT: ')]' });
      }
    });
    return result;
  }

  function sectionsToLineObjects() {
    const objects = [];
    let lineId = 1;
    sections.forEach(section => {
      if (section.type === 'static') {
        const lines = section.content.split('\n');
        lines.forEach(line => {
          objects.push({
            id: `line-${lineId++}`,
            text: line,
            editable: true,
            deletable: true,
            sectionId: section.id,
            sectionType: 'static'
          });
        });
      } else if (section.type === 'dynamic') {
        objects.push({ id: `line-${lineId++}`, text: '[f(', editable: false, deletable: false, sectionId: section.id, sectionType: 'dynamic' });
        const lines = section.content.split('\n');
        lines.forEach(line => {
          objects.push({
            id: `line-${lineId++}`,
            text: line,
            editable: true,
            deletable: true,
            sectionId: section.id,
            sectionType: 'dynamic'
          });
        });
        objects.push({ id: `line-${lineId++}`, text: ')]', editable: false, deletable: false, sectionId: section.id, sectionType: 'dynamic' });
      }
    });
    return objects;
  }

  function openExportModal() {
    showExportModal = true;
  }

  export { openExportModal };

</script>

{#if showOutput && previewMode === 'output'}
  <div class="output-view">
    <div class="output-format-selector">
      <button 
        class="format-btn {outputMode === 'json' ? 'active' : ''}"
        onclick={() => outputMode = 'json'}
      >
        JSON
      </button>
      <button 
        class="format-btn {outputMode === 'configurator' ? 'active' : ''}"
        onclick={() => outputMode = 'configurator'}
      >
        Configurator
      </button>
    </div>
    {#if outputMode === 'json'}
      <div class="json-output">
        <pre>{JSON.stringify(jsonOutput, null, 2)}</pre>
      </div>
    {:else}
      <div class="configurator">
        {#each lineObjects as item (item.id)}
          <div class="config-line {!item.editable ? 'non-editable' : ''}">
            <input 
              type="text" 
              value={item.text}
              readonly={true}
              class="line-input"
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<ExportModal
  bind:isOpen={showExportModal}
  {sections}
  {currentIngredient}
  {currentReferenceName}
  {healthSystem}
  {populationType}
  onClose={() => showExportModal = false}
/>

<svelte:options accessors={true} />

<style>
  .output-view {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    background-color: #f8f9fa;
  }

  .output-format-selector {
    display: flex;
    gap: 0.25rem;
    background-color: #fff;
    padding: 0.25rem;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  
  .format-btn {
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
    background-color: transparent;
    color: #495057;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .format-btn:hover {
    background-color: #f8f9fa;
    color: #333;
  }
  
  .format-btn.active {
    background-color: #646cff;
    color: white;
  }

  .json-output {
    flex: 1;
    background-color: #fff;
    border-radius: 6px;
    padding: 1rem;
    border: 1px solid #dee2e6;
    overflow: auto;
  }
  
  .json-output pre {
    margin: 0;
    color: #212529;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .configurator {
    flex: 1;
    padding: 1rem;
    background-color: #fff;
    border-radius: 6px;
    overflow: auto;
    border: 1px solid #dee2e6;
  }

  .config-line {
    margin-bottom: 0.5rem;
  }

  .line-input {
    width: 100%;
    padding: 0.5rem;
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    color: #212529;
  }

  .config-line.non-editable .line-input {
    background-color: #e9ecef;
    opacity: 0.7;
  }
</style>
