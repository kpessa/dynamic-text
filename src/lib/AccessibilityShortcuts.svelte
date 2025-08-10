<script>
  import { onMount, onDestroy } from 'svelte';
  import { focusManager, keyboardManager } from './utils/accessibility.js';
  
  let { isOpen = $bindable(false) } = $props();
  
  let modalElement = $state(null);
  let focusTrap = null;
  
  const shortcuts = $derived(keyboardManager.getShortcutsList());
  
  // Focus management
  $effect(() => {
    if (isOpen && modalElement) {
      focusTrap = focusManager.trapFocus(modalElement);
    } else if (focusTrap) {
      focusTrap();
      focusTrap = null;
    }
  });
  
  function handleClose() {
    isOpen = false;
  }
  
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }
  
  onDestroy(() => {
    if (focusTrap) {
      focusTrap();
    }
  });
</script>

{#if isOpen}
  <div 
    class="modal-backdrop" 
    onclick={handleClose}
    onkeydown={(e) => e.key === 'Enter' && handleClose()}
    role="button"
    tabindex="0"
    aria-label="Close shortcuts dialog"
  >
    <div 
      bind:this={modalElement}
      class="modal-content keyboard-shortcuts-modal" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      aria-describedby="shortcuts-description"
      tabindex="0">
    
      <div class="modal-header">
        <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
        <button 
          class="close-btn" 
          onclick={handleClose}
          aria-label="Close keyboard shortcuts dialog"
          data-close-modal
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      
      <div class="modal-body">
        <p id="shortcuts-description" class="shortcuts-intro">
          Use these keyboard shortcuts to navigate and interact with the TPN Dynamic Text Editor more efficiently.
        </p>
        
        <div class="shortcuts-section">
          <h3>Application Shortcuts</h3>
          <dl class="shortcuts-list">
            {#each shortcuts as shortcut}
              <div class="shortcut-item">
                <dt class="shortcut-keys">
                  <kbd>{shortcut.key}</kbd>
                </dt>
                <dd class="shortcut-description">{shortcut.description}</dd>
              </div>
            {/each}
          </dl>
        </div>
        
        <div class="shortcuts-section">
          <h3>Navigation Shortcuts</h3>
          <dl class="shortcuts-list">
            <div class="shortcut-item">
              <dt class="shortcut-keys"><kbd>TAB</kbd></dt>
              <dd class="shortcut-description">Navigate to next interactive element</dd>
            </div>
            <div class="shortcut-item">
              <dt class="shortcut-keys"><kbd>SHIFT + TAB</kbd></dt>
              <dd class="shortcut-description">Navigate to previous interactive element</dd>
            </div>
            <div class="shortcut-item">
              <dt class="shortcut-keys"><kbd>ENTER</kbd></dt>
              <dd class="shortcut-description">Activate buttons and links</dd>
            </div>
            <div class="shortcut-item">
              <dt class="shortcut-keys"><kbd>SPACE</kbd></dt>
              <dd class="shortcut-description">Activate buttons and checkboxes</dd>
            </div>
            <div class="shortcut-item">
              <dt class="shortcut-keys"><kbd>ESC</kbd></dt>
              <dd class="shortcut-description">Close modals and dropdowns</dd>
            </div>
          </dl>
        </div>
        
        <div class="shortcuts-section">
          <h3>TPN-Specific Shortcuts</h3>
          <dl class="shortcuts-list">
            <div class="shortcut-item">
              <dt class="shortcut-keys"><kbd>ALT + 1</kbd></dt>
              <dd class="shortcut-description">Jump to TPN input panel</dd>
            </div>
            <div class="shortcut-item">
              <dt class="shortcut-keys"><kbd>ALT + 2</kbd></dt>
              <dd class="shortcut-description">Jump to calculated values</dd>
            </div>
            <div class="shortcut-item">
              <dt class="shortcut-keys"><kbd>ALT + 3</kbd></dt>
              <dd class="shortcut-description">Jump to validation warnings</dd>
            </div>
          </dl>
        </div>
        
        <div class="shortcuts-section">
          <h3>Screen Reader Tips</h3>
          <ul class="tips-list">
            <li>Use heading navigation (H key in NVDA/JAWS) to quickly jump between sections</li>
            <li>Form fields are properly labeled with descriptions and units</li>
            <li>Validation errors are announced automatically</li>
            <li>Critical TPN warnings are announced with high priority</li>
            <li>Button roles clearly indicate available actions</li>
          </ul>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          class="btn btn-primary" 
          onclick={handleClose}
          autofocus
        >
          Got it
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .keyboard-shortcuts-modal {
    width: 800px;
    max-width: 90vw;
    max-height: 85vh;
  }
  
  .shortcuts-intro {
    margin-bottom: var(--spacing-lg);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }
  
  .shortcuts-section {
    margin-bottom: var(--spacing-xl);
  }
  
  .shortcuts-section h3 {
    margin-bottom: var(--spacing-md);
    color: var(--color-primary);
    border-bottom: 2px solid var(--color-border);
    padding-bottom: var(--spacing-sm);
  }
  
  .shortcuts-list {
    display: grid;
    gap: var(--spacing-md);
  }
  
  .shortcut-item {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--spacing-md);
    align-items: center;
    padding: var(--spacing-sm);
    border-radius: 6px;
    background: var(--color-border-light);
  }
  
  .shortcut-keys {
    min-width: 120px;
  }
  
  .shortcut-keys kbd {
    display: inline-block;
    padding: 4px 8px;
    margin: 0 2px;
    background: var(--color-background);
    border: 2px solid var(--color-border);
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .shortcut-description {
    color: var(--color-text);
    margin: 0;
  }
  
  .tips-list {
    list-style-type: disc;
    padding-left: var(--spacing-xl);
    color: var(--color-text-muted);
  }
  
  .tips-list li {
    margin-bottom: var(--spacing-sm);
    line-height: 1.6;
  }
  
  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: var(--color-danger);
    color: var(--color-danger-text);
    border-radius: 50%;
    font-size: var(--font-size-lg);
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .close-btn:hover {
    background: var(--color-danger-hover);
    transform: scale(1.1);
  }
  
  .close-btn:focus {
    outline: 3px solid var(--color-focus);
    outline-offset: 2px;
  }
  
  @media (max-width: 768px) {
    .keyboard-shortcuts-modal {
      width: 95vw;
      max-height: 95vh;
    }
    
    .shortcut-item {
      grid-template-columns: 1fr;
      text-align: center;
    }
    
    .shortcuts-section h3 {
      font-size: var(--font-size-lg);
    }
  }
</style>