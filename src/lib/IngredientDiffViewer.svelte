<script>
  import { onMount } from 'svelte';
  import { referenceService, POPULATION_TYPES } from './firebaseDataService.js';
  import { createSharedIngredient } from './sharedIngredientService.js';
  import DOMPurify from 'dompurify';
  import * as Babel from '@babel/standalone';
  import { LegacyElementWrapper } from './tpnLegacy.js';
  import DiffDisplay from './DiffDisplay.svelte';
  
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
  let selectedPopulations = $state(new Set()); // Start with empty set
  let processedContent = $state({});
  let differences = $state({});
  let selectedVersionIndex = $state({}); // Track which version is selected for each population type
  let linkingInProgress = $state(false);
  let linkingMessage = $state('');
  let comparisonMode = $state('populations'); // 'populations' or 'versions'
  let showRenderedHTML = $state(true); // true = show rendered HTML, false = show code
  let useDiff2Html = $state(true); // Use diff2html for enhanced diff viewing
  let diffStyle = $state('word'); // 'word' or 'char' for granularity
  let selectedVersion1Index = $state(0); // First version to compare in version mode
  let selectedVersion2Index = $state(1); // Second version to compare in version mode
  let controlsCollapsed = $state(false); // Collapse controls to save space
  let showAdvancedOptions = $state(false); // Hide advanced options by default
  
  // Population type display info
  const populationInfo = {
    [POPULATION_TYPES.NEONATAL]: {
      name: 'Neonatal',
      color: '#ff6b6b',
      bgColor: '#ffe0e0'
    },
    [POPULATION_TYPES.PEDIATRIC]: {
      name: 'Child', 
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
      
      // Auto-select only population types that have references
      const availablePopulations = new Set();
      Object.entries(grouped).forEach(([populationType, refs]) => {
        if (refs && refs.length > 0) {
          availablePopulations.add(populationType);
        }
      });
      selectedPopulations = availablePopulations;
      
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
    
    if (comparisonMode === 'versions' && selectedPopulationsList.length === 1) {
      // Version comparison mode: compare selected versions
      const populationType = selectedPopulationsList[0];
      const refs = references[populationType] || [];
      
      // Only process the two selected versions for comparison
      if (refs.length > 0) {
        const idx1 = Math.min(selectedVersion1Index, refs.length - 1);
        const idx2 = Math.min(selectedVersion2Index, refs.length - 1);
        
        // Process first selected version
        const key1 = `${populationType}-${idx1}`;
        processed[key1] = {
          content: generateHTMLFromSections(refs[idx1].sections || refs[idx1].NOTE || refs[idx1].notes, showRenderedHTML),
          ref: refs[idx1],
          populationType: populationType,
          index: idx1
        };
        
        // Process second selected version
        const key2 = `${populationType}-${idx2}`;
        processed[key2] = {
          content: generateHTMLFromSections(refs[idx2].sections || refs[idx2].NOTE || refs[idx2].notes, showRenderedHTML),
          ref: refs[idx2],
          populationType: populationType,
          index: idx2
        };
        
        // Calculate differences between the two selected versions
        const diffKey = `${key1}-${key2}`;
        diffs[diffKey] = findDifferences(processed[key1].content, processed[key2].content);
      }
    } else {
      // Population comparison mode (original behavior)
      Object.entries(references).forEach(([populationType, refs]) => {
        if (refs.length > 0) {
          // Use the selected version index or default to 0
          const index = selectedVersionIndex[populationType] || 0;
          const ref = refs[Math.min(index, refs.length - 1)];
          
          processed[populationType] = {
            content: generateHTMLFromSections(ref.sections || ref.NOTE || ref.notes, showRenderedHTML),
            ref: ref,
            populationType: populationType
          };
        }
      });
      
      // Find differences between populations
      const populations = Object.keys(processed);
      populations.forEach((pop1, i) => {
        populations.slice(i + 1).forEach(pop2 => {
          const key = `${pop1}-${pop2}`;
          diffs[key] = findDifferences(processed[pop1].content, processed[pop2].content);
        });
      });
    }
    
    processedContent = processed;
    differences = diffs;
  }
  
  // Handle version selection change
  function handleVersionChange(populationType, index) {
    selectedVersionIndex[populationType] = index;
    selectedVersionIndex = { ...selectedVersionIndex };
    processReferences(); // Reprocess with new selection
  }
  
  // Find identical references across different versions
  function findIdenticalReferences() {
    const identical = [];
    
    Object.entries(references).forEach(([populationType, refs]) => {
      if (refs.length > 1) {
        // Compare each reference with others in the same population type
        for (let i = 0; i < refs.length - 1; i++) {
          for (let j = i + 1; j < refs.length; j++) {
            const content1 = generateHTMLFromSections(refs[i].sections, showRenderedHTML);
            const content2 = generateHTMLFromSections(refs[j].sections, showRenderedHTML);
            
            if (content1 === content2) {
              identical.push({
                populationType,
                ref1: refs[i],
                ref2: refs[j],
                index1: i,
                index2: j
              });
            }
          }
        }
      }
    });
    
    return identical;
  }
  
  let identicalReferences = $derived(findIdenticalReferences());
  
  // Reprocess when comparison mode or render mode changes
  $effect(() => {
    // Explicitly reference the reactive variables to ensure the effect runs
    comparisonMode;
    showRenderedHTML;
    
    if (references && Object.keys(references).length > 0) {
      // Reset version indices when switching to version mode or changing population
      if (comparisonMode === 'versions' && selectedPopulationsList.length === 1) {
        const refs = references[selectedPopulationsList[0]] || [];
        if (refs.length > 0) {
          // Ensure indices are valid for current population
          selectedVersion1Index = Math.min(selectedVersion1Index, refs.length - 1);
          selectedVersion2Index = Math.min(selectedVersion2Index, refs.length - 1);
          
          // If indices are the same, adjust them
          if (selectedVersion1Index === selectedVersion2Index && refs.length > 1) {
            selectedVersion2Index = Math.min(selectedVersion1Index + 1, refs.length - 1);
          }
        }
      }
      
      processReferences();
    }
  });
  
  // Create mock 'me' object for dynamic content evaluation
  function createMockMe(variables = {}) {
    // Enhanced mock object with basic TPN API
    const mockMe = {
      // Core value methods
      getValue: (key) => variables[key] !== undefined ? variables[key] : 0,
      
      // Number formatting
      maxP: (value, precision = 2) => {
        if (typeof value !== 'number') return String(value);
        let rv = value.toFixed(precision);
        if (rv.includes('.')) {
          rv = rv.replace(/\.?0+$/, '').replace(/\.$/, '');
        }
        return rv;
      },
      
      // Element wrapper for jQuery-like API
      getObject: (selector) => new LegacyElementWrapper(selector, variables),
      
      // Preferences with defaults
      pref: (key, defaultValue) => {
        const prefs = {
          'ADVISOR_TITLE': 'TPN Advisor',
        };
        return prefs[key] || defaultValue || '';
      },
      
      // Additional TPN methods
      age: () => variables.age || 1,
      ageInDays: () => (variables.age || 1) * 365,
      wt: () => variables.weight || 10,
      bsaM2: () => variables.bsa || 0.5,
      intakeVolume: () => variables.intakeVolume || 100,
      
      // String methods
      toUpperCase: (str) => String(str).toUpperCase(),
      toLowerCase: (str) => String(str).toLowerCase(),
      
      // Field visibility helpers
      isFieldVisible: () => true,
      isCalculated: () => false,
      isReadOnly: () => false,
      
      // Direct property access
      ...variables
    };
    
    return mockMe;
  }
  
  // Transpile ES6+ code to ES5
  function transpileCode(code) {
    try {
      // Wrap the code in a function to handle return statements
      const wrappedCode = `(function() { ${code} })`;
      
      const result = Babel.transform(wrappedCode, {
        presets: ['env'],
        plugins: []
      });
      
      // Extract the function body (remove the wrapper)
      const transpiledCode = result.code;
      const match = transpiledCode.match(/\(function\s*\(\)\s*{\s*([\s\S]*)\s*}\)/);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      
      return code; // Return original if extraction fails
    } catch (error) {
      console.error('Transpilation error:', error);
      return code; // Return original if transpilation fails
    }
  }
  
  // Evaluate dynamic code
  function evaluateCode(code, variables = {}) {
    try {
      const transpiledCode = transpileCode(code);
      
      // Always create the me object for consistent API
      const me = createMockMe(variables);
      
      // Create function with 'me' in scope
      const func = new Function('me', transpiledCode);
      const result = func(me);
      
      return result !== undefined ? String(result) : '';
    } catch (error) {
      return `<span style="color: red;">Error: ${error.message}</span>`;
    }
  }
  
  // Convert legacy NOTE format to sections
  function convertNotesToSections(notes) {
    if (!notes || !Array.isArray(notes)) {
      return [];
    }
    
    const sections = [];
    let currentStaticContent = '';
    let inDynamicBlock = false;
    let dynamicContent = '';
    let sectionId = 1;
    
    notes.forEach(note => {
      if (!note.TEXT) return;
      
      const text = note.TEXT;
      
      // Check if this is the start of a dynamic block
      if (text.includes('[f(')) {
        // Save any accumulated static content
        if (currentStaticContent.trim()) {
          sections.push({ 
            id: sectionId++,
            type: 'static', 
            content: currentStaticContent.trim() 
          });
          currentStaticContent = '';
        }
        
        inDynamicBlock = true;
        dynamicContent = '';
        // Remove the [f( marker
        const codeStart = text.indexOf('[f(') + 3;
        if (codeStart < text.length) {
          dynamicContent = text.substring(codeStart);
        }
      } else if (text.includes(')]') && inDynamicBlock) {
        // End of dynamic block
        const codeEnd = text.indexOf(')]');
        if (codeEnd > 0) {
          dynamicContent += '\n' + text.substring(0, codeEnd);
        }
        
        sections.push({ 
          id: sectionId++,
          type: 'dynamic', 
          content: dynamicContent.trim(),
          testCases: [{ name: 'Default', variables: {} }]
        });
        
        inDynamicBlock = false;
        dynamicContent = '';
        
        // Check if there's static content after )]
        if (codeEnd + 2 < text.length) {
          currentStaticContent = text.substring(codeEnd + 2);
        }
      } else if (inDynamicBlock) {
        // Inside dynamic block
        dynamicContent += (dynamicContent ? '\n' : '') + text;
      } else {
        // Static content
        currentStaticContent += (currentStaticContent ? '\n' : '') + text;
      }
    });
    
    // Save any remaining static content
    if (currentStaticContent.trim()) {
      sections.push({ 
        id: sectionId++,
        type: 'static', 
        content: currentStaticContent.trim() 
      });
    }
    
    return sections;
  }
  
  // Handle linking identical references as shared ingredients
  async function handleLinkIdenticalReferences() {
    if (identicalReferences.length === 0) return;
    
    // Confirm with user
    const confirmMessage = `This will link ${identicalReferences.length} set(s) of identical references as shared ingredients. This means changes to one will affect all linked versions. Continue?`;
    
    if (!confirm(confirmMessage)) return;
    
    linkingInProgress = true;
    linkingMessage = 'Linking identical references...';
    
    try {
      // Check if Firebase is configured and user is authenticated
      const { getCurrentUser } = await import('./firebase.js');
      const user = getCurrentUser();
      if (!user) {
        throw new Error('You must be signed in to link ingredients. Please refresh the page and try again.');
      }
      let successCount = 0;
      let errorCount = 0;
      
      for (const match of identicalReferences) {
        try {
          // Get all references for this population type
          const refs = references[match.populationType];
          
          // Find all identical references (not just pairs)
          const identicalRefs = refs.filter(ref => {
            const content = generateHTMLFromSections(ref.sections, showRenderedHTML);
            const matchContent = generateHTMLFromSections(refs[match.index1].sections, showRenderedHTML);
            return content === matchContent;
          });
          
          if (identicalRefs.length > 1) {
            console.log('Linking identical references:', {
              ingredientId: ingredient.id,
              refs: identicalRefs.map(ref => ({
                id: ref.id,
                healthSystem: ref.healthSystem,
                domain: ref.domain
              }))
            });
            
            // Link all identical references
            const result = await createSharedIngredient(
              ingredient.id,
              identicalRefs.map(ref => ({
                ingredientId: ingredient.id,
                configId: ref.id,  // Using the document ID from Firebase
                populationType: ref.populationType,
                healthSystem: ref.healthSystem,
                domain: ref.domain,
                subdomain: ref.subdomain,
                version: ref.version
              }))
            );
            
            if (result.success) {
              successCount++;
              console.log('Successfully linked references with shared ID:', result.sharedId);
            } else {
              errorCount++;
              console.error('Failed to link:', result.error);
            }
          }
        } catch (error) {
          console.error('Error linking references:', error);
          errorCount++;
        }
      }
      
      // Show results
      if (successCount > 0 && errorCount === 0) {
        linkingMessage = `✅ Successfully linked ${successCount} set(s) of identical references!`;
        // Refresh the data
        setTimeout(() => {
          loading = true;
          window.location.reload(); // Reload to show updated state
        }, 2000);
      } else if (successCount > 0) {
        linkingMessage = `⚠️ Linked ${successCount} set(s) successfully, but ${errorCount} failed.`;
      } else {
        linkingMessage = `❌ Failed to link references. Please try again.`;
      }
    } catch (error) {
      console.error('Error in linking process:', error);
      linkingMessage = '❌ An error occurred while linking. Please try again.';
    } finally {
      linkingInProgress = false;
      // Clear message after 5 seconds
      setTimeout(() => {
        linkingMessage = '';
      }, 5000);
    }
  }
  
  // Generate HTML from sections (similar to App.svelte logic)
  function generateHTMLFromSections(sections, evaluateDynamic = true) {
    if (!sections) {
      console.log('No sections provided');
      return '';
    }
    
    console.log('generateHTMLFromSections:', {
      sectionsLength: sections.length,
      evaluateDynamic,
      firstSection: sections[0]
    });
    
    // Handle legacy NOTE format if sections is actually a NOTE array
    if (sections.length > 0 && sections[0].TEXT !== undefined) {
      console.log('Converting NOTE format to sections');
      sections = convertNotesToSections(sections);
    }
    
    const results = sections.map((section, index) => {
      if (!section || !section.content) {
        console.log(`Section ${index} has no content`);
        return '';
      }
      
      console.log(`Processing section ${index}:`, {
        type: section.type,
        contentLength: section.content?.length,
        contentPreview: section.content?.substring(0, 50)
      });
      
      if (section.type === 'static') {
        const html = section.content.replace(/\n/g, '<br>');
        return sanitizeHTML(html);
      } else if (section.type === 'dynamic') {
        if (evaluateDynamic) {
          // Evaluate the dynamic code with default test variables
          const testVariables = section.testCases?.[0]?.variables || {};
          const evaluated = evaluateCode(section.content, testVariables);
          // Wrap in a span to ensure it's visible
          const html = `<span class="dynamic-content">${evaluated.toString().replace(/\n/g, '<br>')}</span>`;
          return sanitizeHTML(html);
        } else {
          // Show the code - don't sanitize as we need the structure
          const codeBlock = `<div class="dynamic-section">
            <div class="dynamic-header">⚡ Dynamic JavaScript</div>
            <pre>${escapeHtml(section.content)}</pre>
          </div>`;
          console.log(`Generated code block for section ${index}:`, codeBlock.substring(0, 100));
          return codeBlock;
        }
      }
      return '';
    });
    
    const finalHTML = results.filter(r => r).join('<br>');
    console.log('Final HTML length:', finalHTML.length);
    
    // Filter out empty results and join
    return finalHTML;
  }
  
  // Sanitize HTML
  function sanitizeHTML(html) {
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'em', 'u', 'i', 'b', 
                     'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'code', 'pre', 'blockquote', 'table', 
                     'thead', 'tbody', 'tr', 'th', 'td', 'style'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'id', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      KEEP_CONTENT: true,
      ADD_ATTR: ['class'] // Explicitly allow class attribute
    });
    
    // If sanitization removed everything, return a placeholder
    if (!clean && html) {
      return '<span class="sanitization-error">Content was sanitized</span>';
    }
    
    return clean;
  }
  
  // Escape HTML for display
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  
  // Find differences between two HTML strings (simplified for compatibility)
  function findDifferences(html1, html2) {
    const plainText1 = html1.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
    const plainText2 = html2.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
    
    const lines1 = plainText1.split('\n');
    const lines2 = plainText2.split('\n');
    
    const maxLines = Math.max(lines1.length, lines2.length);
    let diffCount = 0;
    
    for (let i = 0; i < maxLines; i++) {
      if (lines1[i] !== lines2[i]) {
        diffCount++;
      }
    }
    
    return {
      hasDifferences: diffCount > 0,
      diffHtml: null, // Will be generated when needed
      similarity: ((maxLines - diffCount) / maxLines * 100).toFixed(1)
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

<div 
  class="diff-viewer-overlay" 
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
  role="button"
  tabindex="-1"
  aria-label="Close comparison overlay"
>
  <div 
    class="diff-viewer" 
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-label="Reference Comparison"
    tabindex="-1"
  >
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
      {#if identicalReferences.length > 0}
        <div class="identical-notice compact">
          <div class="notice-header">
            <span class="notice-icon">🔗</span>
            <span class="notice-title">
              {identicalReferences.length} set(s) of identical content detected
            </span>
            <button 
              class="link-button compact" 
              onclick={handleLinkIdenticalReferences}
              disabled={linkingInProgress}
            >
              {#if linkingInProgress}
                ⏳ Linking...
              {:else}
                Link as Shared
              {/if}
            </button>
          </div>
          {#if linkingMessage}
            <div class="linking-message {linkingMessage.includes('✅') ? 'success' : linkingMessage.includes('❌') ? 'error' : 'warning'}">
              {linkingMessage}
            </div>
          {/if}
        </div>
      {/if}
      
      <div class="viewer-controls {controlsCollapsed ? 'collapsed' : ''}">
        <div class="controls-header">
          <div class="controls-title">
            <button 
              class="collapse-toggle"
              onclick={() => controlsCollapsed = !controlsCollapsed}
              aria-label="{controlsCollapsed ? 'Expand' : 'Collapse'} controls"
            >
              {controlsCollapsed ? '▶' : '▼'}
            </button>
            <span>Comparison Settings</span>
            {#if controlsCollapsed}
              <span class="collapsed-summary">
                - {comparisonMode === 'populations' ? 'Comparing populations' : 'Comparing versions'} 
                - {selectedPopulationsList.length} selected
              </span>
            {/if}
          </div>
          {#if !controlsCollapsed}
            <div class="quick-actions">
              <select bind:value={viewMode} class="view-mode-select compact">
                <option value="side-by-side">Side by Side</option>
                <option value="unified">Unified</option>
              </select>
              <button class="export-btn compact" onclick={exportDiffReport}>
                📥 Export
              </button>
            </div>
          {/if}
        </div>
        
        {#if !controlsCollapsed}
        <div class="controls-body">
          <div class="primary-controls">
            <div class="mode-selector compact">
              <label class="mode-radio compact">
                <input
                  type="radio"
                  bind:group={comparisonMode}
                  value="populations"
                />
                <span>Compare Across Populations</span>
              </label>
              <label class="mode-radio compact">
                <input
                  type="radio"
                  bind:group={comparisonMode}
                  value="versions"
                  disabled={selectedPopulationsList.length !== 1}
                />
                <span>Compare Configs Within Population</span>
              </label>
            </div>
        
            <div class="population-selector compact">
              {#each Object.entries(populationInfo) as [type, info]}
                <label 
                  class="population-chip"
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
                    <span class="ref-count">{references[type].length}</span>
                  {/if}
                </label>
              {/each}
            </div>
          </div>
        
          
          {#if comparisonMode === 'versions' && selectedPopulationsList.length === 1 && references[selectedPopulationsList[0]]?.length > 1}
            <div class="config-comparison-section">
              <div class="comparison-header">
                <span class="pop-badge" style="background-color: {populationInfo[selectedPopulationsList[0]].color}">
                  {populationInfo[selectedPopulationsList[0]].name} Population
                </span>
                <span class="comparison-label">Comparing different configurations:</span>
              </div>
              <div class="config-selectors">
                <div class="config-selector">
                  <label>Config 1:</label>
                  <select 
                    bind:value={selectedVersion1Index}
                    onchange={() => processReferences()}
                    class="config-select"
                  >
                    {#each references[selectedPopulationsList[0]] as ref, idx}
                      <option value={idx}>
                        {ref.healthSystem || 'Unknown'} / {ref.domain || 'none'} / {ref.subdomain || 'none'}
                        {ref.version > 1 ? ` (v${ref.version})` : ''}
                      </option>
                    {/each}
                  </select>
                </div>
                <span class="vs">vs</span>
                <div class="config-selector">
                  <label>Config 2:</label>
                  <select 
                    bind:value={selectedVersion2Index}
                    onchange={() => processReferences()}
                    class="config-select"
                  >
                    {#each references[selectedPopulationsList[0]] as ref, idx}
                      <option value={idx}>
                        {ref.healthSystem || 'Unknown'} / {ref.domain || 'none'} / {ref.subdomain || 'none'}
                        {ref.version > 1 ? ` (v${ref.version})` : ''}
                      </option>
                    {/each}
                  </select>
                </div>
              </div>
            </div>
          {:else if comparisonMode === 'populations' && selectedPopulationsList.length > 0}
            <div class="selected-configs">
              <div class="configs-header">Selected configurations for comparison:</div>
              <div class="configs-grid">
                {#each selectedPopulationsList as populationType}
                  {#if references[populationType]}
                    <div class="config-card" style="border-color: {populationInfo[populationType].color}">
                      <div class="config-population" style="background-color: {populationInfo[populationType].color}">
                        {populationInfo[populationType].name}
                      </div>
                      {#if references[populationType].length > 1}
                        <select 
                          value={selectedVersionIndex[populationType] || 0}
                          onchange={(e) => handleVersionChange(populationType, parseInt(e.target.value))}
                          class="config-select small"
                        >
                          {#each references[populationType] as ref, idx}
                            <option value={idx}>
                              {ref.healthSystem} / {ref.domain || 'none'} / {ref.subdomain || 'none'}
                              {ref.version > 1 ? ` (v${ref.version})` : ''}
                            </option>
                          {/each}
                        </select>
                        <div class="config-count">{references[populationType].length} configs available</div>
                      {:else}
                        <div class="config-path">
                          {references[populationType][0]?.healthSystem || 'Unknown'} / 
                          {references[populationType][0]?.domain || 'none'} / 
                          {references[populationType][0]?.subdomain || 'none'}
                          {references[populationType][0]?.version > 1 ? ` (v${references[populationType][0].version})` : ''}
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        
          
          <button 
            class="advanced-toggle"
            onclick={() => showAdvancedOptions = !showAdvancedOptions}
          >
            {showAdvancedOptions ? '−' : '+'} Advanced
          </button>
          
          {#if showAdvancedOptions}
            <div class="advanced-options">
              <label>
                <input type="checkbox" bind:checked={showRenderedHTML} />
                Render dynamic
              </label>
              <label>
                <input type="checkbox" bind:checked={useDiff2Html} />
                Enhanced diff
              </label>
              {#if useDiff2Html}
                <select bind:value={diffStyle} class="mini-select">
                  <option value="word">Word</option>
                  <option value="char">Char</option>
                </select>
              {/if}
            </div>
          {/if}
        </div>
        {/if}
      </div>
      
      <div class="diff-content {viewMode}">
        {#if viewMode === 'side-by-side'}
          <!-- Use diff2html for side-by-side when comparing exactly 2 items -->
          {#if useDiff2Html && selectedPopulationsList.length === 2 && comparisonMode === 'populations'}
            {@const pop1 = selectedPopulationsList[0]}
            {@const pop2 = selectedPopulationsList[1]}
            {#if processedContent[pop1] && processedContent[pop2]}
              <DiffDisplay
                content1={processedContent[pop1].content}
                content2={processedContent[pop2].content}
                label1={populationInfo[pop1].name}
                label2={populationInfo[pop2].name}
                outputFormat="side-by-side"
                {diffStyle}
                minHeight="400px"
                maxHeight="600px"
              />
            {/if}
          {:else if comparisonMode === 'versions' && selectedPopulationsList.length === 1}
            <!-- Version comparison mode: always use DiffDisplay for selected versions -->
            {@const keys = Object.keys(processedContent)}
            {#if keys.length === 2 && useDiff2Html}
              <DiffDisplay
                content1={processedContent[keys[0]].content}
                content2={processedContent[keys[1]].content}
                label1={`${processedContent[keys[0]]?.ref.healthSystem || 'Unknown'} - ${processedContent[keys[0]]?.ref.domain || ''}`}
                label2={`${processedContent[keys[1]]?.ref.healthSystem || 'Unknown'} - ${processedContent[keys[1]]?.ref.domain || ''}`}
                outputFormat="side-by-side"
                {diffStyle}
                minHeight="400px"
                maxHeight="600px"
              />
            {:else if !useDiff2Html}
              <!-- Fallback to column view if diff2html is disabled -->
              <div class="side-by-side-view">
                {#each Object.entries(processedContent) as [key, data]}
                  <div 
                    class="population-column"
                    style="--pop-color: {populationInfo[data.populationType].color}; --pop-bg: {populationInfo[data.populationType].bgColor}"
                  >
                    <div class="column-header">
                      <h3>{populationInfo[data.populationType].name} - Version {data.index + 1}</h3>
                      <div class="reference-details">
                        <span class="ref-health-system">{data.ref.healthSystem || 'Unknown'}</span>
                        {#if data.ref.domain}
                          <span class="ref-separator">•</span>
                          <span class="ref-domain">{data.ref.domain}</span>
                        {/if}
                        {#if data.ref.subdomain}
                          <span class="ref-separator">•</span>
                          <span class="ref-subdomain">{data.ref.subdomain}</span>
                        {/if}
                        {#if data.ref.version}
                          <span class="ref-separator">•</span>
                          <span class="version">v{data.ref.version}</span>
                        {/if}
                      </div>
                    </div>
                    
                    <div class="column-content">
                      {#if data.content}
                        {#key showRenderedHTML}
                          {@html data.content}
                        {/key}
                      {:else}
                        <p class="no-content">No content available</p>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          {:else}
            <div class="side-by-side-view">
              {#if false}
                <!-- Remove the old version comparison block -->
              {:else}
                <!-- Population comparison mode (original behavior) -->
                {#each selectedPopulationsList as populationType}
                  {#if references[populationType] && processedContent[populationType]}
                    <div 
                      class="population-column"
                      style="--pop-color: {populationInfo[populationType].color}; --pop-bg: {populationInfo[populationType].bgColor}"
                    >
                      <div class="column-header">
                        <h3>{populationInfo[populationType].name}</h3>
                        {#if processedContent[populationType].ref}
                          <div class="reference-details">
                            {#if references[populationType].length > 1}
                              <div class="config-selector-info">
                                Config {(selectedVersionIndex[populationType] || 0) + 1} of {references[populationType].length}
                              </div>
                            {/if}
                            <div class="config-path-display">
                              <span class="path-segment health-system">{processedContent[populationType].ref.healthSystem || 'Unknown'}</span>
                              <span class="path-separator">/</span>
                              <span class="path-segment domain">{processedContent[populationType].ref.domain || 'root'}</span>
                              <span class="path-separator">/</span>
                              <span class="path-segment subdomain">{processedContent[populationType].ref.subdomain || 'default'}</span>
                              {#if processedContent[populationType].ref.version > 1}
                                <span class="version-badge inline">v{processedContent[populationType].ref.version}</span>
                              {/if}
                            </div>
                          </div>
                        {/if}
                      </div>
                      
                      <div class="column-content">
                        {#if processedContent[populationType].content}
                          {#key showRenderedHTML}
                            {@html processedContent[populationType].content}
                          {/key}
                        {:else}
                          <p class="no-content">No content available</p>
                        {/if}
                      </div>
                    </div>
                  {/if}
                {/each}
              {/if}
            </div>
          {/if}
        {:else}
          <div class="unified-view">
            {#if comparisonMode === 'versions' && selectedPopulationsList.length === 1}
              <!-- Version comparison mode - show the single comparison -->
              {@const keys = Object.keys(processedContent)}
              {#if keys.length === 2}
                {@const diff = differences[`${keys[0]}-${keys[1]}`] || { hasDifferences: false, similarity: '100' }}
                <div class="diff-section">
                  <div class="diff-header">
                    <span 
                      class="pop-label"
                      style="background-color: {populationInfo[selectedPopulationsList[0]].color}"
                    >
                      {processedContent[keys[0]]?.ref.healthSystem || 'Unknown'} / {processedContent[keys[0]]?.ref.domain || 'root'} / {processedContent[keys[0]]?.ref.subdomain || 'default'}
                      {processedContent[keys[0]]?.ref.version > 1 ? ` (v${processedContent[keys[0]].ref.version})` : ''}
                    </span>
                    <span class="vs">vs</span>
                    <span 
                      class="pop-label"
                      style="background-color: {populationInfo[selectedPopulationsList[0]].color}"
                    >
                      {processedContent[keys[1]]?.ref.healthSystem || 'Unknown'} / {processedContent[keys[1]]?.ref.domain || 'root'} / {processedContent[keys[1]]?.ref.subdomain || 'default'}
                      {processedContent[keys[1]]?.ref.version > 1 ? ` (v${processedContent[keys[1]].ref.version})` : ''}
                    </span>
                    <span class="similarity">
                      {diff.similarity}% similar
                    </span>
                  </div>
                  
                  {#if diff.hasDifferences}
                    <DiffDisplay
                      content1={processedContent[keys[0]].content}
                      content2={processedContent[keys[1]].content}
                      label1={`Config ${processedContent[keys[0]]?.index + 1}`}
                      label2={`Config ${processedContent[keys[1]]?.index + 1}`}
                      outputFormat="line-by-line"
                      {diffStyle}
                      minHeight="300px"
                      maxHeight="500px"
                    />
                  {:else}
                    <div class="identical-notice">
                      ✅ These configurations have identical content
                    </div>
                  {/if}
                </div>
              {/if}
            {:else}
              <!-- Population comparison mode -->
              {#each Object.entries(differences) as [key, diff]}
                {@const [key1, key2] = key.split('-')}
                {#if selectedPopulations.has(key1) && selectedPopulations.has(key2)}
                  <div class="diff-section">
                    <div class="diff-header">
                      <span 
                        class="pop-label"
                        style="background-color: {populationInfo[key1].color}"
                      >
                        {populationInfo[key1].name}
                      </span>
                      <span class="vs">vs</span>
                      <span 
                        class="pop-label"
                        style="background-color: {populationInfo[key2].color}"
                      >
                        {populationInfo[key2].name}
                      </span>
                      <span class="similarity">
                        {diff.similarity}% similar
                      </span>
                    </div>
                    
                    {#if diff.hasDifferences}
                      <DiffDisplay
                        content1={processedContent[key1].content}
                        content2={processedContent[key2].content}
                        label1={populationInfo[key1].name}
                        label2={populationInfo[key2].name}
                        outputFormat="line-by-line"
                        {diffStyle}
                        minHeight="300px"
                        maxHeight="500px"
                      />
                    {:else}
                      <div class="identical-notice">
                        ✅ These populations have identical content
                      </div>
                    {/if}
                  </div>
                {/if}
              {/each}
            {/if}
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
    z-index: 2000;
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
    background-color: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    transition: all 0.3s ease;
  }
  
  .viewer-controls.collapsed {
    padding: 0.5rem 1rem;
  }
  
  .viewer-controls:not(.collapsed) {
    padding: 0.75rem 1rem;
  }
  
  .controls-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .controls-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }
  
  .collapse-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 0.8rem;
    color: #666;
  }
  
  .collapsed-summary {
    font-size: 0.85rem;
    color: #666;
    font-weight: normal;
  }
  
  .quick-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .controls-body {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .primary-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .mode-selector.compact {
    display: flex;
    gap: 0.5rem;
    padding: 0.25rem;
    background: white;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }
  
  .mode-radio.compact {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.85rem;
  }
  
  .population-selector.compact {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .population-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background-color: var(--pop-bg);
    border: 1px solid var(--pop-color);
    border-radius: 16px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }
  
  .population-chip:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .population-chip input {
    width: 14px;
    height: 14px;
    cursor: pointer;
  }
  
  .ref-count {
    background: var(--pop-color);
    color: white;
    padding: 0 0.25rem;
    border-radius: 10px;
    font-size: 0.75rem;
  }
  
  .config-comparison-section {
    padding: 0.75rem;
    background: white;
    border-radius: 6px;
    margin-top: 0.5rem;
  }
  
  .comparison-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .comparison-label {
    font-size: 0.9rem;
    color: #495057;
  }
  
  .config-selectors {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .config-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 200px;
  }
  
  .config-selector label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #6c757d;
    min-width: 60px;
  }
  
  .config-select {
    flex: 1;
    padding: 0.35rem 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.85rem;
    background: white;
  }
  
  .config-select.small {
    padding: 0.25rem 0.4rem;
    font-size: 0.8rem;
  }
  
  .selected-configs {
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 6px;
    margin-top: 0.5rem;
  }
  
  .configs-header {
    font-size: 0.9rem;
    font-weight: 500;
    color: #495057;
    margin-bottom: 0.5rem;
  }
  
  .configs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.75rem;
  }
  
  .config-card {
    background: white;
    border: 2px solid;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .config-population {
    color: white;
    padding: 0.35rem 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    text-align: center;
  }
  
  .config-path {
    padding: 0.5rem;
    font-size: 0.8rem;
    color: #495057;
    font-family: monospace;
  }
  
  .config-count {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: #6c757d;
    text-align: center;
    background: #f8f9fa;
  }
  
  .pop-badge {
    padding: 0.25rem 0.5rem;
    color: white;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .pop-badge.mini {
    padding: 0.2rem 0.3rem;
    font-size: 0.7rem;
    border-radius: 3px;
  }
  
  .version-select.compact {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.85rem;
    max-width: 150px;
  }
  
  .version-select.mini {
    padding: 0.2rem 0.3rem;
    font-size: 0.8rem;
    max-width: 60px;
  }
  
  .vs {
    color: #666;
    font-weight: 500;
    font-size: 0.85rem;
  }
  
  .advanced-toggle {
    background: white;
    border: 1px solid #dee2e6;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    margin-left: auto;
  }
  
  .advanced-options {
    display: flex;
    gap: 1rem;
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
    font-size: 0.85rem;
  }
  
  .advanced-options label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .mini-select {
    padding: 0.2rem 0.3rem;
    border: 1px solid #ced4da;
    border-radius: 3px;
    font-size: 0.8rem;
  }
  
  .view-mode-select.compact,
  .export-btn.compact {
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
    border-radius: 4px;
  }
  
  .export-btn.compact {
    background-color: #007bff;
    color: white;
    border: none;
    cursor: pointer;
  }
  
  .identical-notice.compact {
    margin: 0.5rem 1rem;
    padding: 0.5rem;
    background-color: #e8f5e9;
    border: 1px solid #4caf50;
    border-radius: 4px;
  }
  
  .identical-notice.compact .notice-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  
  .identical-notice.compact .notice-title {
    font-size: 0.9rem;
    color: #2e7d32;
  }
  
  .link-button.compact {
    background-color: #4caf50;
    color: white;
    border: none;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .comparison-mode-selector {
    display: flex;
    gap: 2rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #dee2e6;
  }
  
  .version-selectors {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem;
    background-color: #f0f4f8;
    border-radius: 6px;
    margin: 0.5rem 0;
  }
  
  .population-version-selectors {
    padding: 1rem;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    margin: 0.5rem 0;
  }
  
  .version-selection-header {
    font-weight: 600;
    color: #495057;
    margin-bottom: 0.75rem;
    font-size: 0.95rem;
  }
  
  .version-selection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }
  
  .population-version-selector {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background-color: white;
    border: 2px solid;
    border-radius: 4px;
  }
  
  .population-version-selector label {
    min-width: 80px;
    font-size: 0.9rem;
  }
  
  .population-version-selector select {
    flex: 1;
    padding: 0.3rem 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.85rem;
    background-color: white;
  }
  
  .single-version-info {
    flex: 1;
    font-size: 0.85rem;
    color: #666;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .version-badge {
    background-color: #e9ecef;
    color: #6c757d;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    margin-left: auto;
  }
  
  .version-selector-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .version-selector-group label {
    font-weight: 500;
    color: #495057;
    font-size: 0.9rem;
  }
  
  .version-selector-group select {
    padding: 0.4rem 0.8rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background-color: white;
    font-size: 0.9rem;
    min-width: 200px;
    cursor: pointer;
  }
  
  .version-selector-group select:hover {
    border-color: #80bdff;
  }
  
  .version-selector-group select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
  
  .vs-selector {
    font-weight: 500;
    color: #6c757d;
    font-size: 0.95rem;
  }
  
  .mode-radio {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  
  .mode-radio input[type="radio"] {
    cursor: pointer;
  }
  
  .mode-radio span {
    font-size: 0.95rem;
    color: #333;
  }
  
  .mode-radio input[type="radio"]:disabled + span {
    color: #999;
    cursor: not-allowed;
  }
  
  .controls-row {
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
  
  .show-identical,
  .show-rendered {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  
  .view-mode-select,
  .diff-style-select {
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
    min-height: 0; /* Allow flex shrinking */
    max-height: calc(100vh - 350px); /* Constrain height */
  }
  
  /* Side by side view */
  .side-by-side-view {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    height: 100%;
    min-height: 0; /* Allow proper sizing */
    max-height: calc(100vh - 300px); /* Prevent overflow */
    overflow: hidden; /* Contain child scrolling */
  }
  
  .population-column {
    border: 2px solid var(--pop-color);
    background-color: #fff;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0; /* Allow flex shrinking */
    max-height: 100%; /* Prevent overflow */
    position: relative; /* For better containment */
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
  
  .reference-details {
    font-size: 0.85rem;
    color: #666;
    margin-top: 0.25rem;
  }
  
  .config-selector-info {
    font-size: 0.8rem;
    color: var(--pop-color);
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .config-path-display {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-family: monospace;
    background: rgba(0, 0, 0, 0.03);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    flex-wrap: wrap;
    word-break: break-word;
  }
  
  .path-segment {
    font-weight: 500;
  }
  
  .path-segment.health-system {
    color: #0066cc;
  }
  
  .path-segment.domain {
    color: #028a0f;
  }
  
  .path-segment.subdomain {
    color: #6c757d;
  }
  
  .path-separator {
    color: #adb5bd;
    margin: 0 0.125rem;
  }
  
  .version-badge.inline {
    background: var(--pop-color);
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 10px;
    font-size: 0.75rem;
    margin-left: 0.5rem;
    font-family: sans-serif;
  }
  
  .ref-separator {
    margin: 0 0.5rem;
    color: #ccc;
  }
  
  .ref-health-system {
    font-weight: 600;
  }
  
  .shared-indicator {
    margin-left: 0.5rem;
    font-size: 1rem;
    cursor: help;
  }
  
  .multiple-versions-notice {
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    font-size: 0.8rem;
    color: #856404;
    display: inline-block;
  }
  
  .notice-icon {
    margin-right: 0.25rem;
  }
  
  .version-selector {
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--pop-color);
    border-radius: 4px;
    background-color: white;
    color: #333;
    font-size: 0.85rem;
    width: 100%;
    cursor: pointer;
  }
  
  .version-selector:hover {
    background-color: var(--pop-bg);
  }
  
  /* Identical content notice styles */
  .identical-notice {
    margin: 1rem;
    padding: 1rem;
    background-color: #e8f5e9;
    border: 1px solid #4caf50;
    border-radius: 8px;
  }
  
  .notice-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  
  .notice-title {
    font-weight: 600;
    color: #2e7d32;
    font-size: 1.1rem;
  }
  
  .notice-body p {
    margin: 0 0 0.75rem 0;
    color: #424242;
  }
  
  .identical-list {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem 0;
  }
  
  .identical-list li {
    padding: 0.5rem;
    background-color: white;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .version-match {
    background-color: #f5f5f5;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .match-separator {
    color: #4caf50;
    font-weight: bold;
    font-size: 1.2rem;
  }
  
  .link-button {
    background-color: #4caf50;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .link-button:hover:not(:disabled) {
    background-color: #45a049;
  }
  
  .link-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .linking-message {
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .linking-message.success {
    background-color: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #4caf50;
  }
  
  .linking-message.error {
    background-color: #ffebee;
    color: #c62828;
    border: 1px solid #f44336;
  }
  
  .linking-message.warning {
    background-color: #fff8e1;
    color: #f57c00;
    border: 1px solid #ff9800;
  }
  
  .column-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    color: #333;
    min-height: 100px;
    max-height: calc(100vh - 400px); /* Constrain height */
    background-color: #fff;
    word-wrap: break-word;
    overflow-wrap: anywhere;
    hyphens: auto;
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
    color: #333;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: anywhere;
    max-width: 100%;
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
  
  /* Ensure all text content wraps properly */
  .column-content :global(p),
  .column-content :global(div),
  .column-content :global(span),
  .column-content :global(li) {
    word-wrap: break-word;
    overflow-wrap: anywhere;
    hyphens: auto;
  }
  
  /* Prevent horizontal overflow for all content */
  .column-content > * {
    max-width: 100%;
  }
  
  /* Responsive design for tablets and mobile */
  @media (max-width: 1024px) {
    .diff-viewer {
      width: 95%;
      height: 95%;
      max-height: none;
    }
    
    .viewer-controls {
      max-height: 40vh;
      overflow-y: auto;
    }
    
    .viewer-controls:not(.collapsed) {
      padding: 0.5rem;
    }
    
    .controls-body {
      margin-top: 0.5rem;
    }
    
    .primary-controls {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
    
    .population-selector.compact {
      justify-content: center;
    }
    
    .side-by-side-view {
      grid-template-columns: 1fr;
    }
    
    .version-compare-row {
      flex-direction: column;
      align-items: stretch;
    }
    
    .advanced-options {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
  
  @media (max-width: 768px) {
    .viewer-header h2 {
      font-size: 1.2rem;
    }
    
    .controls-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
    
    .quick-actions {
      justify-content: space-between;
    }
    
    .population-chip {
      font-size: 0.8rem;
      padding: 0.2rem 0.4rem;
    }
    
    .version-select.compact {
      max-width: 100%;
    }
    
    /* Auto-collapse controls on mobile */
    .viewer-controls {
      padding: 0.5rem !important;
    }
    
    .controls-body {
      display: none;
    }
    
    .viewer-controls:not(.collapsed) .controls-body {
      display: flex;
    }
  }
  
  .column-content :global(a),
  .diff-lines :global(a) {
    color: #0066cc;
  }
  
  /* Ensure dynamic sections are visible */
  .column-content :global(.dynamic-section) {
    margin: 0.5rem 0;
    border: 1px solid #ffc107;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .column-content :global(.dynamic-header) {
    background-color: #fff3cd;
    color: #856404;
    padding: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .column-content :global(.dynamic-section pre) {
    margin: 0;
    padding: 0.5rem;
    background-color: #f8f9fa;
    font-size: 0.85rem;
    overflow-x: auto;
    color: #333;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: anywhere;
    max-width: 100%;
  }
  
  /* Style for dynamic content spans */
  .column-content :global(.dynamic-content) {
    color: #333;
    display: inline-block;
  }
  
  .column-content :global(.sanitization-error) {
    color: #dc3545;
    font-style: italic;
  }
</style>