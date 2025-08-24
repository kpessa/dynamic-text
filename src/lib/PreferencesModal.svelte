<script>
  let { 
    isOpen = false,
    onClose = () => {}
  } = $props();

  let theme = $state('light');
  let fontSize = $state('medium');
  let autoSave = $state(true);
  let showLineNumbers = $state(true);
  let enableSyntaxHighlighting = $state(true);
  let wrapLines = $state(false);

  function handleSave() {
    // Save preferences to localStorage
    const preferences = {
      theme,
      fontSize,
      autoSave,
      showLineNumbers,
      enableSyntaxHighlighting,
      wrapLines
    };
    
    localStorage.setItem('dynamicTextPreferences', JSON.stringify(preferences));
    
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    
    // Apply font size
    document.documentElement.style.setProperty('--editor-font-size', 
      fontSize === 'small' ? '12px' : 
      fontSize === 'large' ? '16px' : '14px'
    );
    
    onClose();
  }

  function loadPreferences() {
    try {
      const saved = localStorage.getItem('dynamicTextPreferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        theme = prefs.theme || 'light';
        fontSize = prefs.fontSize || 'medium';
        autoSave = prefs.autoSave ?? true;
        showLineNumbers = prefs.showLineNumbers ?? true;
        enableSyntaxHighlighting = prefs.enableSyntaxHighlighting ?? true;
        wrapLines = prefs.wrapLines ?? false;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  $effect(() => {
    if (isOpen) {
      loadPreferences();
    }
  });

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={onClose} onkeydown={handleKeydown}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Preferences</h2>
        <button class="modal-close" onclick={onClose}>×</button>
      </div>
      
      <div class="modal-body">
        <section class="pref-section">
          <h3>Appearance</h3>
          
          <div class="pref-item">
            <label for="theme">Theme</label>
            <select id="theme" bind:value={theme}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          
          <div class="pref-item">
            <label for="fontSize">Font Size</label>
            <select id="fontSize" bind:value={fontSize}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </section>
        
        <section class="pref-section">
          <h3>Editor</h3>
          
          <div class="pref-item checkbox">
            <label>
              <input type="checkbox" bind:checked={showLineNumbers}>
              Show line numbers
            </label>
          </div>
          
          <div class="pref-item checkbox">
            <label>
              <input type="checkbox" bind:checked={enableSyntaxHighlighting}>
              Enable syntax highlighting
            </label>
          </div>
          
          <div class="pref-item checkbox">
            <label>
              <input type="checkbox" bind:checked={wrapLines}>
              Wrap long lines
            </label>
          </div>
        </section>
        
        <section class="pref-section">
          <h3>Behavior</h3>
          
          <div class="pref-item checkbox">
            <label>
              <input type="checkbox" bind:checked={autoSave}>
              Auto-save changes
            </label>
          </div>
        </section>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={onClose}>Cancel</button>
        <button class="btn btn-primary" onclick={handleSave}>Save Preferences</button>
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
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
    font-size: 1.25rem;
    font-weight: 600;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .modal-close:hover {
    background: #f3f4f6;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .pref-section {
    margin-bottom: 2rem;
  }

  .pref-section:last-child {
    margin-bottom: 0;
  }

  .pref-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }

  .pref-item {
    margin-bottom: 1rem;
  }

  .pref-item:last-child {
    margin-bottom: 0;
  }

  .pref-item label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 500;
    color: #374151;
  }

  .pref-item.checkbox label {
    display: flex;
    align-items: center;
    font-weight: normal;
    cursor: pointer;
  }

  .pref-item.checkbox input[type="checkbox"] {
    margin-right: 0.5rem;
  }

  .pref-item select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 1rem;
    background: white;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #d1d5db;
  }

  :global(.dark-theme) .modal-content {
    background: #1f2937;
    color: #f3f4f6;
  }

  :global(.dark-theme) .modal-header {
    border-bottom-color: #374151;
  }

  :global(.dark-theme) .pref-section h3 {
    color: #f3f4f6;
  }

  :global(.dark-theme) .pref-item label {
    color: #d1d5db;
  }

  :global(.dark-theme) .pref-item select {
    background: #374151;
    color: #f3f4f6;
    border-color: #4b5563;
  }

  :global(.dark-theme) .modal-footer {
    border-top-color: #374151;
  }
</style>