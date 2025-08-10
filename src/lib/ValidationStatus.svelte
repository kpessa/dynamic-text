<script>
  let { 
    status = 'untested',
    validatedBy = null,
    validatedAt = null,
    testResults = null,
    notes = '',
    compact = false,
    onUpdate = () => {}
  } = $props();

  const statusOptions = [
    { value: 'untested', label: 'Untested', color: 'gray', icon: '○' },
    { value: 'testing', label: 'Testing', color: 'blue', icon: '◐' },
    { value: 'passed', label: 'Passed', color: 'green', icon: '✓' },
    { value: 'failed', label: 'Failed', color: 'red', icon: '✗' },
    { value: 'production', label: 'Production', color: 'purple', icon: '★' }
  ];

  const currentStatus = $derived(statusOptions.find(opt => opt.value === status) || statusOptions[0]);

  function handleStatusChange(newStatus) {
    onUpdate({
      status: newStatus,
      validatedBy: getCurrentUser()?.uid || 'anonymous',
      validatedAt: new Date().toISOString(),
      notes
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  import { getCurrentUser } from './firebase.js';
</script>

{#if compact}
  <!-- Compact badge view -->
  <span 
    class="validation-badge badge-{currentStatus.color}"
    title="{currentStatus.label}{validatedAt ? ` - ${formatDate(validatedAt)}` : ''}"
  >
    <span class="badge-icon">{currentStatus.icon}</span>
    {currentStatus.label}
  </span>
{:else}
  <!-- Full control view -->
  <div class="validation-status">
    <div class="status-header">
      <label for="validation-status-select">Validation Status</label>
      <select 
        id="validation-status-select"
        value={status} 
        onchange={(e) => handleStatusChange(e.target.value)}
        class="status-select status-{currentStatus.color}"
      >
        {#each statusOptions as option}
          <option value={option.value}>
            {option.icon} {option.label}
          </option>
        {/each}
      </select>
    </div>

    {#if status !== 'untested'}
      <div class="status-details">
        {#if validatedAt}
          <div class="detail-row">
            <span class="detail-label">Validated:</span>
            <span class="detail-value">{formatDate(validatedAt)}</span>
          </div>
        {/if}

        <div class="notes-section">
          <label for="validation-notes">Notes:</label>
          <textarea
            id="validation-notes"
            bind:value={notes}
            placeholder="Add validation notes..."
            rows="2"
            onblur={() => onUpdate({ status, validatedBy, validatedAt, notes })}
          ></textarea>
        </div>

        {#if testResults}
          <div class="test-results">
            <div class="detail-label">Test Results:</div>
            <div class="results-summary">
              {#if testResults.passed}
                <span class="result-pass">✓ {testResults.passed} passed</span>
              {/if}
              {#if testResults.failed}
                <span class="result-fail">✗ {testResults.failed} failed</span>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .validation-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
    border: 1px solid;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: all var(--transition-fast);
    position: relative;
    overflow: hidden;
  }

  .validation-badge::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 255, 255, 0.2) 50%, 
      transparent 100%);
    transition: left var(--duration-slow) var(--ease-out);
  }

  .validation-badge:hover::before {
    left: 100%;
  }

  .badge-icon {
    font-size: 0.875rem;
  }

  .badge-gray {
    background: linear-gradient(135deg, 
      var(--color-gray-100) 0%, 
      var(--color-gray-200) 100%);
    border-color: var(--color-gray-300);
    color: var(--color-gray-700);
  }

  .badge-blue {
    background: linear-gradient(135deg, 
      var(--color-info-100) 0%, 
      var(--color-info-200) 100%);
    border-color: var(--color-info-300);
    color: var(--color-info-800);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  }

  .badge-green {
    background: linear-gradient(135deg, 
      var(--color-success-100) 0%, 
      var(--color-success-200) 100%);
    border-color: var(--color-success-300);
    color: var(--color-success-800);
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.15);
  }

  .badge-red {
    background: linear-gradient(135deg, 
      var(--color-danger-100) 0%, 
      var(--color-danger-200) 100%);
    border-color: var(--color-danger-300);
    color: var(--color-danger-800);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
  }

  .badge-purple {
    background: linear-gradient(135deg, 
      #ede9fe 0%, 
      #ddd6fe 100%);
    border-color: #c4b5fd;
    color: #6b21a8;
    box-shadow: 0 2px 8px rgba(147, 51, 234, 0.15);
  }

  .validation-status {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-5);
    background: linear-gradient(135deg, 
      var(--color-surface) 0%, 
      var(--color-surface-elevated) 100%);
    border-radius: var(--radius-lg);
    border: 2px solid var(--color-border-light);
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast);
    position: relative;
  }

  .validation-status::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, 
      var(--color-primary) 0%, 
      var(--color-primary-400) 100%);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    opacity: 0.7;
  }

  .validation-status:hover {
    border-color: var(--color-border-medium);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .status-header label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .status-select {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid #d1d5db;
    font-size: 0.875rem;
    background-color: white;
    cursor: pointer;
  }

  .status-gray { border-color: #9ca3af; }
  .status-blue { border-color: #60a5fa; }
  .status-green { border-color: #34d399; }
  .status-red { border-color: #f87171; }
  .status-purple { border-color: #a78bfa; }

  .status-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
  }

  .detail-label {
    color: #6b7280;
    font-weight: 500;
  }

  .detail-value {
    color: #374151;
  }

  .notes-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .notes-section label {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
  }

  .notes-section textarea {
    padding: 0.375rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    resize: vertical;
    min-height: 2.5rem;
  }

  .test-results {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .results-summary {
    display: flex;
    gap: 0.75rem;
    font-size: 0.75rem;
  }

  .result-pass {
    color: #065f46;
  }

  .result-fail {
    color: #991b1b;
  }
</style>