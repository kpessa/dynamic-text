<script>
  import { onMount } from 'svelte';
  import {
    findSharingCandidates,
    createSharedIngredient,
    addToSharedIngredient,
    removeFromSharedIngredient,
    isIngredientShared,
    makeIndependentCopy
  } from './sharedIngredientService.js';
  
  let { ingredientId = null, ingredientName = '', onClose = () => {} } = $props();
  
  let candidates = $state([]);
  let loading = $state(true);
  let error = $state(null);
  let currentSharedStatus = $state(null);
  let selectedReferences = $state(new Set());
  let actionInProgress = $state(false);
  
  onMount(async () => {
    await loadData();
  });
  
  async function loadData() {
    loading = true;
    error = null;
    
    try {
      // Check current shared status
      currentSharedStatus = await isIngredientShared(ingredientId);
      
      // Find sharing candidates
      candidates = await findSharingCandidates(ingredientId);
      
      console.log('Sharing candidates:', candidates);
      console.log('Current shared status:', currentSharedStatus);
    } catch (err) {
      console.error('Error loading sharing data:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  function toggleReference(ingredientId, configId) {
    const key = `${ingredientId}:${configId}`;
    if (selectedReferences.has(key)) {
      selectedReferences.delete(key);
    } else {
      selectedReferences.add(key);
    }
    selectedReferences = new Set(selectedReferences);
  }
  
  async function shareSelected() {
    if (selectedReferences.size === 0) {
      alert('Please select at least one reference to share');
      return;
    }
    
    actionInProgress = true;
    error = null;
    
    try {
      // Collect selected references
      const references = [];
      for (const key of selectedReferences) {
        const [refIngredientId, configId] = key.split(':');
        
        // Find the reference in candidates
        for (const candidate of candidates) {
          if (candidate.ingredientId === refIngredientId) {
            const ref = candidate.references.find(r => r.id === configId);
            if (ref) {
              references.push({
                ingredientId: refIngredientId,
                configId: configId,
                healthSystem: ref.healthSystem,
                domain: ref.domain,
                subdomain: ref.subdomain,
                version: ref.version
              });
            }
          }
        }
      }
      
      if (currentSharedStatus?.isShared && currentSharedStatus?.sharedIngredientId) {
        // Add to existing shared ingredient
        for (const ref of references) {
          await addToSharedIngredient(currentSharedStatus.sharedIngredientId, ref);
        }
      } else {
        // Create new shared ingredient
        await createSharedIngredient(ingredientId, references);
      }
      
      // Reload data
      await loadData();
      selectedReferences.clear();
      
      alert(`Successfully shared ${references.length} reference(s)`);
    } catch (err) {
      console.error('Error sharing ingredients:', err);
      error = err.message;
    } finally {
      actionInProgress = false;
    }
  }
  
  async function unshareReference(refIngredientId, configId) {
    if (!confirm('Are you sure you want to unshare this reference? It will become independent.')) {
      return;
    }
    
    actionInProgress = true;
    error = null;
    
    try {
      if (currentSharedStatus?.sharedIngredientId) {
        await removeFromSharedIngredient(currentSharedStatus.sharedIngredientId, {
          ingredientId: refIngredientId,
          configId: configId
        });
      }
      
      // Reload data
      await loadData();
      
      alert('Reference has been unshared and is now independent');
    } catch (err) {
      console.error('Error unsharing reference:', err);
      error = err.message;
    } finally {
      actionInProgress = false;
    }
  }
  
  async function makeIndependent() {
    if (!confirm('Are you sure you want to make this ingredient independent? It will no longer be shared with other configs.')) {
      return;
    }
    
    actionInProgress = true;
    error = null;
    
    try {
      // This would need the current config context
      // For now, we'll just show the concept
      alert('To make a specific reference independent, use the unshare button next to it');
    } catch (err) {
      console.error('Error making independent:', err);
      error = err.message;
    } finally {
      actionInProgress = false;
    }
  }
</script>

<div class="modal-backdrop">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Manage Shared Ingredient: {ingredientName}</h2>
      <button class="close-btn" onclick={onClose}>×</button>
    </div>
    
    <div class="modal-body">
      {#if loading}
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading sharing information...</p>
        </div>
      {:else if error}
        <div class="error">
          <p>Error: {error}</p>
          <button onclick={() => loadData()}>Retry</button>
        </div>
      {:else}
        <div class="status-section">
          <h3>Current Status</h3>
          {#if currentSharedStatus?.isShared}
            <div class="status shared">
              <span class="icon">🔗</span>
              <div>
                <strong>Shared Ingredient</strong>
                {#if currentSharedStatus.sharedCount}
                  <p>Shared across {currentSharedStatus.sharedCount} configurations</p>
                {/if}
              </div>
              {#if !actionInProgress}
                <button class="btn-secondary" onclick={makeIndependent}>
                  Make Independent
                </button>
              {/if}
            </div>
          {:else}
            <div class="status not-shared">
              <span class="icon">📄</span>
              <div>
                <strong>Independent Ingredient</strong>
                <p>Not currently shared with other configurations</p>
              </div>
            </div>
          {/if}
        </div>
        
        {#if candidates.length > 0}
          <div class="candidates-section">
            <h3>Identical Ingredients Found</h3>
            <p class="description">
              These ingredients have identical content and can be shared:
            </p>
            
            <div class="candidates-list">
              {#each candidates as candidate}
                <div class="candidate-group">
                  <div class="candidate-header">
                    <strong>{candidate.ingredientName}</strong>
                    {#if candidate.isShared}
                      <span class="shared-badge">Already Shared</span>
                    {/if}
                  </div>
                  
                  <div class="references-list">
                    {#each candidate.references as ref}
                      <div class="reference-item">
                        <label class="checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedReferences.has(`${candidate.ingredientId}:${ref.id}`)}
                            onchange={() => toggleReference(candidate.ingredientId, ref.id)}
                            disabled={actionInProgress || (candidate.isShared && candidate.sharedIngredientId === currentSharedStatus?.sharedIngredientId)}
                          />
                          <div class="reference-info">
                            <span class="config-name">{ref.name || ref.id}</span>
                            <span class="config-meta">
                              {ref.healthSystem} / {ref.domain} / {ref.subdomain} / {ref.version}
                            </span>
                          </div>
                        </label>
                        
                        {#if candidate.isShared && candidate.sharedIngredientId === currentSharedStatus?.sharedIngredientId}
                          <button
                            class="unshare-btn"
                            onclick={() => unshareReference(candidate.ingredientId, ref.id)}
                            disabled={actionInProgress}
                            title="Unshare this reference"
                          >
                            ✂️
                          </button>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="no-candidates">
            <p>No identical ingredients found in other configurations.</p>
            <p class="hint">Ingredients must have exactly the same content to be shared.</p>
          </div>
        {/if}
      {/if}
    </div>
    
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick={onClose}>Close</button>
      {#if !loading && !error && selectedReferences.size > 0}
        <button 
          class="btn btn-primary" 
          onclick={shareSelected}
          disabled={actionInProgress}
        >
          {actionInProgress ? 'Sharing...' : `Share ${selectedReferences.size} Selected`}
        </button>
      {/if}
    </div>
  </div>
</div>

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
    max-width: 900px;
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
  }
  
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error {
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 4px;
    padding: 20px;
    text-align: center;
  }
  
  .error p {
    color: #c00;
    margin: 0 0 10px 0;
  }
  
  .status-section {
    margin-bottom: 25px;
  }
  
  .status-section h3 {
    color: #333;
    font-size: 16px;
    margin: 0 0 12px 0;
  }
  
  .status {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    border-radius: 6px;
    background: #f8f9fa;
  }
  
  .status.shared {
    background: #e8f5e9;
    border: 1px solid #4caf50;
  }
  
  .status.not-shared {
    background: #fff3e0;
    border: 1px solid #ff9800;
  }
  
  .status .icon {
    font-size: 24px;
  }
  
  .status div {
    flex: 1;
  }
  
  .status strong {
    display: block;
    margin-bottom: 4px;
    color: #333;
  }
  
  .status p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
  
  .candidates-section {
    margin-bottom: 20px;
  }
  
  .candidates-section h3 {
    color: #333;
    font-size: 16px;
    margin: 0 0 8px 0;
  }
  
  .description {
    color: #666;
    font-size: 14px;
    margin: 0 0 15px 0;
  }
  
  .candidates-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .candidate-group {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .candidate-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .shared-badge {
    background: #4caf50;
    color: white;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 12px;
  }
  
  .references-list {
    padding: 10px;
  }
  
  .reference-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  .reference-item:hover {
    background: #f8f9fa;
  }
  
  .checkbox-label {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }
  
  .reference-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .config-name {
    font-weight: 500;
    color: #333;
    font-size: 14px;
  }
  
  .config-meta {
    color: #666;
    font-size: 12px;
  }
  
  .unshare-btn {
    background: none;
    border: 1px solid #dc3545;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.2s;
  }
  
  .unshare-btn:hover {
    background: #fee;
  }
  
  .unshare-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .no-candidates {
    text-align: center;
    padding: 40px;
    background: #f8f9fa;
    border-radius: 6px;
  }
  
  .no-candidates p {
    margin: 0 0 10px 0;
    color: #666;
  }
  
  .hint {
    font-size: 14px;
    color: #999;
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
  
  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }
  
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  
  .btn-secondary:hover {
    background: #5a6268;
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>