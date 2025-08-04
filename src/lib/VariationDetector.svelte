<script>
  import { onMount } from 'svelte';
  import { 
    findVariations, 
    clusterVariations, 
    suggestMerges, 
    getVariationStats,
    calculateIngredientSimilarity 
  } from './variationDetection.js';
  import { ingredientService } from './firebaseDataService.js';
  
  let {
    isOpen = $bindable(false),
    targetIngredient = null,
    onMerge = () => {},
    onClose = () => {}
  } = $props();
  
  let loading = $state(true);
  let variations = $state([]);
  let clusters = $state([]);
  let mergeSuggestions = $state([]);
  let stats = $state(null);
  let viewMode = $state('variations'); // 'variations', 'clusters', 'merge'
  let selectedVariations = $state(new Set());
  let similarityThreshold = $state(0.7);
  
  $effect(() => {
    if (isOpen) {
      loadVariations();
    }
  });
  
  async function loadVariations() {
    loading = true;
    try {
      // Get all ingredients
      const allIngredients = await ingredientService.getAllIngredients();
      
      if (targetIngredient) {
        // Find variations of specific ingredient
        variations = findVariations(targetIngredient, allIngredients, similarityThreshold);
      } else {
        // Find all variation clusters
        clusters = clusterVariations(allIngredients, similarityThreshold);
        mergeSuggestions = suggestMerges(allIngredients);
      }
      
      // Calculate statistics
      stats = getVariationStats(allIngredients);
    } catch (error) {
      console.error('Error loading variations:', error);
    } finally {
      loading = false;
    }
  }
  
  function handleThresholdChange(e) {
    similarityThreshold = parseFloat(e.target.value);
    loadVariations();
  }
  
  function toggleVariationSelection(variationId) {
    const newSet = new Set(selectedVariations);
    if (newSet.has(variationId)) {
      newSet.delete(variationId);
    } else {
      newSet.add(variationId);
    }
    selectedVariations = newSet;
  }
  
  function handleMergeSelected() {
    if (selectedVariations.size === 0) return;
    
    const selectedIngredients = Array.from(selectedVariations).map(id => 
      variations.find(v => v.ingredient.id === id)?.ingredient
    ).filter(Boolean);
    
    if (selectedIngredients.length > 0) {
      onMerge(targetIngredient, selectedIngredients);
      isOpen = false;
    }
  }
  
  function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
  }
  
  function getSimilarityColor(similarity) {
    if (similarity >= 0.9) return '#22c55e'; // green
    if (similarity >= 0.8) return '#eab308'; // yellow
    if (similarity >= 0.7) return '#f97316'; // orange
    return '#ef4444'; // red
  }
</script>

