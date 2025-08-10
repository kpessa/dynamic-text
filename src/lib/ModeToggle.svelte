<script>
  let {
    tpnMode = $bindable(false),
    label = "TPN Mode"
  } = $props();
</script>

<div class="mode-toggle-container">
  <label class="mode-toggle" for="tpn-mode-toggle">
    <span class="toggle-label">{label}</span>
    <input 
      type="checkbox" 
      id="tpn-mode-toggle"
      bind:checked={tpnMode}
      aria-label="Toggle {label}"
      aria-checked={tpnMode}
    />
    <span class="toggle-slider" data-active={tpnMode}>
      <span class="toggle-thumb"></span>
    </span>
  </label>
</div>

<style>
  .mode-toggle-container {
    display: flex;
    align-items: center;
  }
  
  .mode-toggle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    user-select: none;
  }
  
  .toggle-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    white-space: nowrap;
  }
  
  input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  
  .toggle-slider {
    position: relative;
    width: 48px;
    height: 26px;
    background: var(--color-neutral-300);
    border-radius: 13px;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    padding: 2px;
  }
  
  .toggle-slider[data-active="true"] {
    background: var(--color-success);
  }
  
  .toggle-thumb {
    position: absolute;
    width: 22px;
    height: 22px;
    background: white;
    border-radius: 50%;
    transition: transform var(--transition-fast);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transform: translateX(0);
  }
  
  .toggle-slider[data-active="true"] .toggle-thumb {
    transform: translateX(22px);
  }
  
  /* Hover effects */
  .mode-toggle:hover .toggle-slider {
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }
  
  /* Focus styles */
  input[type="checkbox"]:focus-visible + .toggle-slider {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  
  /* Active state */
  .mode-toggle:active .toggle-thumb {
    width: 26px;
  }
  
  .toggle-slider[data-active="true"] .mode-toggle:active .toggle-thumb {
    transform: translateX(18px);
  }
  
  /* Mobile adjustments */
  @media (max-width: 768px) {
    .mode-toggle {
      gap: 0.5rem;
    }
    
    .toggle-label {
      font-size: var(--font-size-xs);
    }
    
    .toggle-slider {
      width: 44px;
      height: 24px;
    }
    
    .toggle-thumb {
      width: 20px;
      height: 20px;
    }
    
    .toggle-slider[data-active="true"] .toggle-thumb {
      transform: translateX(20px);
    }
  }
  
  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .toggle-slider,
    .toggle-thumb {
      transition: none;
    }
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .toggle-slider {
      border: 2px solid var(--color-border);
    }
    
    .toggle-slider[data-active="true"] {
      border-color: var(--color-success-dark);
    }
  }
</style>