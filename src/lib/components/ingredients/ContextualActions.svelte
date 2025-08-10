<script>
  import { scale } from 'svelte/transition';
  
  let {
    selectionMode = false,
    selectedCount = 0,
    onToggleSelection = () => {},
    onBulkOperations = () => {},
    onSelectAll = () => {},
    onClearSelection = () => {}
  } = $props();
  
  let expanded = $state(false);
  
  function toggleExpanded() {
    expanded = !expanded;
  }
</script>

<!-- Main FAB -->
<div class="fab-container">
  {#if selectionMode && selectedCount > 0}
    <!-- Selection Actions -->
    <div class="selection-actions" transition:scale={{ duration: 200 }}>
      <button 
        class="fab-action"
        onclick={onClearSelection}
        title="Clear selection"
      >
        ✕ Clear
      </button>
      <button 
        class="fab-action primary"
        onclick={onBulkOperations}
        title="Bulk operations"
      >
        ⚙️ Actions ({selectedCount})
      </button>
    </div>
  {:else}
    <!-- Default FAB -->
    <button 
      class="fab-main"
      onclick={toggleExpanded}
      title="Actions"
    >
      <span class="fab-icon">{expanded ? '✕' : '+'}</span>
    </button>
    
    {#if expanded}
      <!-- Expanded Actions -->
      <div class="fab-actions" transition:scale={{ duration: 200 }}>
        <button 
          class="fab-secondary"
          onclick={() => {
            onToggleSelection();
            expanded = false;
          }}
          title="Select items"
        >
          ☐
        </button>
        <button 
          class="fab-secondary"
          onclick={onSelectAll}
          title="Select all"
        >
          ☑
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  @import '../../styles/ingredientDesignSystem.css';
  
  .fab-container {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    z-index: 90;
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: var(--space-3);
  }
  
  /* Main FAB Button */
  .fab-main {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, 
      rgb(var(--color-primary-rgb)), 
      rgba(var(--color-primary-rgb), 0.8)
    );
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    box-shadow: 
      var(--shadow-elevation-high),
      0 0 20px rgba(var(--color-primary-rgb), 0.3);
    transition: all var(--duration-base) var(--ease-out);
  }
  
  .fab-main:hover {
    transform: scale(1.1);
    box-shadow: 
      var(--shadow-elevation-high),
      0 0 30px rgba(var(--color-primary-rgb), 0.5);
  }
  
  .fab-main:active {
    transform: scale(0.95);
  }
  
  .fab-icon {
    transition: transform var(--duration-base) var(--ease-out);
  }
  
  .fab-main:hover .fab-icon {
    transform: rotate(90deg);
  }
  
  /* Secondary FAB Actions */
  .fab-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  
  .fab-secondary {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    background: var(--glass-bg-heavy);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    color: var(--color-text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    box-shadow: var(--shadow-elevation-medium);
    transition: all var(--duration-base) var(--ease-out);
  }
  
  .fab-secondary:hover {
    transform: translateX(-4px);
    background: var(--color-surface);
    box-shadow: var(--shadow-elevation-high);
  }
  
  /* Selection Actions */
  .selection-actions {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--glass-bg-heavy);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-elevation-high);
  }
  
  .fab-action {
    padding: var(--space-2) var(--space-4);
    border: none;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--duration-base) var(--ease-out);
    white-space: nowrap;
  }
  
  .fab-action:hover {
    background: var(--color-surface-hover);
  }
  
  .fab-action.primary {
    background: rgb(var(--color-primary-rgb));
    color: white;
  }
  
  .fab-action.primary:hover {
    background: rgba(var(--color-primary-rgb), 0.9);
  }
  
  /* Dark Theme */
  :global([data-theme="dark"]) .fab-secondary,
  :global([data-theme="dark"]) .selection-actions {
    background: rgba(31, 41, 55, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  /* Mobile adjustments */
  @media (max-width: 640px) {
    .fab-container {
      bottom: var(--space-4);
      right: var(--space-4);
    }
  }
</style>