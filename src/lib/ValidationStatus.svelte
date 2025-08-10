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
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .badge-icon {
    font-size: 0.875rem;
  }

  .badge-gray {
    background-color: #f3f4f6;
    color: #6b7280;
  }

  .badge-blue {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .badge-green {
    background-color: #d1fae5;
    color: #065f46;
  }

  .badge-red {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .badge-purple {
    background-color: #ede9fe;
    color: #6b21a8;
  }

  .validation-status {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
    background-color: #f9fafb;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
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