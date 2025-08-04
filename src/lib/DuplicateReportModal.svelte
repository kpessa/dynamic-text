<script>
  let { report = null, onClose = () => {}, onProceed = () => {} } = $props();
  
  $effect(() => {
    if (report) {
      console.log('Duplicate Report:', report);
    }
  });
</script>

{#if report}
  <div class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Import Analysis Report</h2>
        <button class="close-btn" onclick={onClose}>×</button>
      </div>
      
      <div class="modal-body">
        <div class="summary-section">
          <h3>Summary</h3>
          <div class="stats-grid">
            <div class="stat">
              <span class="stat-label">Total Ingredients:</span>
              <span class="stat-value">{report.totalChecked}</span>
            </div>
            <div class="stat">
              <span class="stat-label">New Ingredients:</span>
              <span class="stat-value success">{report.importStats?.newIngredients || 0}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Updated Ingredients:</span>
              <span class="stat-value warning">{report.importStats?.updatedIngredients || 0}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Identical (No Changes):</span>
              <span class="stat-value info">{report.identicalIngredients.length}</span>
            </div>
            {#if report.autoDedupeEnabled}
              <div class="stat">
                <span class="stat-label">Auto-Deduplicated:</span>
                <span class="stat-value success">{report.autoDedupeActions?.length || 0}</span>
              </div>
            {/if}
          </div>
        </div>
        
        {#if report.autoDedupeEnabled && report.autoDedupeActions?.length > 0}
          <div class="section auto-dedupe-section">
            <h3>🔗 Auto-Deduplication Applied</h3>
            <p class="description">The following ingredients were automatically linked to existing shared ingredients:</p>
            <div class="auto-dedupe-list">
              {#each report.autoDedupeActions as action}
                <div class="auto-dedupe-item">
                  <span class="ingredient-name">{action.name}</span>
                  <span class="badge success">Auto-linked</span>
                  <span class="config-count">
                    Shared with {action.existingConfigs.length} config(s)
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        {#if report.duplicatesFound.length > 0}
          <div class="section">
            <h3>Duplicates Within Import</h3>
            <p class="description">These ingredients appear multiple times in the config being imported:</p>
            <div class="duplicate-list">
              {#each report.duplicatesFound as duplicate}
                <div class="duplicate-item">
                  <span class="badge">{duplicate.count} copies</span>
                  <span class="ingredient-names">
                    {duplicate.ingredients.join(', ')}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        {#if report.identicalIngredients.length > 0}
          <div class="section">
            <h3>Identical Ingredients</h3>
            <p class="description">These ingredients already exist with identical content:</p>
            <div class="identical-list">
              {#each report.identicalIngredients as item}
                <div class="identical-item">
                  <span class="ingredient-name">{item.name}</span>
                  {#if item.existingConfigs.length > 0}
                    <span class="config-count">
                      Used by {item.existingConfigs.length} config(s)
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        {#if report.variations.length > 0}
          <div class="section">
            <h3>Variations Found</h3>
            <p class="description">These ingredients exist but with different content:</p>
            <div class="variation-list">
              {#each report.variations as variation}
                <div class="variation-item">
                  <span class="ingredient-name">{variation.name}</span>
                  <span class="warning-badge">Content differs</span>
                  {#if variation.existingConfigs.length > 0}
                    <span class="config-count">
                      Used by {variation.existingConfigs.length} config(s)
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={onClose}>Cancel</button>
        <button class="btn btn-primary" onclick={onProceed}>
          Proceed with Import
        </button>
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
    max-width: 800px;
    max-height: 80vh;
    width: 90%;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .modal-header h2 {
    margin: 0;
    color: #333;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    color: #333;
  }
  
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  
  .summary-section {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 20px;
  }
  
  .summary-section h3 {
    margin: 0 0 15px 0;
    color: #495057;
    font-size: 16px;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }
  
  .stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 10px 15px;
    border-radius: 4px;
  }
  
  .stat-label {
    color: #6c757d;
    font-size: 14px;
  }
  
  .stat-value {
    font-weight: bold;
    font-size: 18px;
    color: #333;
  }
  
  .stat-value.success {
    color: #28a745;
  }
  
  .stat-value.warning {
    color: #ffc107;
  }
  
  .stat-value.info {
    color: #17a2b8;
  }
  
  .section {
    margin-bottom: 25px;
  }
  
  .auto-dedupe-section {
    background: #e8f5e9;
    padding: 15px;
    border-radius: 4px;
    border: 1px solid #4caf50;
  }
  
  .auto-dedupe-list {
    margin-top: 10px;
  }
  
  .auto-dedupe-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: white;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  
  .auto-dedupe-item .badge.success {
    background: #28a745;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
  }
  
  .section h3 {
    color: #333;
    font-size: 16px;
    margin: 0 0 8px 0;
  }
  
  .description {
    color: #6c757d;
    font-size: 14px;
    margin: 0 0 12px 0;
  }
  
  .duplicate-list,
  .identical-list,
  .variation-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .duplicate-item,
  .identical-item,
  .variation-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .badge {
    background: #e74c3c;
    color: white;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: bold;
  }
  
  .warning-badge {
    background: #ffc107;
    color: #333;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: bold;
  }
  
  .ingredient-name {
    font-weight: 500;
    color: #333;
  }
  
  .ingredient-names {
    color: #495057;
  }
  
  .config-count {
    color: #6c757d;
    font-size: 12px;
    margin-left: auto;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid #e0e0e0;
  }
  
  .btn {
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .btn-primary {
    background: #007bff;
    color: white;
  }
  
  .btn-primary:hover {
    background: #0056b3;
  }
  
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  
  .btn-secondary:hover {
    background: #5a6268;
  }
</style>