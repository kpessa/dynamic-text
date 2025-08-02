<script>
  import { onMount } from 'svelte';
  import { referenceService, POPULATION_TYPES } from './firebaseDataService.js';
  import DOMPurify from 'dompurify';
  import * as Babel from '@babel/standalone';
  
  let {
    ingredient = null,
    healthSystem = null,
    onClose = () => {}
  } = $props();
  
  let references = $state({});
  let loading = $state(true);
  let error = $state(null);
  let viewMode = $state('side-by-side'); // 'side-by-side' or 'unified'
  let showIdentical = $state(false);
  let selectedPopulations = $state(new Set(Object.values(POPULATION_TYPES)));
  let processedContent = $state({});
  let differences = $state({});
  
  // Population type display info
  const populationInfo = {
    [POPULATION_TYPES.NEONATAL]: {
      name: 'Neonatal',
      color: '#ff6b6b',
      bgColor: '#ffe0e0'
    },
    [POPULATION_TYPES.PEDIATRIC]: {
      name: 'Pediatric', 
      color: '#4ecdc4',
      bgColor: '#e0f7f5'
    },
    [POPULATION_TYPES.ADOLESCENT]: {
      name: 'Adolescent',
      color: '#45b7d1',
      bgColor: '#e0f2f7'
    },
    [POPULATION_TYPES.ADULT]: {
      name: 'Adult',
      color: '#5f27cd',
      bgColor: '#ede7f6'
    }
  };
  
  onMount(async () => {
    if (!ingredient) {
      error = 'No ingredient selected';
      loading = false;
      return;
    }
    
    try {
      const grouped = await referenceService.getReferencesForComparison(
        ingredient.id,
        healthSystem
      );
      references = grouped;
      processReferences();
      loading = false;
    } catch (err) {
      console.error('Error loading references:', err);
      error = err.message;
      loading = false;
    }
  });
  
  // Process references to generate content and identify differences
  function processReferences() {
    const processed = {};
    const diffs = {};
    
    Object.entries(references).forEach(([populationType, refs]) => {
      if (refs.length > 0) {
        const ref = refs[0]; // Use first reference for each population
        processed[populationType] = generateHTMLFromSections(ref.sections);
      }
    });
    
    // Find differences between populations
    const populations = Object.keys(processed);
    populations.forEach((pop1, i) => {
      populations.slice(i + 1).forEach(pop2 => {
        const key = `${pop1}-${pop2}`;
        diffs[key] = findDifferences(processed[pop1], processed[pop2]);
      });
    });
    
    processedContent = processed;
    differences = diffs;
  }
  
  // Generate HTML from sections (similar to App.svelte logic)
  function generateHTMLFromSections(sections) {
    if (!sections) return '';
    
    return sections.map(section => {
      if (section.type === 'static') {
        return sanitizeHTML(section.content.replace(/\n/g, '<br>'));
      } else if (section.type === 'dynamic') {
        // For diff view, show the code rather than executing it
        return `<div class="dynamic-section">
          <div class="dynamic-header">⚡ Dynamic JavaScript</div>
          <pre>${escapeHtml(section.content)}</pre>
        </div>`;
      }
      return '';
    }).join('<br>');
  }
  
  // Sanitize HTML
  function sanitizeHTML(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'em', 'u', 'i', 'b', 
                     'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'code', 'pre', 'blockquote', 'table', 
                     'thead', 'tbody', 'tr', 'th', 'td', 'style'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'id', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  }
  
  // Escape HTML for display
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Find differences between two HTML strings
  function findDifferences(html1, html2) {
    // Simple line-based diff for now
    const lines1 = html1.split('<br>');
    const lines2 = html2.split('<br>');
    
    const maxLines = Math.max(lines1.length, lines2.length);
    const lineDiffs = [];
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 !== line2) {
        lineDiffs.push({
          lineNumber: i + 1,
          content1: line1,
          content2: line2,
          type: !line1 ? 'added' : !line2 ? 'removed' : 'changed'
        });
      }
    }
    
    return {
      hasDifferences: lineDiffs.length > 0,
      differences: lineDiffs,
      similarity: ((maxLines - lineDiffs.length) / maxLines * 100).toFixed(1)
    };
  }
  
  // Toggle population selection
  function togglePopulation(populationType) {
    if (selectedPopulations.has(populationType)) {
      selectedPopulations.delete(populationType);
    } else {
      selectedPopulations.add(populationType);
    }
    selectedPopulations = new Set(selectedPopulations);
  }
  
  // Get selected populations in order
  let selectedPopulationsList = $derived(
    Object.values(POPULATION_TYPES).filter(pop => selectedPopulations.has(pop))
  );
  
  // Export diff report
  function exportDiffReport() {
    const report = {
      ingredient: ingredient.name,
      healthSystem: healthSystem || 'All',
      timestamp: new Date().toISOString(),
      populations: selectedPopulationsList,
      differences: differences,
      content: processedContent
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ingredient.name}_diff_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="diff-viewer-overlay" onclick={onClose}>
  <div class="diff-viewer" onclick={(e) => e.stopPropagation()}>
    <div class="viewer-header">
      <h2>📊 Reference Comparison: {ingredient?.name || 'Unknown'}</h2>
      <button class="close-btn" onclick={onClose}>×</button>
    </div>
    
    {#if error}
      <div class="error-message">
        <span class="error-icon">⚠️</span>
        {error}
      </div>
    {:else if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading references...</p>
      </div>
    {:else}
      <div class="viewer-controls">
        <div class="population-selector">
          <span>Compare:</span>
          {#each Object.entries(populationInfo) as [type, info]}
            <label 
              class="population-checkbox"
              style="--pop-color: {info.color}; --pop-bg: {info.bgColor}"
            >
              <input
                type="checkbox"
                checked={selectedPopulations.has(type)}
                onchange={() => togglePopulation(type)}
                disabled={!references[type]}
              />
              <span>{info.name}</span>
              {#if references[type]}
                <span class="ref-count">({references[type].length})</span>
              {/if}
            </label>
          {/each}
        </div>
        
        <div class="view-controls">
          <label class="show-identical">
            <input
              type="checkbox"
              bind:checked={showIdentical}
            />
            Show identical sections
          </label>
          
          <select bind:value={viewMode} class="view-mode-select">
            <option value="side-by-side">Side by Side</option>
            <option value="unified">Unified View</option>
          </select>
          
          <button class="export-btn" onclick={exportDiffReport}>
            📥 Export Report
          </button>
        </div>
      </div>
      
      <div class="diff-content {viewMode}">
        {#if viewMode === 'side-by-side'}
          <div class="side-by-side-view">
            {#each selectedPopulationsList as populationType}
              {#if references[populationType]}
                <div 
                  class="population-column"
                  style="--pop-color: {populationInfo[populationType].color}; --pop-bg: {populationInfo[populationType].bgColor}"
                >
                  <div class="column-header">
                    <h3>{populationInfo[populationType].name}</h3>
                    {#if references[populationType][0]?.version}
                      <span class="version">v{references[populationType][0].version}</span>
                    {/if}
                  </div>
                  
                  <div class="column-content">
                    {@html processedContent[populationType] || '<p class="no-content">No content available</p>'}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {:else}
          <div class="unified-view">
            {#each Object.entries(differences) as [key, diff]}
              {@const [pop1, pop2] = key.split('-')}
              {#if selectedPopulations.has(pop1) && selectedPopulations.has(pop2)}
                <div class="diff-section">
                  <div class="diff-header">
                    <span 
                      class="pop-label"
                      style="background-color: {populationInfo[pop1].color}"
                    >
                      {populationInfo[pop1].name}
                    </span>
                    <span class="vs">vs</span>
                    <span 
                      class="pop-label"
                      style="background-color: {populationInfo[pop2].color}"
                    >
                      {populationInfo[pop2].name}
                    </span>
                    <span class="similarity">
                      {diff.similarity}% similar
                    </span>
                  </div>
                  
                  {#if diff.hasDifferences}
                    <div class="diff-lines">
                      {#each diff.differences as lineDiff}
                        <div class="diff-line {lineDiff.type}">
                          <span class="line-number">Line {lineDiff.lineNumber}:</span>
                          {#if lineDiff.type === 'changed'}
                            <div class="line-content">
                              <div class="removed">- {@html lineDiff.content1}</div>
                              <div class="added">+ {@html lineDiff.content2}</div>
                            </div>
                          {:else if lineDiff.type === 'removed'}
                            <div class="line-content removed">- {@html lineDiff.content1}</div>
                          {:else}
                            <div class="line-content added">+ {@html lineDiff.content2}</div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <div class="identical-notice">
                      ✅ These populations have identical content
                    </div>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .diff-viewer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .diff-viewer {
    background-color: #fff;
    border-radius: 12px;
    width: 90%;
    max-width: 1400px;
    height: 90%;
    max-height: 800px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }
  
  .viewer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #dee2e6;
    background-color: #f8f9fa;
  }
  
  .viewer-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }
  
  .close-btn {
    font-size: 2rem;
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background-color: #e9ecef;
    color: #333;
  }
  
  .error-message {
    padding: 2rem;
    text-align: center;
    color: #dc3545;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #646cff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .viewer-controls {
    padding: 1rem 1.5rem;
    background-color: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .population-selector {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .population-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border: 2px solid var(--pop-color);
    background-color: var(--pop-bg);
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .population-checkbox:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .population-checkbox input {
    cursor: pointer;
  }
  
  .ref-count {
    font-size: 0.85rem;
    color: #666;
  }
  
  .view-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .show-identical {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  
  .view-mode-select {
    padding: 0.5rem 1rem;
    border: 1px solid #ced4da;
    border-radius: 6px;
    background-color: #fff;
    font-size: 0.9rem;
  }
  
  .export-btn {
    padding: 0.5rem 1rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }
  
  .export-btn:hover {
    background-color: #0056b3;
  }
  
  .diff-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;
  }
  
  /* Side by side view */
  .side-by-side-view {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    height: 100%;
  }
  
  .population-column {
    border: 2px solid var(--pop-color);
    background-color: #fff;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .column-header {
    background-color: var(--pop-bg);
    padding: 1rem;
    border-bottom: 1px solid var(--pop-color);
  }
  
  .column-header h3 {
    margin: 0;
    color: var(--pop-color);
  }
  
  .version {
    font-size: 0.85rem;
    color: #666;
  }
  
  .column-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    color: #333;
  }
  
  .no-content {
    color: #999;
    font-style: italic;
    text-align: center;
  }
  
  .dynamic-section {
    margin: 0.5rem 0;
    border: 1px solid #ffc107;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .dynamic-header {
    background-color: #fff3cd;
    color: #856404;
    padding: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .dynamic-section pre {
    margin: 0;
    padding: 0.5rem;
    background-color: #f8f9fa;
    font-size: 0.85rem;
    overflow-x: auto;
  }
  
  /* Unified view */
  .unified-view {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .diff-section {
    border: 1px solid #dee2e6;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .diff-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
  }
  
  .pop-label {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    color: white;
    font-weight: 500;
    font-size: 0.85rem;
  }
  
  .vs {
    color: #666;
    font-weight: 500;
  }
  
  .similarity {
    margin-left: auto;
    font-size: 0.9rem;
    color: #28a745;
    font-weight: 500;
  }
  
  .diff-lines {
    padding: 1rem;
  }
  
  .diff-line {
    margin-bottom: 1rem;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
  }
  
  .line-number {
    color: #666;
    font-weight: 500;
    margin-right: 1rem;
  }
  
  .line-content {
    margin-top: 0.5rem;
  }
  
  .removed {
    background-color: #ffecec;
    color: #c82333;
    padding: 0.25rem 0.5rem;
    border-left: 3px solid #dc3545;
  }
  
  .added {
    background-color: #e8f5e9;
    color: #155724;
    padding: 0.25rem 0.5rem;
    border-left: 3px solid #28a745;
  }
  
  .identical-notice {
    padding: 2rem;
    text-align: center;
    color: #28a745;
    font-size: 1.1rem;
  }
  
  /* Force light theme for diff content */
  .column-content :global(*),
  .diff-lines :global(*) {
    color: #333;
  }
  
  .column-content :global(a),
  .diff-lines :global(a) {
    color: #0066cc;
  }
</style>