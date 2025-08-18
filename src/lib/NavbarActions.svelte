import { logError } from '$lib/logger';
<script>
  import Icons from './Icons.svelte';
  
  let {
    hasUnsavedChanges = false,
    lastSavedTime = null,
    copied = false,
    onNewDocument = () => {},
    onSave = () => {},
    onExport = () => {}
  } = $props();
  
  // Wrapper functions with error logging
  function handleNewDocument() {
    try {
      // console.log('NavbarActions: New Document clicked');
      onNewDocument();
    } catch (error) {
      // logError('NavbarActions: Error in onNewDocument:', error);
    }
  }
  
  function handleSave() {
    try {
      // console.log('NavbarActions: Save clicked');
      onSave();
    } catch (error) {
      // logError('NavbarActions: Error in onSave:', error);
    }
  }
  
  function handleExport() {
    try {
      // console.log('NavbarActions: Export clicked');
      onExport();
    } catch (error) {
      // logError('NavbarActions: Error in onExport:', error);
    }
  }
  
  function formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  function getSaveButtonText() {
    if (hasUnsavedChanges) return 'Save';
    if (lastSavedTime) return `Saved ${formatTime(lastSavedTime)}`;
    return 'Save';
  }
  
  function getSaveButtonClass() {
    if (hasUnsavedChanges) return 'action-btn save-btn unsaved';
    return 'action-btn save-btn';
  }
</script>

<div class="navbar-actions">
  <button 
    class="action-btn new-btn"
    onclick={handleNewDocument}
    title="Create new document"
    aria-label="Create new document"
  >
    <span class="btn-icon"><Icons icon="new-document" size={18} /></span>
    <span class="btn-text">New</span>
  </button>
  
  <button 
    class={getSaveButtonClass()}
    onclick={handleSave}
    disabled={!hasUnsavedChanges}
    title={hasUnsavedChanges ? 'Save changes' : 'No changes to save'}
    aria-label="Save document"
  >
    <span class="btn-icon"><Icons icon={hasUnsavedChanges ? 'save' : 'check'} size={18} /></span>
    <span class="btn-text">{getSaveButtonText()}</span>
  </button>
  
  <button 
    class="action-btn export-btn {copied ? 'copied' : ''}"
    onclick={handleExport}
    title="Export to clipboard"
    aria-label="Export document to clipboard"
  >
    <span class="btn-icon"><Icons icon={copied ? 'check' : 'export'} size={18} /></span>
    <span class="btn-text">{copied ? 'Copied!' : 'Export'}</span>
  </button>
</div>

<style>
  .navbar-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-background);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
    min-height: 40px; /* Desktop standard */
  }
  
  .action-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
    background: var(--color-surface-hover);
  }
  
  .action-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Button variants */
  .new-btn {
    background: var(--color-info-50);
    border-color: var(--color-info-200);
    color: var(--color-info-900);
  }
  
  .new-btn:hover:not(:disabled) {
    background: var(--color-info-100);
    border-color: var(--color-info-300);
  }
  
  .save-btn {
    background: var(--color-success-50);
    border-color: var(--color-success-200);
    color: var(--color-success-900);
  }
  
  .save-btn:hover:not(:disabled) {
    background: var(--color-success-100);
    border-color: var(--color-success-300);
  }
  
  .save-btn.unsaved {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
    animation: pulse-glow 2s infinite;
  }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb), 0.4); }
    50% { box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb), 0.2); }
  }
  
  .export-btn {
    background: var(--color-secondary-50);
    border-color: var(--color-secondary-200);
    color: var(--color-secondary-900);
  }
  
  .export-btn:hover:not(:disabled) {
    background: var(--color-secondary-100);
    border-color: var(--color-secondary-300);
  }
  
  .export-btn.copied {
    background: var(--color-success);
    border-color: var(--color-success);
    color: white;
    animation: success-bounce 0.5s ease-out;
  }
  
  @keyframes success-bounce {
    0%, 100% { transform: scale(1); }
    25% { transform: scale(0.95); }
    50% { transform: scale(1.05); }
  }
  
  .btn-icon {
    font-size: 1rem;
    display: inline-flex;
    align-items: center;
  }
  
  .btn-text {
    font-size: var(--font-size-sm);
  }
  
  /* Mobile adjustments */
  @media (max-width: 768px) {
    .navbar-actions {
      gap: 0.25rem;
    }
    
    .action-btn {
      min-height: 44px; /* iOS standard */
      padding: 0.5rem 0.75rem;
    }
    
    .btn-text {
      display: none; /* Icons only on mobile */
    }
    
    .btn-icon {
      font-size: 1.25rem;
    }
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .action-btn {
      border-width: 2px;
    }
    
    .action-btn:focus {
      outline: 3px solid var(--color-focus);
      outline-offset: 2px;
    }
  }
</style>