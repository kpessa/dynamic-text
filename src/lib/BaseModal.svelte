<script>
  import Icons from './Icons.svelte';
  
  let {
    isOpen = $bindable(false),
    title = '',
    size = 'medium', // small, medium, large, fullscreen
    showCloseButton = true,
    closeOnEscape = true,
    closeOnOverlay = true,
    className = '',
    onClose = () => {},
    children
  } = $props();
  
  // Handle escape key
  $effect(() => {
    if (isOpen && closeOnEscape) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  });
  
  // Lock body scroll when modal is open
  $effect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  });
  
  function handleClose() {
    isOpen = false;
    onClose();
  }
  
  function handleOverlayClick() {
    if (closeOnOverlay) {
      handleClose();
    }
  }
</script>

{#if isOpen}
  <div 
    class="base-modal-overlay"
    onclick={handleOverlayClick}
    role="button"
    tabindex="-1"
    aria-label="Close modal"
  >
    <div 
      class="base-modal-content base-modal-{size} {className}"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {#if title || showCloseButton}
        <div class="base-modal-header">
          {#if title}
            <h2 id="modal-title" class="base-modal-title">{title}</h2>
          {/if}
          {#if showCloseButton}
            <button 
              class="base-modal-close"
              onclick={handleClose}
              aria-label="Close modal"
            >
              <Icons icon="close" size={20} />
            </button>
          {/if}
        </div>
      {/if}
      
      <div class="base-modal-body">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  @use '../styles/abstracts/variables' as *;
  @use '../styles/abstracts/mixins' as *;
  
  .base-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn var(--transition-base);
    padding: var(--spacing-lg);
    
    @include mobile {
      padding: var(--spacing-md);
    }
  }
  
  .base-modal-content {
    background: var(--color-background);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    animation: slideUp var(--transition-base);
    position: relative;
    
    &.base-modal-small {
      width: 100%;
      max-width: 400px;
    }
    
    &.base-modal-medium {
      width: 100%;
      max-width: 600px;
    }
    
    &.base-modal-large {
      width: 100%;
      max-width: 900px;
    }
    
    &.base-modal-fullscreen {
      width: 100%;
      max-width: 100%;
      height: 100vh;
      max-height: 100vh;
      border-radius: 0;
    }
    
    @include mobile {
      width: 100%;
      max-width: 100%;
      max-height: 100vh;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      margin-top: auto;
    }
  }
  
  .base-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
    
    @include mobile {
      padding: var(--spacing-md);
    }
  }
  
  .base-modal-title {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
    flex: 1;
  }
  
  .base-modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--transition-fast);
    
    &:hover {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
    
    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 2px;
    }
  }
  
  .base-modal-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-lg);
    
    @include mobile {
      padding: var(--spacing-md);
    }
    
    // Custom scrollbar
    &::-webkit-scrollbar {
      width: 8px;
    }
    
    &::-webkit-scrollbar-track {
      background: var(--color-surface);
      border-radius: var(--radius-sm);
    }
    
    &::-webkit-scrollbar-thumb {
      background: var(--color-border-strong);
      border-radius: var(--radius-sm);
      
      &:hover {
        background: var(--color-text-muted);
      }
    }
  }
  
  // Animations
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  // Dark mode adjustments
  :global([data-theme="dark"]) {
    .base-modal-overlay {
      background: rgba(0, 0, 0, 0.7);
    }
  }
  
  // High contrast mode
  @media (prefers-contrast: high) {
    .base-modal-content {
      border: 2px solid var(--color-border-strong);
    }
    
    .base-modal-header {
      border-bottom-width: 2px;
    }
  }
  
  // Reduced motion
  @media (prefers-reduced-motion: reduce) {
    .base-modal-overlay,
    .base-modal-content {
      animation: none;
    }
  }
</style>