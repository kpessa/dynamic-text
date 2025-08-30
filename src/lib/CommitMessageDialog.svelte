<script>
  let {
    isOpen = $bindable(false),
    onConfirm = () => {},
    onCancel = () => {},
    title = 'Save Changes',
    defaultMessage = '',
    showOptionalNote = true
  } = $props();
  
  let commitMessage = $state(defaultMessage);
  let textareaRef = $state(null);
  
  // Focus textarea when dialog opens
  $effect(() => {
    if (isOpen && textareaRef) {
      setTimeout(() => {
        textareaRef.focus();
        textareaRef.select();
      }, 50);
    }
  });
  
  // Reset message when dialog closes
  $effect(() => {
    if (!isOpen) {
      commitMessage = defaultMessage;
    }
  });
  
  function handleConfirm() {
    onConfirm(commitMessage || null);
    isOpen = false;
    commitMessage = '';
  }
  
  function handleCancel() {
    onCancel();
    isOpen = false;
    commitMessage = '';
  }
  
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleConfirm();
    }
  }
</script>

{#if isOpen}
  <div 
    class="modal-overlay" 
    onclick={handleCancel}
    onkeydown={handleKeydown}
    role="button"
    tabindex="-1"
  >
    <div 
      class="modal-content" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="commit-dialog-title"
      tabindex="0"
    >
      <h2 id="commit-dialog-title">{title}</h2>
      
      <div class="message-container">
        <label for="commit-message">
          Commit Message
          {#if showOptionalNote}
            <span class="optional">(optional)</span>
          {/if}
        </label>
        <textarea
          id="commit-message"
          bind:this={textareaRef}
          bind:value={commitMessage}
          placeholder="Describe what changed and why..."
          rows="4"
          onkeydown={(e) => {
            // Allow Enter in textarea, only Ctrl/Cmd+Enter submits
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleConfirm();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancel();
            }
          }}
        />
        <div class="hint">
          Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to save, <kbd>Esc</kbd> to cancel
        </div>
      </div>
      
      <div class="actions">
        <button class="btn-primary" onclick={handleConfirm}>
          Save
        </button>
        <button class="btn-secondary" onclick={handleCancel}>
          Cancel
        </button>
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
    animation: fadeIn 0.2s ease-out;
  }
  
  .modal-content {
    background: var(--color-bg, white);
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.2s ease-out;
  }
  
  h2 {
    margin: 0 0 20px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text, #333);
  }
  
  .message-container {
    margin-bottom: 24px;
  }
  
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--color-text, #333);
  }
  
  .optional {
    font-size: 0.875rem;
    color: var(--color-text-secondary, #666);
    font-weight: normal;
  }
  
  textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    min-height: 100px;
    background: var(--color-input-bg, white);
    color: var(--color-text, #333);
  }
  
  textarea:focus {
    outline: none;
    border-color: var(--color-primary, #007bff);
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  
  .hint {
    margin-top: 8px;
    font-size: 0.875rem;
    color: var(--color-text-secondary, #666);
  }
  
  kbd {
    padding: 2px 6px;
    background: var(--color-kbd-bg, #f4f4f4);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.875em;
  }
  
  .actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
  
  button {
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
  }
  
  .btn-primary {
    background: var(--color-primary, #007bff);
    color: white;
    border: none;
  }
  
  .btn-primary:hover {
    background: var(--color-primary-hover, #0056b3);
  }
  
  .btn-secondary {
    background: transparent;
    color: var(--color-text, #333);
    border: 1px solid var(--color-border, #ddd);
  }
  
  .btn-secondary:hover {
    background: var(--color-hover-bg, #f8f8f8);
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @media (max-width: 600px) {
    .modal-content {
      width: 95%;
      padding: 20px;
    }
  }
</style>