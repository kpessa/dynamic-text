<script>
  import { Segment } from '@skeletonlabs/skeleton-svelte';
  import { getCurrentUser } from './firebase.js';
  
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
    { value: 'untested', label: 'Untested', variant: 'variant-soft-surface', icon: '○' },
    { value: 'testing', label: 'Testing', variant: 'variant-soft-primary', icon: '◐' },
    { value: 'passed', label: 'Passed', variant: 'variant-soft-success', icon: '✓' },
    { value: 'failed', label: 'Failed', variant: 'variant-soft-error', icon: '✗' },
    { value: 'production', label: 'Production', variant: 'variant-soft-secondary', icon: '★' }
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

  function handleNotesUpdate() {
    onUpdate({ 
      status, 
      validatedBy, 
      validatedAt, 
      notes 
    });
  }
</script>

{#if compact}
  <!-- Compact badge view -->
  <span 
    class="badge {currentStatus.variant} flex items-center gap-1"
    title="{currentStatus.label}{validatedAt ? ` - ${formatDate(validatedAt)}` : ''}"
  >
    <span>{currentStatus.icon}</span>
    <span>{currentStatus.label}</span>
  </span>
{:else}
  <!-- Full control view -->
  <div class="card variant-ghost-surface p-4 space-y-4">
    <!-- Header with gradient accent -->
    <div class="relative">
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-t-lg"></div>
      
      <div class="pt-2">
        <label class="label">
          <span class="text-sm font-semibold">Validation Status</span>
        </label>
        
        <!-- Status Radio Group -->
        <RadioGroup>
          {#each statusOptions as option}
            <RadioItem 
              bind:group={status} 
              name="status" 
              value={option.value}
              on:change={() => handleStatusChange(option.value)}
            >
              <span class="flex items-center gap-2">
                <span class="text-lg">{option.icon}</span>
                <span>{option.label}</span>
              </span>
            </RadioItem>
          {/each}
        </RadioGroup>
      </div>
    </div>

    {#if status !== 'untested'}
      <hr class="!border-t-2 !border-surface-300-600-token" />
      
      <div class="space-y-3">
        {#if validatedAt}
          <div class="flex justify-between items-center text-sm">
            <span class="text-surface-600-300-token font-medium">Validated:</span>
            <span class="badge variant-soft">{formatDate(validatedAt)}</span>
          </div>
        {/if}

        <!-- Notes Section -->
        <div class="space-y-2">
          <label class="label" for="validation-notes">
            <span class="text-sm font-medium">Notes</span>
          </label>
          <textarea
            id="validation-notes"
            bind:value={notes}
            placeholder="Add validation notes..."
            rows="3"
            class="textarea variant-form-material"
            onblur={handleNotesUpdate}
          ></textarea>
        </div>

        <!-- Test Results -->
        {#if testResults}
          <div class="card variant-soft p-3">
            <p class="text-sm font-semibold mb-2">Test Results</p>
            <div class="flex gap-4">
              {#if testResults.passed}
                <span class="badge variant-filled-success">
                  ✓ {testResults.passed} passed
                </span>
              {/if}
              {#if testResults.failed}
                <span class="badge variant-filled-error">
                  ✗ {testResults.failed} failed
                </span>
              {/if}
              {#if testResults.skipped}
                <span class="badge variant-soft-warning">
                  ⊘ {testResults.skipped} skipped
                </span>
              {/if}
            </div>
            
            {#if testResults.coverage}
              <div class="mt-3">
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-surface-600-300-token">Coverage</span>
                  <span class="font-mono">{testResults.coverage}%</span>
                </div>
                <div class="progress-bar">
                  <div 
                    class="progress-bar-meter bg-gradient-to-r 
                      {testResults.coverage >= 80 ? 'from-success-400 to-success-600' : 
                       testResults.coverage >= 60 ? 'from-warning-400 to-warning-600' : 
                       'from-error-400 to-error-600'}"
                    style="width: {testResults.coverage}%"
                  ></div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
        
        <!-- Status History (optional enhancement) -->
        {#if validatedBy}
          <div class="text-xs text-surface-600-300-token">
            Last updated by: <span class="font-mono">{validatedBy}</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Progress bar for coverage */
  .progress-bar {
    @apply w-full bg-surface-200-700-token rounded-full h-2 overflow-hidden;
  }
  
  .progress-bar-meter {
    @apply h-full rounded-full transition-all duration-500 ease-out;
  }
</style>