<script>
  import { sanitizeHTML } from '../services/codeExecutionService';
  import { copyJSONToClipboard } from '../services/clipboardService';
  import { sectionsToJSON, sectionsToLineObjects } from '../services/exportService';
  
  let {
    sections = [],
    previewHTML = '',
    viewMode = 'preview',
    outputFormat = 'json',
    isCollapsed = false,
    copied = false,
    onViewModeChange = () => {},
    onOutputFormatChange = () => {},
    onToggleCollapse = () => {}
  } = $props();
  
  // Computed values
  let jsonOutput = $derived(sectionsToJSON(sections));
  let lineObjects = $derived(sectionsToLineObjects(sections));
  
  async function handleCopyToClipboard() {
    const success = await copyJSONToClipboard(jsonOutput);
    if (success) {
      copied = true;
      setTimeout(() => copied = false, 2000);
    }
  }
  
  function handleLineChange(lineId, newText) {
    // This would need to be handled by parent component
    // as it needs to update the sections
    console.log('Line change:', lineId, newText);
  }
</script>

<div class="preview-panel" class:collapsed={isCollapsed}>
  <div class="panel-header preview-header">
    <div class="preview-header-content">
      <h3>
        {#if viewMode === 'preview'}
          Preview
        {:else}
          Output
        {/if}
      </h3>
      
      {#if viewMode === 'preview'}
        <div class="view-tabs">
          <button 
            class="view-tab" 
            class:active={viewMode === 'preview'}
            onclick={() => onViewModeChange('preview')}
          >
            Preview
          </button>
          <button 
            class="view-tab" 
            class:active={viewMode === 'output'}
            onclick={() => onViewModeChange('output')}
          >
            Output
          </button>
        </div>
      {:else}
        <div class="output-format-selector">
          <button 
            class="format-btn" 
            class:active={outputFormat === 'json'}
            onclick={() => onOutputFormatChange('json')}
          >
            JSON
          </button>
          <button 
            class="format-btn" 
            class:active={outputFormat === 'configurator'}
            onclick={() => onOutputFormatChange('configurator')}
          >
            Configurator
          </button>
        </div>
      {/if}
    </div>
    
    <button 
      class="preview-toggle" 
      onclick={onToggleCollapse}
      title={isCollapsed ? "Expand preview" : "Collapse preview"}
    >
      {isCollapsed ? '◀' : '▶'}
    </button>
  </div>
  
  {#if !isCollapsed}
    {#if viewMode === 'preview'}
      <div class="preview">
        {@html previewHTML}
      </div>
    {:else}
      <div class="output-view">
        {#if outputFormat === 'json'}
          <div class="json-output">
            <div class="output-header">
              <h4>JSON Output</h4>
              <button 
                class="export-button" 
                class:copied={copied}
                onclick={handleCopyToClipboard}
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <pre>{JSON.stringify(jsonOutput, null, 2)}</pre>
          </div>
        {:else}
          <div class="configurator">
            <div class="output-header">
              <h4>Configurator View</h4>
            </div>
            {#each lineObjects as line}
              <div class="config-line" class:non-editable={!line.editable}>
                {#if line.editable}
                  <input 
                    type="text" 
                    class="line-input"
                    value={line.originalContent}
                    onchange={(e) => handleLineChange(line.id, e.target.value)}
                    placeholder="Enter dynamic code..."
                  />
                {:else}
                  <input 
                    type="text" 
                    class="line-input"
                    value={line.text}
                    readonly
                    disabled
                  />
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .preview-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    transition: all 0.3s ease;
  }
  
  .preview-panel.collapsed {
    width: 48px;
  }
  
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background-color: #2a2a2a;
    border-bottom: 1px solid #444;
  }
  
  .preview-header-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }
  
  .preview-header-content h3 {
    margin: 0;
    font-size: 1rem;
    color: #ccc;
  }
  
  .view-tabs {
    display: flex;
    gap: 0.25rem;
    background-color: rgba(255, 255, 255, 0.1);
    padding: 0.25rem;
    border-radius: 6px;
  }
  
  .view-tab {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    background-color: transparent;
    color: #aaa;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .view-tab:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  
  .view-tab.active {
    background-color: #646cff;
    color: white;
  }
  
  .output-format-selector {
    display: flex;
    gap: 0.25rem;
    background-color: rgba(255, 255, 255, 0.05);
    padding: 0.25rem;
    border: 1px solid #444;
    border-radius: 6px;
  }
  
  .format-btn {
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
    background-color: transparent;
    color: #aaa;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .format-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  
  .format-btn.active {
    background-color: #646cff;
    color: white;
  }
  
  .preview-toggle {
    padding: 0.25rem 0.5rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .preview-toggle:hover {
    background-color: #5a6268;
  }
  
  .preview {
    flex: 1;
    padding: 1rem;
    background-color: #fff;
    border: 1px solid #444;
    border-radius: 4px;
    overflow: auto;
    margin: 1rem;
    color: #333;
  }
  
  .output-view {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    background-color: #1e1e1e;
  }
  
  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .output-header h4 {
    margin: 0;
    color: #ccc;
  }
  
  .json-output {
    flex: 1;
    background-color: #2a2a2a;
    border-radius: 6px;
    padding: 1rem;
    border: 1px solid #444;
    overflow: auto;
  }
  
  .json-output pre {
    margin: 0;
    color: #ccc;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .configurator {
    flex: 1;
    padding: 1rem;
    background-color: #2a2a2a;
    border-radius: 6px;
    overflow: auto;
    border: 1px solid #444;
  }
  
  .config-line {
    margin-bottom: 0.5rem;
  }
  
  .line-input {
    width: 100%;
    padding: 0.5rem;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    background-color: #1e1e1e;
    border: 1px solid #444;
    border-radius: 4px;
    color: #ccc;
  }
  
  .config-line.non-editable .line-input {
    background-color: #333;
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .export-button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    border: none;
    border-radius: 6px;
    background-color: #646cff;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .export-button:hover {
    background-color: #535bf2;
  }
  
  .export-button.copied {
    background-color: #4caf50;
  }
  
  /* Hide content when collapsed */
  .collapsed .preview-header-content > *:not(h3),
  .collapsed .preview,
  .collapsed .output-view {
    display: none;
  }
  
  .collapsed .preview-header-content h3 {
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }
</style>