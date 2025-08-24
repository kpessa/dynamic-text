<script>
  import { logError } from '$lib/logger';
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
      logError('NavbarActions: Error in onNewDocument:', error);
    }
  }
  
  function handleSave() {
    try {
      // console.log('NavbarActions: Save clicked');
      onSave();
    } catch (error) {
      logError('NavbarActions: Error in onSave:', error);
    }
  }
  
  function handleExport() {
    try {
      // console.log('NavbarActions: Export clicked');
      onExport();
    } catch (error) {
      logError('NavbarActions: Error in onExport:', error);
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
  
</script>

<div class="flex gap-2 items-center">
  <button 
    class="btn variant-soft-tertiary hover:variant-filled-tertiary"
    onclick={handleNewDocument}
    title="Create new document"
    aria-label="Create new document"
  >
    <Icons icon="new-document" size={18} />
    <span class="hidden sm:inline ml-2">New</span>
  </button>
  
  <button 
    class="btn {hasUnsavedChanges ? 'variant-filled-primary' : 'variant-soft-success'} {hasUnsavedChanges ? 'animate-pulse' : ''}"
    onclick={handleSave}
    disabled={!hasUnsavedChanges}
    title={hasUnsavedChanges ? 'Save changes' : 'No changes to save'}
    aria-label="Save document"
  >
    <Icons icon={hasUnsavedChanges ? 'save' : 'check'} size={18} />
    <span class="hidden sm:inline ml-2">{getSaveButtonText()}</span>
  </button>
  
  <button 
    class="btn {copied ? 'variant-filled-success' : 'variant-soft-secondary'} transition-all"
    onclick={handleExport}
    title="Export to clipboard"
    aria-label="Export document to clipboard"
  >
    <Icons icon={copied ? 'check' : 'export'} size={18} />
    <span class="hidden sm:inline ml-2">{copied ? 'Copied!' : 'Export'}</span>
  </button>
</div>

