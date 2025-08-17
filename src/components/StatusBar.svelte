<script>
  let { 
    documentName = 'Untitled',
    saveStatus = 'saved',
    lastSaveTime = null,
    testsPassed = 0,
    testsTotal = 0,
    showTestStatus = false
  } = $props();
  
  let saveStatusIcon = $derived(() => {
    switch(saveStatus) {
      case 'saving': return '⏳';
      case 'saved': return '✓';
      case 'error': return '⚠️';
      default: return '●';
    }
  });
  
  let saveStatusText = $derived(() => {
    switch(saveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return lastSaveTime ? `Saved ${formatTime(lastSaveTime)}` : 'Saved';
      case 'error': return 'Save failed';
      default: return 'Not saved';
    }
  });
  
  function formatTime(time) {
    if (!time) return '';
    const now = new Date();
    const saveTime = new Date(time);
    const diff = Math.floor((now - saveTime) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return saveTime.toLocaleDateString();
  }
</script>

<div class="status-bar">
  <div class="status-left">
    <div class="status-item">
      <span class="status-icon">📄</span>
      <span class="status-text">{documentName}</span>
    </div>
    
    <div class="status-item">
      <span class="status-icon">{saveStatusIcon()}</span>
      <span class="status-text">
        {saveStatusText()}
      </span>
    </div>
  </div>
  
  <div class="status-right">
    {#if showTestStatus}
      <div class="status-item">
        <span class="status-icon">🧪</span>
        <span class="status-text">
          Tests: {testsPassed}/{testsTotal}
          {#if testsTotal > 0}
            <span class="status-time">({Math.round((testsPassed / testsTotal) * 100)}%)</span>
          {/if}
        </span>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  // All styles for this component are in src/styles/components/_status.scss
  // This ensures consistent styling across the application
</style>