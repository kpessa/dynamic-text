<script lang="ts">
  import type { Ingredient } from '../models';
  import type { 
    ImportAnalysisResult, 
    ImportDecision, 
    ImportProgress,
    ImportResult 
  } from '../services/importAnalysisService';
  import { importAnalysisService } from '../services/importAnalysisService';
  import { onMount } from 'svelte';
  
  // Props
  let {
    onClose = () => {},
    onImportComplete = (result: ImportResult) => {}
  } = $props();
  
  // State management with Svelte 5 runes
  let currentStep = $state<'upload' | 'analyze' | 'review' | 'import' | 'complete'>('upload');
  let analysisResult = $state<ImportAnalysisResult | null>(null);
  let importDecisions = $state<Map<string, ImportDecision>>(new Map());
  let importProgress = $state<ImportProgress | null>(null);
  let importResult = $state<ImportResult | null>(null);
  
  // File handling
  let selectedFile = $state<File | null>(null);
  let fileContent = $state<any>(null);
  let isDragging = $state(false);
  let error = $state<string | null>(null);
  
  // UI state
  let showDiffModal = $state(false);
  let selectedMatch = $state<any>(null);
  let bulkAction = $state<'use-existing' | 'create-new' | null>(null);
  
  // File input handling
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      processFile(input.files[0]);
    }
  }
  
  // Drag and drop handling
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }
  
  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }
  
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      processFile(event.dataTransfer.files[0]);
    }
  }
  
  // Process selected file
  async function processFile(file: File) {
    if (!file.name.endsWith('.json')) {
      error = 'Please select a JSON configuration file';
      return;
    }
    
    selectedFile = file;
    error = null;
    
    try {
      const text = await file.text();
      fileContent = JSON.parse(text);
      
      // Validate config structure
      if (!fileContent.INGREDIENT || !Array.isArray(fileContent.INGREDIENT)) {
        throw new Error('Invalid config file: missing INGREDIENT array');
      }
      
      // Move to analysis step
      currentStep = 'analyze';
      await startAnalysis();
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to read file';
      selectedFile = null;
      fileContent = null;
    }
  }
  
  // Start analysis
  async function startAnalysis() {
    if (!fileContent) return;
    
    try {
      const result = await importAnalysisService.analyzeConfig(fileContent);
      analysisResult = result;
      
      // Initialize decisions for near matches
      result.nearMatches.forEach(match => {
        importDecisions.set(match.id, {
          action: 'use-existing',
          ingredientId: match.matchedWith?.id
        });
      });
      
      currentStep = 'review';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Analysis failed';
      currentStep = 'upload';
    }
  }
  
  // Update decision for a match
  function updateDecision(matchId: string, action: ImportDecision['action']) {
    const match = analysisResult?.nearMatches.find(m => m.id === matchId);
    if (match) {
      importDecisions.set(matchId, {
        action,
        ingredientId: action === 'use-existing' || action === 'merge' ? 
          match.matchedWith?.id : undefined
      });
    }
  }
  
  // Apply bulk action
  function applyBulkAction(threshold: number) {
    if (!analysisResult || !bulkAction) return;
    
    analysisResult.nearMatches.forEach(match => {
      if (match.similarity >= threshold) {
        importDecisions.set(match.id, {
          action: bulkAction,
          ingredientId: bulkAction === 'use-existing' ? match.matchedWith?.id : undefined
        });
      }
    });
    
    bulkAction = null;
  }
  
  // Show diff viewer
  function showDiff(match: any) {
    selectedMatch = match;
    showDiffModal = true;
  }
  
  // Execute import
  async function executeImport() {
    if (!fileContent || !analysisResult) return;
    
    currentStep = 'import';
    error = null;
    
    try {
      const result = await importAnalysisService.executeImport(
        fileContent,
        importDecisions,
        (progress) => {
          importProgress = progress;
        }
      );
      
      importResult = result;
      currentStep = 'complete';
      
      // Notify parent
      onImportComplete(result);
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Import failed';
      currentStep = 'review';
    }
  }
  
  // Reset wizard
  function reset() {
    currentStep = 'upload';
    selectedFile = null;
    fileContent = null;
    analysisResult = null;
    importDecisions.clear();
    importProgress = null;
    importResult = null;
    error = null;
  }
  
  // Get step title  
  const stepTitle = $derived(
    (() => {
      switch (currentStep) {
        case 'upload': return 'Select Configuration File';
        case 'analyze': return 'Analyzing Content...';
        case 'review': return 'Review Import Analysis';
        case 'import': return 'Importing...';
        case 'complete': return 'Import Complete';
        default: return 'Import Wizard';
      }
    })()
  );
  
  // Get progress percentage
  const progressPercentage = $derived(() => {
    const value = (() => {
      switch (currentStep) {
        case 'upload': return 20;
        case 'analyze': return 40;
        case 'review': return 60;
        case 'import': return importProgress?.percentage || 80;
        case 'complete': return 100;
        default: return 0;
      }
    })();
    return Math.max(0, Math.min(100, value)); // Ensure value is between 0 and 100
  });
