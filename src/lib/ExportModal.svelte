<script>
  import { logError } from '$lib/logger';
  
  let { 
    isOpen = $bindable(false),
    sections = [],
    currentIngredient = null,
    currentReferenceName = '',
    healthSystem = '',
    populationType = '',
    onClose = () => {}
  } = $props();

  let exportFormat = $state('json');
  let includeTestCases = $state(true);
  let includeMetadata = $state(true);

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

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={onClose} onkeydown={handleKeydown}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Export Configuration</h2>
        <button class="modal-close" onclick={onClose}>×</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label for="export-format">Export Format</label>
          <select id="export-format" bind:value={exportFormat}>
            <option value="json">JSON</option>
            <option value="html">HTML</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>
        
        {#if exportFormat === 'json'}
          <div class="form-group">
            <label>
              <input type="checkbox" bind:checked={includeTestCases}>
              Include test cases
            </label>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" bind:checked={includeMetadata}>
              Include metadata
            </label>
          </div>
        {/if}
        
        {#if currentIngredient}
          <div class="export-info">
            <p><strong>Ingredient:</strong> {currentIngredient.name}</p>
            <p><strong>Reference:</strong> {currentReferenceName || 'None'}</p>
            <p><strong>Sections:</strong> {sections.length}</p>
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={onClose}>Cancel</button>
        <button class="btn btn-primary" onclick={handleExport}>Export</button>
      </div>
    </div>
  </div>
{/if}

<style>
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
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .modal-close:hover {
    background: #f3f4f6;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  .form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 1rem;
  }

  .form-group input[type="checkbox"] {
    margin-right: 0.5rem;
  }

  .export-info {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 1rem;
  }

  .export-info p {
    margin: 0.5rem 0;
    color: #4b5563;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #d1d5db;
  }
</style>