{#if isOpen}
  <div class="modal-overlay" onclick={() => isOpen = false}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>
          {targetIngredient ? `Variations of "${targetIngredient.name}"` : 'Ingredient Variations'}
        </h2>
        <button class="close-btn" onclick={() => isOpen = false}>×</button>
      </div>
      
      {#if stats}
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-label">Total Ingredients:</span>
            <span class="stat-value">{stats.totalIngredients}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Variation Groups:</span>
            <span class="stat-value">{stats.variationClusters}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Merge Candidates:</span>
            <span class="stat-value">{stats.mergeCandidates}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Potential Reduction:</span>
            <span class="stat-value">-{stats.potentialReduction}</span>
          </div>
        </div>
      {/if}
      
      <div class="controls">
        <div class="view-tabs">
          {#if targetIngredient}
            <button 
              class="tab {viewMode === 'variations' ? 'active' : ''}"
              onclick={() => viewMode = 'variations'}
            >
              Variations
            </button>
          {:else}
            <button 
              class="tab {viewMode === 'clusters' ? 'active' : ''}"
              onclick={() => viewMode = 'clusters'}
            >
              All Clusters
            </button>
            <button 
              class="tab {viewMode === 'merge' ? 'active' : ''}"
              onclick={() => viewMode = 'merge'}
            >
              Merge Suggestions
            </button>
          {/if}
        </div>
        
        <div class="threshold-control">
          <label>
            Similarity Threshold:
            <input 
              type="range" 
              min="0.5" 
              max="0.95" 
              step="0.05"
              value={similarityThreshold}
              onchange={handleThresholdChange}
            />
            <span class="threshold-value">{formatPercent(similarityThreshold)}</span>
          </label>
        </div>
      </div>
      
      <div class="content">
        {#if loading}
          <div class="loading">Analyzing variations...</div>
        {:else if viewMode === 'variations' && targetIngredient}
          {#if variations.length === 0}
            <div class="empty-state">
              No variations found with similarity ≥ {formatPercent(similarityThreshold)}
            </div>
          {:else}
            <div class="variations-list">
              {#each variations as variation}
                <div class="variation-item">
                  <input 
                    type="checkbox"
                    checked={selectedVariations.has(variation.ingredient.id)}
                    onchange={() => toggleVariationSelection(variation.ingredient.id)}
                  />
                  <div class="variation-info">
                    <div class="variation-name">
                      {variation.ingredient.name}
                    </div>
                    <div class="variation-meta">
                      {#if variation.ingredient.healthSystem}
                        <span class="meta-badge">{variation.ingredient.healthSystem}</span>
                      {/if}
                      {#if variation.ingredient.category}
                        <span class="meta-badge">{variation.ingredient.category}</span>
                      {/if}
                    </div>
                  </div>
                  <div 
                    class="similarity-badge"
                    style="background-color: {getSimilarityColor(variation.similarity)}"
                  >
                    {variation.similarityPercent}%
                  </div>
                </div>
              {/each}
            </div>
            
            {#if selectedVariations.size > 0}
              <div class="actions">
                <button class="merge-btn" onclick={handleMergeSelected}>
                  Merge {selectedVariations.size} Selected Variation{selectedVariations.size > 1 ? 's' : ''}
                </button>
              </div>
            {/if}
          {/if}
        {:else if viewMode === 'clusters'}
          {#if clusters.length === 0}
            <div class="empty-state">No variation clusters found</div>
          {:else}
            <div class="clusters-list">
              {#each clusters as cluster}
                <div class="cluster-item">
                  <div class="cluster-header">
                    <h3>{cluster.primary.name}</h3>
                    <span class="cluster-count">{cluster.totalCount} items</span>
                  </div>
                  <div class="cluster-variations">
                    {#each cluster.variations.slice(0, 3) as variation}
                      <div class="cluster-variation">
                        <span>{variation.ingredient.name}</span>
                        <span class="similarity">{variation.similarityPercent}%</span>
                      </div>
                    {/each}
                    {#if cluster.variations.length > 3}
                      <div class="more">+{cluster.variations.length - 3} more</div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {:else if viewMode === 'merge'}
          {#if mergeSuggestions.length === 0}
            <div class="empty-state">No merge suggestions at current threshold</div>
          {:else}
            <div class="merge-list">
              {#each mergeSuggestions as suggestion}
                <div class="merge-suggestion">
                  <div class="merge-header">
                    <h3>{suggestion.primary.name}</h3>
                    <span class="merge-reason">{suggestion.reason}</span>
                  </div>
                  <div class="merge-items">
                    <div class="merge-arrow">Can merge with:</div>
                    {#each suggestion.variations as variation}
                      <div class="merge-item">
                        <span>{variation.ingredient.name}</span>
                        <span class="similarity-pill" 
                          style="background: {getSimilarityColor(variation.similarity)}">
                          {variation.similarityPercent}%
                        </span>
                      </div>
                    {/each}
                  </div>
                  <button 
                    class="merge-action-btn"
                    onclick={() => onMerge(suggestion.primary, suggestion.variations.map(v => v.ingredient))}
                  >
                    Merge All ({suggestion.totalCount} items)
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
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
    z-index: 10000;
  }
  
  .modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 900px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }
  
  .close-btn:hover {
    background: #f0f0f0;
  }
  
  .stats-bar {
    display: flex;
    gap: 2rem;
    padding: 1rem 1.5rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .stat-label {
    color: #666;
    font-size: 0.875rem;
  }
  
  .stat-value {
    font-weight: 600;
    color: #333;
  }
  
  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .view-tabs {
    display: flex;
    gap: 0.5rem;
  }
  
  .tab {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .tab:hover {
    background: #f0f0f0;
  }
  
  .tab.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }
  
  .threshold-control {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .threshold-control label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .threshold-control input[type="range"] {
    width: 120px;
  }
  
  .threshold-value {
    font-weight: 600;
    min-width: 40px;
  }
  
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
  
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #666;
  }
  
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #999;
    font-style: italic;
  }
  
  .variations-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .variation-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 2px solid transparent;
    transition: all 0.2s;
  }
  
  .variation-item:hover {
    border-color: #007bff;
  }
  
  .variation-info {
    flex: 1;
  }
  
  .variation-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  
  .variation-meta {
    display: flex;
    gap: 0.5rem;
  }
  
  .meta-badge {
    padding: 0.125rem 0.5rem;
    background: #e0e0e0;
    border-radius: 12px;
    font-size: 0.75rem;
  }
  
  .similarity-badge {
    padding: 0.5rem 0.75rem;
    color: white;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .clusters-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .cluster-item {
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }
  
  .cluster-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .cluster-header h3 {
    margin: 0;
    font-size: 1.125rem;
  }
  
  .cluster-count {
    padding: 0.25rem 0.75rem;
    background: #007bff;
    color: white;
    border-radius: 12px;
    font-size: 0.875rem;
  }
  
  .cluster-variations {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-left: 1rem;
  }
  
  .cluster-variation {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }
  
  .similarity {
    color: #666;
    font-weight: 600;
  }
  
  .more {
    color: #666;
    font-style: italic;
    font-size: 0.875rem;
  }
  
  .merge-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .merge-suggestion {
    padding: 1.5rem;
    background: #fff8dc;
    border: 2px solid #ffd700;
    border-radius: 8px;
  }
  
  .merge-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .merge-header h3 {
    margin: 0;
  }
  
  .merge-reason {
    padding: 0.25rem 0.75rem;
    background: #ffd700;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .merge-items {
    margin-bottom: 1rem;
  }
  
  .merge-arrow {
    color: #666;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  
  .merge-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  
  .similarity-pill {
    padding: 0.25rem 0.5rem;
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
  }
  
  .merge-btn,
  .merge-action-btn {
    padding: 0.75rem 1.5rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .merge-btn:hover,
  .merge-action-btn:hover {
    background: #218838;
  }
</style>