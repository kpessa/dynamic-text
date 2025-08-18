<script>
  import { logWarn } from '$lib/logger';
  
  let { 
    sections = [],
    activeTestCase = {},
    testResults = {},
    onAddTestCase = () => {},
    onUpdateTestCase = () => {},
    onDeleteTestCase = () => {},
    onSetActiveTestCase = () => {},
    onRunTest = () => {},
    onRunAllTests = () => {}
  } = $props();
  
  let showTestSummary = $state(false);
  
  // Calculate test statistics
  let testStats = $derived.by(() => {
    let total = 0;
    let passed = 0;
    let failed = 0;
    
    sections.forEach(section => {
      if (section.type === 'dynamic' && section.testCases) {
        section.testCases.forEach(testCase => {
          if (testCase.expectedOutput !== undefined) {
            total++;
            const result = testResults[`${section.id}-${testCase.name}`];
            if (result?.passed) passed++;
            else if (result?.passed === false) failed++;
          }
        });
      }
    });
    
    return { total, passed, failed, pending: total - passed - failed };
  });
  
  function handleRunAllTests() {
    sections.forEach(section => {
      if (section.type === 'dynamic' && section.testCases) {
        section.testCases.forEach(testCase => {
          if (testCase.expectedOutput !== undefined) {
            onRunTest(section.id, testCase);
          }
        });
      }
    });
    showTestSummary = true;
  }
  
  function formatVariables(variables) {
    if (!variables || Object.keys(variables).length === 0) {
      return 'No variables';
    }
    return Object.entries(variables)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }
</script>

