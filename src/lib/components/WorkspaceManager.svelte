import { logError } from '$lib/logger';
<script lang="ts">
  import { workspaceStore } from '../../stores/workspaceStore.svelte';
  import { sectionStore } from '../../stores/sectionStore.svelte';
  import { eventBus } from '../utils/eventBus';
  import type { WorkspaceState } from '../types';
  
  interface Props {
    currentWorkspace?: WorkspaceState;
    firebaseEnabled?: boolean;
    currentIngredient?: string;
    onSave?: (commitMessage?: string) => Promise<void>;
    onClear?: () => void;
    onWorkspaceChange?: (workspace: WorkspaceState) => void;
  }
  
  let { 
    currentWorkspace = null,
    firebaseEnabled = false,
    currentIngredient = '',
    onSave = async () => {},
    onClear = () => {},
    onWorkspaceChange = () => {}
  }: Props = $props();
  
  // Local state
  let showCommitMessageDialog = $state(false);
  let commitMessage = $state('');
  let isSaving = $state(false);
  let hasUnsavedChanges = $state(false);
  
  // Auto-save timer
  let autoSaveTimer: number | null = null;
  const AUTO_SAVE_DELAY = 30000; // 30 seconds
  
  // Check for changes
  function checkForChanges() {
    const sections = sectionStore.getSections();
    const lastSaved = workspaceStore.getLastSavedState();
    hasUnsavedChanges = JSON.stringify(sections) !== JSON.stringify(lastSaved);
    
    // Start auto-save timer if there are changes
    if (hasUnsavedChanges && !autoSaveTimer) {
      autoSaveTimer = window.setTimeout(() => {
        handleAutoSave();
      }, AUTO_SAVE_DELAY);
    }
  }
  
  // Handle save with commit message
  async function handleSaveWithCommit() {
    if (firebaseEnabled && currentIngredient) {
      showCommitMessageDialog = true;
    } else {
      await saveCurrentWork();
    }
  }
  
  // Handle commit message confirmation
  async function handleCommitMessageConfirm() {
    showCommitMessageDialog = false;
    await saveCurrentWork(commitMessage);
    commitMessage = '';
  }
  
  // Save current work
  async function saveCurrentWork(message?: string) {
    if (isSaving) return;
    
    try {
      isSaving = true;
      
      // Clear auto-save timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }
      
      // Call parent save handler
      await onSave(message);
      
      // Update workspace state
      const sections = sectionStore.getSections();
      workspaceStore.saveState(sections);
      
      // Emit save event
      eventBus.emit('workspace:saved', { 
        timestamp: Date.now(),
        commitMessage: message,
        ingredient: currentIngredient
      });
      
      hasUnsavedChanges = false;
      
    } catch (error) {
      // logError('Failed to save workspace:', error);
      eventBus.emit('workspace:save-error', { error });
    } finally {
      isSaving = false;
    }
  }
  
  // Handle auto-save
  async function handleAutoSave() {
    if (hasUnsavedChanges && !isSaving) {
      await saveCurrentWork('[Auto-save]');
    }
    autoSaveTimer = null;
  }
  
  // Clear workspace
  function clearWorkspace() {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to clear the workspace?')) {
        return;
      }
    }
    
    // Clear auto-save timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    
    // Clear workspace
    workspaceStore.clearState();
    sectionStore.clearSections();
    hasUnsavedChanges = false;
    
    // Call parent clear handler
    onClear();
    
    // Emit clear event
    eventBus.emit('workspace:cleared', { timestamp: Date.now() });
  }
  
  // Handle keyboard shortcuts
  function handleKeyDown(e: KeyboardEvent) {
    // Cmd/Ctrl + S for save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSaveWithCommit();
    }
    
    // Cmd/Ctrl + Shift + S for save with message
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
      e.preventDefault();
      showCommitMessageDialog = true;
    }
  }
  
  // Listen for section changes
  $effect(() => {
    const unsubscribe = sectionStore.subscribe(() => {
      checkForChanges();
    });
    
    return unsubscribe;
  });
  
  // Listen for workspace events
  $effect(() => {
    const handlers = [
      eventBus.on('workspace:save-requested', handleSaveWithCommit),
      eventBus.on('workspace:clear-requested', clearWorkspace),
      eventBus.on('workspace:check-changes', checkForChanges)
    ];
    
    return () => handlers.forEach(h => h());
  });
  
  // Clean up on unmount
  $effect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  });
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- Workspace Status Bar -->
<div class="workspace-status">
  {#if hasUnsavedChanges}
    <span class="unsaved-indicator">● Unsaved changes</span>
  {/if}
  
  {#if isSaving}
    <span class="saving-indicator">Saving...</span>
  {/if}
  
  {#if firebaseEnabled && currentIngredient}
    <span class="ingredient-indicator">Working on: {currentIngredient}</span>
  {/if}
</div>

<!-- Commit Message Dialog -->
{#if showCommitMessageDialog}
  <div class="modal-backdrop">
    <div class="modal-content">
      <h3>Save Changes</h3>
      <p>Enter a commit message to describe your changes:</p>
      
      <textarea
        bind:value={commitMessage}
        placeholder="Describe what changed..."
        rows="4"
        autofocus
      />
      
      <div class="modal-actions">
        <button onclick={() => showCommitMessageDialog = false}>
          Cancel
        </button>
        <button 
          onclick={handleCommitMessageConfirm}
          disabled={!commitMessage.trim()}
          class="primary"
        >
          Save with Message
        </button>
        <button 
          onclick={() => { showCommitMessageDialog = false; saveCurrentWork(); }}
          class="secondary"
        >
          Save without Message
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .workspace-status {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    font-size: 0.875rem;
  }
  
  .unsaved-indicator {
    color: var(--color-warning);
    font-weight: 500;
  }
  
  .saving-indicator {
    color: var(--color-info);
    animation: pulse 1s infinite;
  }
  
  .ingredient-indicator {
    color: var(--color-text-muted);
  }
  
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
    background: var(--color-bg);
    border-radius: 8px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
  }
  
  .modal-content h3 {
    margin: 0 0 1rem 0;
  }
  
  .modal-content textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    margin-bottom: 1rem;
    resize: vertical;
  }
  
  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  
  button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    cursor: pointer;
  }
  
  button:hover:not(:disabled) {
    background: var(--color-bg-hover);
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  button.primary {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
  
  button.secondary {
    background: var(--color-secondary);
    color: white;
    border-color: var(--color-secondary);
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>