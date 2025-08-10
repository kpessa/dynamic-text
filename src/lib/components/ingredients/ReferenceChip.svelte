<script>
  import ValidationStatus from '../../ValidationStatus.svelte';
  
  let {
    reference,
    onEdit = () => {},
    onCompareBaseline = () => {},
    onRevertBaseline = () => {},
    onUpdateValidation = () => {}
  } = $props();
</script>

<div class="ref-chip-container">
  <button 
    class="ref-chip {reference.status === 'MODIFIED' ? 'modified' : ''}"
    onclick={(e) => {
      e.stopPropagation();
      onEdit(reference);
    }}
    title="{reference.status === 'MODIFIED' ? 'Modified from baseline' : reference.status === 'CLEAN' ? 'Matches baseline' : ''}"
  >
    {reference.healthSystem} {reference.version ? `v${reference.version}` : ''}
    {#if reference.isShared}
      <span class="status-indicator shared" title="Shared across configs">🔗</span>
    {/if}
    {#if reference.status === 'MODIFIED'}
      <span class="status-indicator modified" title="Modified from baseline">●</span>
    {:else if reference.status === 'CLEAN'}
      <span class="status-indicator clean" title="Matches baseline">✓</span>
    {/if}
  </button>
  
  <ValidationStatus 
    status={reference.validationStatus || 'untested'}
    validatedBy={reference.validatedBy}
    validatedAt={reference.validatedAt}
    testResults={reference.testResults}
    notes={reference.validationNotes || ''}
    compact={true}
    onUpdate={onUpdateValidation}
  />
  
  {#if reference.configId}
    <button 
      class="baseline-action-btn"
      onclick={(e) => {
        e.stopPropagation();
        onCompareBaseline(reference);
      }}
      title="Compare with baseline"
    >
      🔍
    </button>
    {#if reference.status === 'MODIFIED'}
      <button 
        class="baseline-action-btn revert"
        onclick={(e) => {
          e.stopPropagation();
          onRevertBaseline(reference);
        }}
        title="Revert to baseline"
      >
        ↺
      </button>
    {/if}
  {/if}
</div>

<style>
  @import '../../styles/ingredientDesignSystem.css';
  
  .ref-chip-container {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
    animation: slideIn var(--duration-base) var(--ease-out);
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .ref-chip {
    padding: var(--space-2) var(--space-4);
    background: linear-gradient(135deg, 
      var(--glass-bg) 0%, 
      var(--glass-bg-light) 100%
    );
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    white-space: nowrap;
    position: relative;
    overflow: hidden;
    transition: all var(--duration-base) var(--ease-out);
    box-shadow: var(--shadow-elevation-low);
  }
  
  /* Gradient overlay on hover */
  .ref-chip::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.05), 
      rgba(var(--color-primary-rgb), 0.1)
    );
    opacity: 0;
    transition: opacity var(--duration-base) var(--ease-out);
  }
  
  .ref-chip:hover::before {
    opacity: 1;
  }
  
  .ref-chip:hover {
    border-color: rgba(var(--color-primary-rgb), 0.3);
    transform: translateY(-2px) scale(1.02);
    box-shadow: 
      var(--shadow-elevation-medium),
      0 0 15px rgba(var(--color-primary-rgb), 0.2);
  }
  
  .ref-chip.modified {
    background: linear-gradient(135deg, 
      rgba(var(--color-warning-rgb), 0.1), 
      rgba(var(--color-warning-rgb), 0.05)
    );
    border-color: rgba(var(--color-warning-rgb), 0.3);
    box-shadow: 
      var(--shadow-elevation-low),
      0 0 10px rgba(var(--color-warning-rgb), 0.2);
  }
  
  .ref-chip.modified::before {
    background: linear-gradient(135deg, 
      rgba(var(--color-warning-rgb), 0.1), 
      rgba(var(--color-warning-rgb), 0.2)
    );
  }
  
  .ref-chip.modified:hover {
    border-color: rgba(var(--color-warning-rgb), 0.5);
    box-shadow: 
      var(--shadow-elevation-medium),
      0 0 20px rgba(var(--color-warning-rgb), 0.3);
  }
  
  .status-indicator {
    font-size: calc(var(--text-xs) * 0.8);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.1rem;
    height: 1.1rem;
    position: relative;
    z-index: 1;
    transition: transform var(--duration-fast) var(--ease-bounce);
  }
  
  .ref-chip:hover .status-indicator {
    transform: scale(1.2);
  }
  
  .status-indicator.shared {
    color: rgb(var(--color-success-rgb));
    filter: drop-shadow(0 0 3px rgba(var(--color-success-rgb), 0.5));
  }
  
  .status-indicator.modified {
    color: rgb(var(--color-warning-rgb));
    filter: drop-shadow(0 0 3px rgba(var(--color-warning-rgb), 0.5));
    animation: pulse 2s infinite;
  }
  
  .status-indicator.clean {
    color: rgb(var(--color-success-rgb));
    filter: drop-shadow(0 0 3px rgba(var(--color-success-rgb), 0.5));
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
  
  .baseline-action-btn {
    padding: var(--space-2) var(--space-2);
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--text-xs);
    position: relative;
    overflow: hidden;
    transition: all var(--duration-base) var(--ease-out);
    box-shadow: var(--shadow-elevation-low);
  }
  
  .baseline-action-btn:hover {
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.1), 
      rgba(var(--color-primary-rgb), 0.2)
    );
    border-color: rgba(var(--color-primary-rgb), 0.3);
    transform: translateY(-1px);
    box-shadow: 
      var(--shadow-elevation-medium),
      0 0 10px rgba(var(--color-primary-rgb), 0.2);
  }
  
  .baseline-action-btn.revert {
    background: linear-gradient(135deg, 
      rgba(var(--color-warning-rgb), 0.1), 
      rgba(var(--color-warning-rgb), 0.15)
    );
    border-color: rgba(var(--color-warning-rgb), 0.3);
  }
  
  .baseline-action-btn.revert:hover {
    background: linear-gradient(135deg, 
      rgba(var(--color-warning-rgb), 0.2), 
      rgba(var(--color-warning-rgb), 0.25)
    );
    border-color: rgba(var(--color-warning-rgb), 0.5);
    box-shadow: 
      var(--shadow-elevation-medium),
      0 0 15px rgba(var(--color-warning-rgb), 0.3);
  }
  /* Dark theme adaptations */
  :global([data-theme="dark"]) .ref-chip {
    background: linear-gradient(135deg, 
      rgba(31, 41, 55, 0.9), 
      rgba(31, 41, 55, 0.7)
    );
    border-color: var(--glass-border);
  }
  
  :global([data-theme="dark"]) .baseline-action-btn {
    background: rgba(31, 41, 55, 0.8);
  }
  
  /* Accessibility */
  .ref-chip:focus-visible,
  .baseline-action-btn:focus-visible {
    outline: var(--focus-ring-width) solid var(--focus-ring-color);
    outline-offset: var(--focus-ring-offset);
  }
  
  @media (prefers-reduced-motion: reduce) {
    .ref-chip,
    .baseline-action-btn,
    .status-indicator {
      animation: none !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>