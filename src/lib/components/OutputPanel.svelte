<script>
  import { sectionStore } from '../../stores/sectionStore.svelte.ts';
  import { uiStore } from '../../stores/uiStore.svelte.ts';
  import { sectionService } from '../services/sectionService.js';
  
  // Reactive state
  const sections = $derived(sectionStore.sections);
  const outputMode = $derived(uiStore.outputMode);
  
  // Generate output based on mode
  const jsonOutput = $derived.by(() => {
    return sectionService.sectionsToJSON(sections);
  });
  
  const lineObjects = $derived.by(() => {
    return sectionService.sectionsToLineObjects(sections);
  });
  
  const configuratorOutput = $derived.by(() => {
    return JSON.stringify(lineObjects, null, 2);
  });
  
  const currentOutput = $derived(outputMode === 'json' ? jsonOutput : configuratorOutput);
  
  function copyToClipboard() {
    navigator.clipboard.writeText(currentOutput).then(() => {
      uiStore.showCopiedFeedback();
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  }
  
  function downloadOutput() {
    const filename = outputMode === 'json' ? 'sections.json' : 'configurator.json';
    const blob = new Blob([currentOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<div class="output-panel">
  <div class="output-header">
    <div class="output-mode-selector">
      <button 
        class="mode-btn {outputMode === 'json' ? 'active' : ''}"
        onclick={() => uiStore.setOutputMode('json')}
      >
        JSON Format
      </button>
      <button 
        class="mode-btn {outputMode === 'configurator' ? 'active' : ''}"
        onclick={() => uiStore.setOutputMode('configurator')}
      >
        Configurator Format
      </button>
    </div>
    
    <div class="output-actions">
      <button class="action-btn" onclick={copyToClipboard} title="Copy to clipboard">
        📎 Copy
      </button>
      <button class="action-btn" onclick={downloadOutput} title="Download as file">
        💾 Download
      </button>
    </div>
  </div>
  
  <div class="output-content">
    <pre><code>{currentOutput}</code></pre>
  </div>
  
  <div class="output-footer">
    <div class="output-stats">
      <span class="stat">
        📄 {sections.length} section{sections.length !== 1 ? 's' : ''}
      </span>
      <span class="stat">
        📝 {Math.round(currentOutput.length / 1024 * 100) / 100} KB
      </span>
      <span class="stat">
        📃 {currentOutput.split('\n').length} lines
      </span>
    </div>
  </div>
</div>

<style>
  .output-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fafafa;
  }
  
  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
    background: white;
  }
  
  .output-mode-selector {
    display: flex;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .mode-btn {
    padding: 0.5rem 1rem;
    background: white;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
    color: #6c757d;
  }
  
  .mode-btn:first-child {
    border-right: 1px solid #dee2e6;
  }
  
  .mode-btn:hover {
    background: #f8f9fa;
  }
  
  .mode-btn.active {
    background: #007bff;
    color: white;
  }
  
  .output-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .action-btn {
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
    color: #495057;
  }
  
  .action-btn:hover {
    background: #f8f9fa;
    border-color: #007bff;
    color: #007bff;
  }
  
  .output-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    background: #f8f9fa;
  }
  
  .output-content pre {
    margin: 0;
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 1rem;
    overflow: auto;
    font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    color: #495057;
    min-height: 100%;
  }
  
  .output-content code {
    font-family: inherit;
    color: inherit;
  }
  
  .output-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid #e0e0e0;
    background: white;
  }
  
  .output-stats {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
    color: #6c757d;
  }
  
  .stat {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
</style>