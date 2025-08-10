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

<style lang="scss">
  @use '../styles/abstracts/variables' as *;
  @use '../styles/abstracts/mixins' as *;
  
  // Validation Badge (Compact View)
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
    
    // Shimmer effect on hover
    &::before {
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
      transition: left 0.6s ease-out;
    }
    
    &:hover::before {
      left: 100%;
    }
    
    // Status color variants
    &.badge-gray {
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      border-color: #d1d5db;
      color: #374151;
    }
    
    &.badge-blue {
      background: linear-gradient(135deg, 
        var(--color-info-alpha-10) 0%, 
        var(--color-info-alpha-20) 100%);
      border-color: var(--color-info);
      color: var(--color-info-dark);
      box-shadow: 0 2px 8px var(--color-info-alpha-20);
    }
    
    &.badge-green {
      background: linear-gradient(135deg, 
        var(--color-success-alpha-10) 0%, 
        var(--color-success-alpha-20) 100%);
      border-color: var(--color-success);
      color: var(--color-success-dark);
      box-shadow: 0 2px 8px var(--color-success-alpha-20);
    }
    
    &.badge-red {
      background: linear-gradient(135deg, 
        var(--color-danger-alpha-10) 0%, 
        var(--color-danger-alpha-20) 100%);
      border-color: var(--color-danger);
      color: var(--color-danger-dark);
      box-shadow: 0 2px 8px var(--color-danger-alpha-20);
    }
    
    &.badge-purple {
      background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
      border-color: #c4b5fd;
      color: #6b21a8;
      box-shadow: 0 2px 8px rgba(147, 51, 234, 0.15);
    }
  }
  
  .badge-icon {
    font-size: var(--font-size-sm);
  }

  
  // Full Control View
  .validation-status {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-5);
    background: linear-gradient(135deg, 
      var(--color-surface) 0%, 
      var(--color-surface-alt) 100%);
    border-radius: var(--radius-lg);
    border: 2px solid var(--color-border);
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast);
    position: relative;
    
    // Top accent bar
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, 
        var(--color-primary) 0%, 
        var(--color-primary-light) 100%);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      opacity: 0.7;
    }
    
    &:hover {
      border-color: var(--color-border-hover);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }
  }
  
  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text);
    }
  }
  
  .status-select {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    font-size: var(--font-size-sm);
    background-color: var(--color-background);
    cursor: pointer;
    transition: all var(--transition-fast);
    
    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-alpha-20);
    }
    
    &.status-gray { border-color: #9ca3af; }
    &.status-blue { border-color: var(--color-info); }
    &.status-green { border-color: var(--color-success); }
    &.status-red { border-color: var(--color-danger); }
    &.status-purple { border-color: #a78bfa; }
  }
  
  .status-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-xs);
  }
  
  .detail-label {
    color: var(--color-text-muted);
    font-weight: var(--font-weight-medium);
  }
  
  .detail-value {
    color: var(--color-text);
  }
  
  .notes-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    
    label {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      font-weight: var(--font-weight-medium);
    }
    
    textarea {
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-xs);
      resize: vertical;
      min-height: 2.5rem;
      background-color: var(--color-background);
      transition: all var(--transition-fast);
      
      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-alpha-20);
      }
    }
  }
  
  .test-results {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  
  .results-summary {
    display: flex;
    gap: var(--space-3);
    font-size: var(--font-size-xs);
  }
  
  .result-pass {
    color: var(--color-success-dark);
  }
  
  .result-fail {
    color: var(--color-danger-dark);
  }
</style>