</script>

<div class="import-wizard-modal">
  <div class="modal-content">
    <!-- Header -->
    <div class="modal-header">
      <h2>{stepTitle}</h2>
      <button onclick={onClose} class="btn btn-ghost btn-sm">✕</button>
    </div>
    
    <!-- Progress Bar -->
    <div class="progress-container">
      <progress class="progress progress-primary" value={isNaN(progressPercentage) ? 0 : progressPercentage} max="100"></progress>
      <span class="progress-text">{isNaN(progressPercentage) ? 0 : progressPercentage}%</span>
    </div>
    
    <!-- Error Display -->
    {#if error}
      <div class="alert alert-error">
        <span>{error}</span>
      </div>
    {/if}
    
    <!-- Step Content -->
    <div class="step-content">
      {#if currentStep === 'upload'}
        <!-- File Upload Step -->
        <div 
          class="drop-zone"
          class:dragging={isDragging}
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
        >
          <div class="drop-zone-content">
            <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p class="drop-text">
              Drag and drop your config file here, or
            </p>
            <label class="btn btn-primary">
              Browse Files
              <input 
                type="file" 
                accept=".json"
                onchange={handleFileSelect}
                class="hidden"
              />
            </label>
            {#if selectedFile}
              <p class="file-name">Selected: {selectedFile.name}</p>
            {/if}
          </div>
        </div>
        
      {:else if currentStep === 'analyze'}
        <!-- Analysis Step -->
        <div class="analysis-progress">
          <div class="loading loading-spinner loading-lg"></div>
          <h3>Analyzing Configuration...</h3>
          <p>Detecting duplicate ingredients and calculating similarities</p>
          <progress class="progress progress-primary w-full"></progress>
        </div>
        
      {:else if currentStep === 'review' && analysisResult}
        <!-- Review Step -->
        <div class="review-container">
          <!-- Summary Statistics -->
          <div class="summary-grid">
            <div class="stat-card">
              <div class="stat-value">{analysisResult.summary.totalIngredients}</div>
              <div class="stat-label">Total Ingredients</div>
            </div>
            <div class="stat-card success">
              <div class="stat-value">{analysisResult.summary.exactMatchCount}</div>
              <div class="stat-label">Exact Matches</div>
            </div>
            <div class="stat-card warning">
              <div class="stat-value">{analysisResult.summary.nearMatchCount}</div>
              <div class="stat-label">Near Matches</div>
            </div>
            <div class="stat-card info">
              <div class="stat-value">{analysisResult.summary.uniqueCount}</div>
              <div class="stat-label">New Ingredients</div>
            </div>
          </div>
          
          <!-- Data Savings -->
          <div class="savings-info">
            <h3>💾 Estimated Data Savings</h3>
            <div class="savings-stats">
              <span class="savings-percentage">{analysisResult.summary.estimatedDataSaved}</span>
              <span class="savings-size">
                {Math.round(analysisResult.summary.estimatedSizeReduction.before / 1024)}KB → 
                {Math.round(analysisResult.summary.estimatedSizeReduction.after / 1024)}KB
              </span>
            </div>
          </div>
          
          <!-- Exact Matches Section -->
          {#if analysisResult.exactMatches.length > 0}
            <div class="match-section">
              <h3>✅ Exact Matches (100% similarity)</h3>
              <p class="section-description">
                These ingredients are identical to existing ones and will use references.
              </p>
              <details class="collapse">
                <summary class="collapse-title">
                  View {analysisResult.exactMatches.length} exact matches
                </summary>
                <div class="collapse-content">
                  {#each analysisResult.exactMatches as match}
                    <div class="match-item exact">
                      <span class="match-name">{match.ingredient.displayName || match.ingredient.keyname}</span>
                      <span class="match-action">→ Use existing</span>
                    </div>
                  {/each}
                </div>
              </details>
            </div>
          {/if}
          
          <!-- Near Matches Section -->
          {#if analysisResult.nearMatches.length > 0}
            <div class="match-section">
              <h3>⚠️ Near Matches (70-99% similarity)</h3>
              <p class="section-description">
                Review these potential duplicates and decide how to handle them.
              </p>
              
              <!-- Bulk Actions -->
              <div class="bulk-actions">
                <select bind:value={bulkAction} class="select select-bordered select-sm">
                  <option value={null}>Select bulk action...</option>
                  <option value="use-existing">Use existing for all</option>
                  <option value="create-new">Create new for all</option>
                </select>
                {#if bulkAction}
                  <button 
                    onclick={() => applyBulkAction(90)}
                    class="btn btn-sm"
                  >
                    Apply to >90% matches
                  </button>
                  <button 
                    onclick={() => applyBulkAction(70)}
                    class="btn btn-sm"
                  >
                    Apply to all
                  </button>
                {/if}
              </div>
              
              <!-- Near Match Cards -->
              <div class="near-matches-list">
                {#each analysisResult.nearMatches as match}
                  <div class="near-match-card">
                    <div class="match-header">
                      <span class="match-name">
                        {match.ingredient.displayName || match.ingredient.keyname}
                      </span>
                      <span class="similarity-badge" class:high={match.similarity >= 90}>
                        {match.similarity}% match
                      </span>
                    </div>
                    
                    <div class="match-options">
                      <label class="option-label">
                        <input 
                          type="radio" 
                          name={`decision-${match.id}`}
                          checked={importDecisions.get(match.id)?.action === 'use-existing'}
                          onchange={() => updateDecision(match.id, 'use-existing')}
                        />
                        Use existing ingredient
                      </label>
                      <label class="option-label">
                        <input 
                          type="radio" 
                          name={`decision-${match.id}`}
                          checked={importDecisions.get(match.id)?.action === 'create-new'}
                          onchange={() => updateDecision(match.id, 'create-new')}
                        />
                        Create as new ingredient
                      </label>
                      <label class="option-label">
                        <input 
                          type="radio" 
                          name={`decision-${match.id}`}
                          checked={importDecisions.get(match.id)?.action === 'merge'}
                          onchange={() => updateDecision(match.id, 'merge')}
                        />
                        Merge with existing
                      </label>
                    </div>
                    
                    <button 
                      onclick={() => showDiff(match)}
                      class="btn btn-ghost btn-sm"
                    >
                      View Differences
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
          
          <!-- Unique Ingredients Section -->
          {#if analysisResult.uniqueIngredients.length > 0}
            <div class="match-section">
              <h3>🆕 New Ingredients ({analysisResult.uniqueIngredients.length})</h3>
              <p class="section-description">
                These ingredients will be created as new entries.
              </p>
              <details class="collapse">
                <summary class="collapse-title">
                  View new ingredients
                </summary>
                <div class="collapse-content">
                  {#each analysisResult.uniqueIngredients as unique}
                    <div class="new-ingredient-item">
                      <span class="ingredient-name">
                        {unique.ingredient.displayName || unique.ingredient.keyname}
                      </span>
                      <span class="category-badge">
                        {unique.ingredient.category || 'Other'}
                      </span>
                    </div>
                  {/each}
                </div>
              </details>
            </div>
          {/if}
        </div>
        
      {:else if currentStep === 'import'}
        <!-- Import Progress Step -->
        <div class="import-progress">
          <div class="loading loading-spinner loading-lg"></div>
          <h3>Importing Configuration...</h3>
          {#if importProgress}
            <p class="progress-item">{importProgress.currentItem}</p>
            <progress 
              class="progress progress-primary w-full" 
              value={importProgress?.percentage || 0} 
              max="100"
            ></progress>
            <span class="progress-stats">
              {importProgress.current} / {importProgress.total} processed
            </span>
          {/if}
        </div>
        
      {:else if currentStep === 'complete' && importResult}
        <!-- Complete Step -->
        <div class="complete-container">
          <div class="success-icon">✅</div>
          <h3>Import Complete!</h3>
          
          <div class="result-stats">
            <div class="result-item">
              <span class="result-label">Created:</span>
              <span class="result-value">{importResult.created}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Skipped:</span>
              <span class="result-value">{importResult.skipped}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Merged:</span>
              <span class="result-value">{importResult.merged}</span>
            </div>
          </div>
          
          {#if importResult.errors.length > 0}
            <div class="alert alert-warning">
              <h4>Some items had errors:</h4>
              <ul>
                {#each importResult.errors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}
    </div>
    
    <!-- Footer Actions -->
    <div class="modal-footer">
      {#if currentStep === 'upload'}
        <button onclick={onClose} class="btn btn-ghost">Cancel</button>
      {:else if currentStep === 'review'}
        <button onclick={reset} class="btn btn-ghost">Back</button>
        <button onclick={executeImport} class="btn btn-primary">
          Import Configuration
        </button>
      {:else if currentStep === 'complete'}
        <button onclick={reset} class="btn btn-ghost">Import Another</button>
        <button onclick={onClose} class="btn btn-primary">Done</button>
      {:else}
        <button onclick={onClose} class="btn btn-ghost">Cancel</button>
      {/if}
    </div>
  </div>
  
  <!-- Diff Viewer Modal -->
  {#if showDiffModal && selectedMatch}
    <div class="diff-modal">
      <div class="diff-viewer">
        <div class="diff-header">
          <h3>Differences</h3>
          <button onclick={() => showDiffModal = false} class="btn btn-ghost btn-sm">✕</button>
        </div>
        <div class="diff-content">
          {#if selectedMatch.differences}
            {#each selectedMatch.differences as diff}
              <div class="diff-item">
                <div class="diff-field">{diff.field}</div>
                <div class="diff-values">
                  <div class="diff-old">- {diff.oldValue}</div>
                  <div class="diff-new">+ {diff.newValue}</div>
                </div>
              </div>
            {/each}
          {:else}
            <p>No differences found</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .import-wizard-modal {
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
    background: var(--base-100);
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 800px;
    width: 90%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--base-300);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .progress-container {
    padding: 0 1.5rem;
    margin-top: 1rem;
  }
  
  .progress-text {
    font-size: 0.875rem;
    color: var(--base-content-secondary);
    margin-left: 0.5rem;
  }
  
  .step-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
  
  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--base-300);
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  
  /* File Upload Styles */
  .drop-zone {
    border: 2px dashed var(--base-300);
    border-radius: 8px;
    padding: 3rem;
    text-align: center;
    transition: all 0.3s;
    cursor: pointer;
  }
  
  .drop-zone.dragging {
    border-color: var(--primary);
    background: var(--primary-focus);
  }
  
  .drop-zone-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .upload-icon {
    width: 64px;
    height: 64px;
    color: var(--base-content-secondary);
  }
  
  .hidden {
    display: none;
  }
  
  .file-name {
    margin-top: 1rem;
    font-size: 0.875rem;
    color: var(--success);
  }
  
  /* Analysis Progress */
  .analysis-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
  }
  
  /* Review Container */
  .review-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .stat-card {
    padding: 1rem;
    background: var(--base-200);
    border-radius: 8px;
    text-align: center;
  }
  
  .stat-card.success {
    background: var(--success-content);
    color: var(--success);
  }
  
  .stat-card.warning {
    background: var(--warning-content);
    color: var(--warning);
  }
  
  .stat-card.info {
    background: var(--info-content);
    color: var(--info);
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: bold;
  }
  
  .stat-label {
    font-size: 0.875rem;
    opacity: 0.8;
  }
  
  /* Savings Info */
  .savings-info {
    padding: 1rem;
    background: var(--success-content);
    border-radius: 8px;
  }
  
  .savings-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
  }
  
  .savings-percentage {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--success);
  }
  
  /* Match Sections */
  .match-section {
    border: 1px solid var(--base-300);
    border-radius: 8px;
    padding: 1rem;
  }
  
  .section-description {
    font-size: 0.875rem;
    color: var(--base-content-secondary);
    margin: 0.5rem 0;
  }
  
  .match-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    border-bottom: 1px solid var(--base-300);
  }
  
  .match-item:last-child {
    border-bottom: none;
  }
  
  /* Near Match Cards */
  .near-match-card {
    border: 1px solid var(--base-300);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .match-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .similarity-badge {
    padding: 0.25rem 0.5rem;
    background: var(--warning-content);
    color: var(--warning);
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .similarity-badge.high {
    background: var(--success-content);
    color: var(--success);
  }
  
  .match-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  
  .option-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  
  /* Bulk Actions */
  .bulk-actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  /* New Ingredients */
  .new-ingredient-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
  }
  
  .category-badge {
    padding: 0.25rem 0.5rem;
    background: var(--base-200);
    border-radius: 4px;
    font-size: 0.75rem;
  }
  
  /* Import Progress */
  .import-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
  }
  
  .progress-item {
    font-size: 0.875rem;
    color: var(--base-content-secondary);
  }
  
  .progress-stats {
    font-size: 0.875rem;
    color: var(--base-content-secondary);
  }
  
  /* Complete */
  .complete-container {
    text-align: center;
    padding: 2rem;
  }
  
  .success-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  .result-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin: 2rem 0;
  }
  
  .result-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .result-label {
    font-size: 0.875rem;
    color: var(--base-content-secondary);
  }
  
  .result-value {
    font-size: 1.5rem;
    font-weight: bold;
  }
  
  /* Diff Modal */
  .diff-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }
  
  .diff-viewer {
    background: var(--base-100);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 600px;
    width: 90%;
    max-height: 70vh;
    overflow: auto;
  }
  
  .diff-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .diff-item {
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: var(--base-200);
    border-radius: 4px;
  }
  
  .diff-field {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .diff-old {
    color: var(--error);
  }
  
  .diff-new {
    color: var(--success);
  }
</style>