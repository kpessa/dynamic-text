<script>
  import { onMount } from 'svelte';
  import { ingredientService, referenceService } from './firebaseDataService.js';
  
  let {
    ingredientId = null,
    referenceId = null,
    isOpen = $bindable(false),
    onRestore = () => {}
  } = $props();
  
  let versions = $state([]);
  let loading = $state(false);
  let error = $state(null);
  let selectedVersions = $state([]);
  let viewMode = $state('list'); // 'list' or 'compare'
  
  $effect(() => {
    if (isOpen && ingredientId) {
      loadVersionHistory();
    }
  });
  
  async function loadVersionHistory() {
    loading = true;
    error = null;
    
    try {
      if (referenceId) {
        versions = await referenceService.getReferenceVersionHistory(ingredientId, referenceId);
      } else {
        versions = await ingredientService.getVersionHistory(ingredientId);
      }
    } catch (err) {
      console.error('Error loading version history:', err);
      error = 'Failed to load version history';
    } finally {
      loading = false;
    }
  }
  
  function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString();
  }
  
  function selectVersionForCompare(version) {
    if (selectedVersions.includes(version.id)) {
      selectedVersions = selectedVersions.filter(id => id !== version.id);
    } else if (selectedVersions.length < 2) {
      selectedVersions = [...selectedVersions, version.id];
    }
    
    if (selectedVersions.length === 2) {
      viewMode = 'compare';
    }
  }
  
  function restoreVersion(version) {
    if (confirm(`Restore to version ${version.versionNumber}?`)) {
      onRestore(version);
      isOpen = false;
    }
  }
  
  function getDiff(obj1, obj2, path = '') {
    const diffs = [];
    const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);
    
    for (const key of keys) {
      if (['archivedAt', 'lastModified', 'updatedAt', 'createdAt'].includes(key)) continue;
      
      const newPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];
      
      if (typeof val1 === 'object' && typeof val2 === 'object' && !Array.isArray(val1) && !Array.isArray(val2)) {
        diffs.push(...getDiff(val1, val2, newPath));
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        diffs.push({
          field: newPath,
          oldValue: val1,
          newValue: val2
        });
      }
    }
    
    return diffs;
  }
</script>