<div class="test-manager">
  <div class="test-header">
    <h3>Test Cases</h3>
    <div class="test-actions">
      <button 
        class="btn btn-primary"
        onclick={handleRunAllTests}
        disabled={testStats.total === 0}
      >
        Run All Tests ({testStats.total})
      </button>
      {#if testStats.total > 0}
        <div class="test-stats">
          <span class="stat passed">{testStats.passed} passed</span>
          <span class="stat failed">{testStats.failed} failed</span>
          <span class="stat pending">{testStats.pending} pending</span>
        </div>
      {/if}
    </div>
  </div>
  
  <div class="test-sections">
    {#each sections.filter(s => s.type === 'dynamic') as section (section.id)}
      <div class="test-section">
        <h4>{section.name || 'Untitled Section'}</h4>
        
        {#if section.testCases && section.testCases.length > 0}
          <div class="test-cases">
            {#each section.testCases as testCase, index (testCase.name)}
              {@const testKey = `${section.id}-${testCase.name}`}
              {@const result = testResults[testKey]}
              <div 
                class="test-case {result?.passed ? 'passed' : result?.passed === false ? 'failed' : ''} {activeTestCase[section.id] === testCase ? 'active' : ''}"
              >
                <div class="test-case-header">
                  <input 
                    type="text"
                    value={testCase.name}
                    onchange={(e) => onUpdateTestCase(section.id, index, { name: e.target.value })}
                    placeholder="Test name"
                    class="test-name-input"
                  />
                  <div class="test-case-controls">
                    <button 
                      class="btn btn-sm"
                      onclick={() => onSetActiveTestCase(section.id, testCase)}
                      title="Use this test case"
                    >
                      Use
                    </button>
                    <button 
                      class="btn btn-sm btn-run"
                      onclick={() => onRunTest(section.id, testCase)}
                      title="Run test"
                    >
                      Run
                    </button>
                    <button 
                      class="btn btn-sm btn-danger"
                      onclick={() => onDeleteTestCase(section.id, index)}
                      title="Delete test case"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div class="test-case-body">
                  <div class="test-field">
                    <label>Variables:</label>
                    <div class="test-variables">
                      {formatVariables(testCase.variables)}
                    </div>
                  </div>
                  
                  <div class="test-field">
                    <label>Expected Output:</label>
                    <input 
                      type="text"
                      value={testCase.expectedOutput || ''}
                      onchange={(e) => onUpdateTestCase(section.id, index, { expectedOutput: e.target.value })}
                      placeholder="Expected output"
                    />
                  </div>
                  
                  {#if result}
                    <div class="test-result {result.passed ? 'passed' : 'failed'}">
                      <strong>{result.passed ? '✓ Passed' : '✗ Failed'}</strong>
                      {#if !result.passed && result.error}
                        <div class="error-message">{result.error}</div>
                      {/if}
                      {#if result.actual !== undefined}
                        <div class="actual-output">
                          Actual: {result.actual}
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          
          <button 
            class="btn btn-add-test"
            onclick={() => onAddTestCase(section.id)}
          >
            + Add Test Case
          </button>
        {:else}
          <div class="no-tests">
            <p>No test cases yet</p>
            <button 
              class="btn btn-primary"
              onclick={() => onAddTestCase(section.id)}
            >
              Add First Test Case
            </button>
          </div>
        {/if}
      </div>
    {/each}
    
    {#if sections.filter(s => s.type === 'dynamic').length === 0}
      <div class="empty-state">
        <p>No JavaScript sections to test</p>
      </div>
    {/if}
  </div>
</div>

{#if showTestSummary}
  <div class="modal-backdrop" onclick={() => showTestSummary = false}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <h3>Test Results Summary</h3>
      <div class="summary-stats">
        <div class="stat-card passed">
          <div class="stat-value">{testStats.passed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat-card failed">
          <div class="stat-value">{testStats.failed}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat-card pending">
          <div class="stat-value">{testStats.pending}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>
      <button class="btn btn-primary" onclick={() => showTestSummary = false}>
        Close
      </button>
    </div>
  </div>
{/if}

<style>
  .test-manager {
    background: var(--color-surface);
    border-radius: 8px;
    padding: 1rem;
    height: 100%;
    overflow-y: auto;
  }
  
  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
  }
  
  .test-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }
  
  .test-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .test-stats {
    display: flex;
    gap: 0.75rem;
    font-size: 0.875rem;
  }
  
  .stat {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }
  
  .stat.passed {
    background: var(--color-success-soft);
    color: var(--color-success);
  }
  
  .stat.failed {
    background: var(--color-danger-soft);
    color: var(--color-danger);
  }
  
  .stat.pending {
    background: var(--color-warning-soft);
    color: var(--color-warning);
  }
  
  .test-sections {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .test-section h4 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  
  .test-cases {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .test-case {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
    transition: all 0.2s ease;
  }
  
  .test-case.active {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.1);
  }
  
  .test-case.passed {
    border-color: var(--color-success);
  }
  
  .test-case.failed {
    border-color: var(--color-danger);
  }
  
  .test-case-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--color-surface-elevated);
    border-bottom: 1px solid var(--color-border);
  }
  
  .test-name-input {
    flex: 1;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .test-case-controls {
    display: flex;
    gap: 0.5rem;
  }
  
  .test-case-body {
    padding: 0.75rem;
  }
  
  .test-field {
    margin-bottom: 0.75rem;
  }
  
  .test-field label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }
  
  .test-field input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .test-variables {
    padding: 0.5rem;
    background: var(--color-surface-soft);
    border-radius: 4px;
    font-size: 0.875rem;
    font-family: monospace;
  }
  
  .test-result {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .test-result.passed {
    background: var(--color-success-soft);
    color: var(--color-success);
  }
  
  .test-result.failed {
    background: var(--color-danger-soft);
    color: var(--color-danger);
  }
  
  .error-message {
    margin-top: 0.5rem;
    font-size: 0.813rem;
  }
  
  .actual-output {
    margin-top: 0.5rem;
    font-size: 0.813rem;
    opacity: 0.9;
  }
  
  .no-tests {
    padding: 1.5rem;
    text-align: center;
    background: var(--color-surface-soft);
    border-radius: 6px;
  }
  
  .no-tests p {
    margin: 0 0 1rem 0;
    color: var(--color-text-secondary);
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background: var(--color-primary);
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }
  
  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .btn-danger {
    background: var(--color-danger);
    color: white;
  }
  
  .btn-run {
    background: var(--color-success);
    color: white;
  }
  
  .btn-add-test {
    width: 100%;
    margin-top: 0.75rem;
    background: var(--color-surface-elevated);
    color: var(--color-text-primary);
    border: 1px dashed var(--color-border);
  }
  
  .btn-add-test:hover {
    background: var(--color-surface-soft);
  }
  
  .empty-state {
    padding: 3rem;
    text-align: center;
    color: var(--color-text-secondary);
  }
  
  /* Modal styles */
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
    background: var(--color-surface);
    border-radius: 12px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
  }
  
  .modal-content h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    text-align: center;
  }
  
  .summary-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
  }
  
  .stat-card.passed {
    background: var(--color-success-soft);
    color: var(--color-success);
  }
  
  .stat-card.failed {
    background: var(--color-danger-soft);
    color: var(--color-danger);
  }
  
  .stat-card.pending {
    background: var(--color-warning-soft);
    color: var(--color-warning);
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
  }
  
  .stat-label {
    font-size: 0.875rem;
    font-weight: 500;
    margin-top: 0.25rem;
  }
</style>