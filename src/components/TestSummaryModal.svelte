<script>
  let { 
    isOpen = false,
    testResults = [],
    onClose = () => {}
  } = $props();
  
  let totalTests = $derived(testResults.reduce((sum, section) => sum + section.tests.length, 0));
  let passedTests = $derived(testResults.reduce((sum, section) => 
    sum + section.tests.filter(test => test.passed).length, 0));
  let failedTests = $derived(totalTests - passedTests);
  let passRate = $derived(totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0);
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }
</script>

{#if isOpen}
  <div class="modal-overlay" onclick={handleBackdropClick}>
    <div class="modal-content test-summary-modal">
      <button class="modal-close" onclick={onClose}>×</button>
      
      <div class="modal-header">
        <h2>Test Summary</h2>
      </div>
      
      <div class="summary-overview">
        <div class="summary-stat" class:all-passed={failedTests === 0 && totalTests > 0}>
          <div class="stat-label">Total Tests</div>
          <div class="stat-value">{totalTests}</div>
        </div>
        <div class="summary-stat passed">
          <div class="stat-label">Passed</div>
          <div class="stat-value">{passedTests}</div>
        </div>
        <div class="summary-stat" class:failed={failedTests > 0}>
          <div class="stat-label">Failed</div>
          <div class="stat-value">{failedTests}</div>
        </div>
        <div class="summary-stat" class:has-failures={failedTests > 0}>
          <div class="stat-label">Pass Rate</div>
          <div class="stat-value">{passRate}%</div>
        </div>
      </div>
      
      {#if testResults.length > 0}
        <div class="test-details">
          {#each testResults as section}
            {#if section.tests.length > 0}
              <div class="section-results">
                <h3>Section {section.index + 1}: {section.type === 'static' ? 'Static HTML' : 'Dynamic JavaScript'}</h3>
                {#each section.tests as test}
                  <div class="test-result-item" class:passed={test.passed} class:failed={!test.passed}>
                    <div class="test-name">{test.name}</div>
                    {#if !test.passed && test.error}
                      <div class="test-error">{test.error}</div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          {/each}
        </div>
      {/if}
      
      <div class="modal-footer">
        <button class="btn-primary" onclick={onClose}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  // All styles for this component are in src/styles/components/_status.scss
  // This ensures consistent styling across the application
</style>