<script>
  import { logError } from '$lib/logger';
  import { createEventDispatcher } from 'svelte';
  // Note: Skeleton v3 doesn't provide Svelte components, only CSS classes
  // We'll implement these components manually
  
  const dispatch = createEventDispatcher();
  
  let { 
    sections = [],
    currentIngredient = null,
    currentReferenceName = '',
    healthSystem = '',
    populationType = '',
    onClose = () => dispatch('close')
  } = $props();

  let exportFormat = $state('json');
  let includeTestCases = $state(true);
  let includeMetadata = $state(true);

  // This component is now controlled via props and events
  // The parent component should handle showing/hiding the modal

  function handleExport() {
    try {
      let exportData = {};
      
      if (exportFormat === 'json') {
        exportData = {
          metadata: includeMetadata ? {
            ingredient: currentIngredient?.name || '',
            reference: currentReferenceName,
            healthSystem,
            populationType,
            exportDate: new Date().toISOString()
          } : undefined,
          sections: sections.map(section => ({
            id: section.id,
            type: section.type,
            name: section.name,
            content: section.content,
            testCases: includeTestCases ? section.testCases : undefined
          }))
        };
        
        downloadJSON(exportData);
      } else if (exportFormat === 'html') {
        const html = exportAsHTML(sections);
        downloadFile(html, 'export.html', 'text/html');
      } else if (exportFormat === 'markdown') {
        const markdown = exportAsMarkdown(sections);
        downloadFile(markdown, 'export.md', 'text/markdown');
      }
      
      onClose();
    } catch (error) {
      logError('Export failed:', error instanceof Error ? error : new Error(String(error)));
      alert('Export failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  function downloadJSON(data) {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, 'export.json', 'application/json');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportAsHTML(sections) {
    const html = sections.map(section => {
      if (section.type === 'static') {
        return section.content;
      } else {
        return `<pre><code>${section.content}</code></pre>`;
      }
    }).join('\n\n');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dynamic Text Export</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { font-family: 'Consolas', 'Monaco', monospace; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  function exportAsMarkdown(sections) {
    return sections.map((section, index) => {
      const header = `## Section ${index + 1}: ${section.name || 'Unnamed'}`;
      const content = section.type === 'static' 
        ? section.content 
        : '```javascript\n' + section.content + '\n```';
      return `${header}\n\n${content}`;
    }).join('\n\n---\n\n');
  }
</script>

<div class="card p-6 w-full max-w-2xl">
  <header class="mb-6">
    <h2 class="h3 font-bold">Export Configuration</h2>
  </header>
  
  <div class="space-y-6">
    <!-- Export Format Selection -->
    <div>
      <label class="label">
        <span>Export Format</span>
      </label>
      <div class="space-y-2">
        <label class="flex items-center space-x-2">
          <input 
            type="radio" 
            bind:group={exportFormat} 
            name="format" 
            value="json"
            class="radio"
          />
          <span>JSON</span>
        </label>
        <label class="flex items-center space-x-2">
          <input 
            type="radio" 
            bind:group={exportFormat} 
            name="format" 
            value="html"
            class="radio"
          />
          <span>HTML</span>
        </label>
        <label class="flex items-center space-x-2">
          <input 
            type="radio" 
            bind:group={exportFormat} 
            name="format" 
            value="markdown"
            class="radio"
          />
          <span>Markdown</span>
        </label>
      </div>
    </div>
    
    <!-- JSON Options -->
    {#if exportFormat === 'json'}
      <div class="space-y-3">
        <label class="flex items-center space-x-2">
          <input 
            type="checkbox"
            bind:checked={includeTestCases}
            class="checkbox"
          />
          <span>Include test cases</span>
        </label>
        
        <label class="flex items-center space-x-2">
          <input 
            type="checkbox"
            bind:checked={includeMetadata}
            class="checkbox"
          />
          <span>Include metadata</span>
        </label>
      </div>
    {/if}
    
    <!-- Export Info -->
    {#if currentIngredient}
      <div class="card variant-soft-surface p-4">
        <h3 class="font-semibold mb-2">Export Details</h3>
        <dl class="list-dl">
          <div>
            <span class="badge variant-soft">Ingredient</span>
            <span>{currentIngredient.name}</span>
          </div>
          <div>
            <span class="badge variant-soft">Reference</span>
            <span>{currentReferenceName || 'None'}</span>
          </div>
          <div>
            <span class="badge variant-soft">Sections</span>
            <span>{sections.length}</span>
          </div>
          {#if healthSystem}
            <div>
              <span class="badge variant-soft">Health System</span>
              <span>{healthSystem}</span>
            </div>
          {/if}
          {#if populationType}
            <div>
              <span class="badge variant-soft">Population</span>
              <span>{populationType}</span>
            </div>
          {/if}
        </dl>
      </div>
    {/if}
  </div>
  
  <footer class="flex justify-end gap-3 mt-6">
    <button 
      class="btn variant-ghost"
      onclick={() => onClose()}
    >
      Cancel
    </button>
    <button 
      class="btn variant-filled-primary"
      onclick={handleExport}
    >
      Export
    </button>
  </footer>
</div>