{#if isOpen}
  <div 
    class="modal-overlay" 
    onclick={() => isOpen = false}
    onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
    role="button"
    tabindex="-1"
  >
    <div 
      class="modal-content" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Version History"
    >
      <div class="modal-header">
        <h2>Version History</h2>
        <button class="close-btn" onclick={() => isOpen = false}>×</button>
      </div>
      
      <div class="view-toggle">
        <button 
          class="toggle-btn {viewMode === 'list' ? 'active' : ''}"
          onclick={() => viewMode = 'list'}
        >
          📋 List View
        </button>
        <button 
          class="toggle-btn {viewMode === 'compare' ? 'active' : ''}"
          onclick={() => viewMode = 'compare'}
          disabled={selectedVersions.length < 2}
        >
          🔍 Compare ({selectedVersions.length}/2)
        </button>
      </div>
      
      {#if loading}
        <div class="loading">Loading version history...</div>
      {:else if error}
        <div class="error">{error}</div>
      {:else if versions.length === 0}
        <div class="empty">No version history available</div>
      {:else if viewMode === 'list'}
        <div class="version-list">
          {#each versions as version, index}
            <div class="version-item {selectedVersions.includes(version.id) ? 'selected' : ''}">
              <div class="version-header">
                <div class="version-info">
                  <span class="version-number">Version {version.versionNumber || version.version}</span>
                  {#if index === 0}
                    <span class="current-badge">Current</span>
                  {/if}
                </div>
                <div class="version-date">
                  {formatDate(version.archivedAt || version.lastModified)}
                </div>
              </div>
              
              <div class="version-meta">
                {#if version.modifiedBy}
                  <span class="meta-item">By: {version.modifiedBy}</span>
                {/if}
                {#if version.description}
                  <span class="meta-item">Note: {version.description}</span>
                {/if}
                {#if version.commitMessage}
                  <span class="meta-item commit-message">
                    💬 {version.commitMessage}
                  </span>
                {/if}
              </div>
              
              <div class="version-actions">
                {#if index > 0}
                  <button 
                    class="action-btn restore"
                    onclick={() => restoreVersion(version)}
                  >
                    ↩️ Restore
                  </button>
                {/if}
                <button 
                  class="action-btn compare"
                  onclick={() => selectVersionForCompare(version)}
                  disabled={selectedVersions.length >= 2 && !selectedVersions.includes(version.id)}
                >
                  {selectedVersions.includes(version.id) ? '✓ Selected' : 'Select for Compare'}
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <!-- Compare View -->
        {@const version1 = versions.find(v => v.id === selectedVersions[0])}
        {@const version2 = versions.find(v => v.id === selectedVersions[1])}
        {@const diffs = getDiff(version1, version2)}
        
        <div class="compare-header">
          <div class="compare-version">
            <h3>Version {version1?.versionNumber || version1?.version}</h3>
            <span>{formatDate(version1?.archivedAt || version1?.lastModified)}</span>
          </div>
          <div class="compare-arrow">→</div>
          <div class="compare-version">
            <h3>Version {version2?.versionNumber || version2?.version}</h3>
            <span>{formatDate(version2?.archivedAt || version2?.lastModified)}</span>
          </div>
        </div>
        
        <div class="diff-list">
          {#if diffs.length === 0}
            <div class="no-changes">No changes between versions</div>
          {:else}
            {#each diffs as diff}
              <div class="diff-item">
                <div class="diff-field">{diff.field}</div>
                <div class="diff-values">
                  <div class="old-value">
                    <span class="label">Old:</span>
                    <span class="value">{JSON.stringify(diff.oldValue) || 'null'}</span>
                  </div>
                  <div class="new-value">
                    <span class="label">New:</span>
                    <span class="value">{JSON.stringify(diff.newValue) || 'null'}</span>
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
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
    backdrop-filter: blur(4px);
  }
  
  .modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 800px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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
    font-size: 1.5rem;
    color: #111827;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    color: #6b7280;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background: #f3f4f6;
    color: #111827;
  }
  
  .view-toggle {
    display: flex;
    gap: 0.5rem;
    padding: 0 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .toggle-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 0.875rem;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  
  .toggle-btn:hover:not(:disabled) {
    color: #111827;
  }
  
  .toggle-btn.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }
  
  .toggle-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .loading, .error, .empty {
    padding: 3rem;
    text-align: center;
    color: #6b7280;
  }
  
  .error {
    color: #ef4444;
  }
  
  .version-list {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
  
  .version-item {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    transition: all 0.2s;
  }
  
  .version-item:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }
  
  .version-item.selected {
    background: #eff6ff;
    border-color: #3b82f6;
  }
  
  .version-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .version-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .version-number {
    font-weight: 600;
    color: #111827;
  }
  
  .current-badge {
    padding: 0.125rem 0.5rem;
    background: #10b981;
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .version-date {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .version-meta {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    color: #6b7280;
    flex-wrap: wrap;
  }
  
  .meta-item.commit-message {
    display: block;
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
    font-style: italic;
  }
  
  .version-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .action-btn {
    padding: 0.375rem 0.75rem;
    border: 1px solid #e5e7eb;
    background: white;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .action-btn:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
  }
  
  .action-btn.restore {
    border-color: #10b981;
    color: #10b981;
  }
  
  .action-btn.restore:hover {
    background: #ecfdf5;
  }
  
  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .compare-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .compare-version {
    text-align: center;
  }
  
  .compare-version h3 {
    margin: 0 0 0.25rem;
    font-size: 1.125rem;
    color: #111827;
  }
  
  .compare-version span {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .compare-arrow {
    font-size: 1.5rem;
    color: #6b7280;
  }
  
  .diff-list {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
  
  .no-changes {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }
  
  .diff-item {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .diff-field {
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.5rem;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 0.875rem;
  }
  
  .diff-values {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .old-value, .new-value {
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .old-value {
    background: #fee2e2;
    border: 1px solid #fca5a5;
  }
  
  .new-value {
    background: #dcfce7;
    border: 1px solid #86efac;
  }
  
  .label {
    font-weight: 600;
    color: #374151;
    margin-right: 0.5rem;
  }
  
  .value {
    font-family: 'Monaco', 'Courier New', monospace;
    color: #111827;
    word-break: break-all;
  }
  
  @media (prefers-color-scheme: dark) {
    .modal-content {
      background: #1f2937;
    }
    
    .modal-header {
      border-bottom-color: #374151;
    }
    
    .modal-header h2 {
      color: #f9fafb;
    }
    
    .close-btn {
      color: #9ca3af;
    }
    
    .close-btn:hover {
      background: #374151;
      color: #f9fafb;
    }
    
    .view-toggle {
      border-bottom-color: #374151;
    }
    
    .toggle-btn {
      color: #9ca3af;
    }
    
    .toggle-btn:hover:not(:disabled) {
      color: #f9fafb;
    }
    
    .version-item {
      background: #374151;
      border-color: #4b5563;
    }
    
    .version-item:hover {
      background: #4b5563;
      border-color: #6b7280;
    }
    
    .version-item.selected {
      background: #1e3a8a;
      border-color: #3b82f6;
    }
    
    .version-number {
      color: #f9fafb;
    }
    
    .version-date {
      color: #9ca3af;
    }
    
    .version-meta {
      color: #9ca3af;
    }
    
    .action-btn {
      background: #374151;
      border-color: #4b5563;
      color: #e5e7eb;
    }
    
    .action-btn:hover:not(:disabled) {
      background: #4b5563;
      border-color: #6b7280;
    }
    
    .compare-header {
      border-bottom-color: #374151;
    }
    
    .compare-version h3 {
      color: #f9fafb;
    }
    
    .compare-version span {
      color: #9ca3af;
    }
    
    .diff-item {
      background: #374151;
      border-color: #4b5563;
    }
    
    .diff-field {
      color: #f9fafb;
    }
    
    .old-value {
      background: #7f1d1d;
      border-color: #991b1b;
    }
    
    .new-value {
      background: #14532d;
      border-color: #166534;
    }
    
    .label {
      color: #d1d5db;
    }
    
    .value {
      color: #f9fafb;
    }
  }
</style>