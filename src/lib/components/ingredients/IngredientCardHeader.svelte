<script>
  let {
    name = '',
    version = null,
    isShared = false,
    sharedCount = null,
    hasDifferences = false,
    isLoading = false,
    onVersionClick = () => {},
    onShareClick = () => {},
    onVariationClick = () => {}
  } = $props();
</script>

<div class="card-header">
  <h4 class="card-title">{name}</h4>
  <div class="card-badges">
    {#if version}
      <button 
        class="version-badge clickable" 
        title="Click to view version history"
        onclick={(e) => {
          e.stopPropagation();
          onVersionClick();
        }}
      >
        v{version}
      </button>
    {/if}
    
    {#if isShared}
      <button
        class="shared-badge clickable"
        title="Manage shared ingredient (shared across {sharedCount || 'multiple'} configs)"
        onclick={(e) => {
          e.stopPropagation();
          onShareClick();
        }}
      >
        🔗 {sharedCount || ''}
      </button>
    {:else}
      <button
        class="share-badge clickable"
        title="Share this ingredient"
        onclick={(e) => {
          e.stopPropagation();
          onShareClick();
        }}
      >
        📄
      </button>
    {/if}
    
    <button
      class="variation-badge clickable"
      title="Find variations of this ingredient"
      onclick={(e) => {
        e.stopPropagation();
        onVariationClick();
      }}
    >
      🔍
    </button>
    
    {#if hasDifferences}
      <span class="diff-badge" title="Has differences across populations">⚡</span>
    {/if}
    
    {#if isLoading}
      <span class="loading-spinner" title="Loading references..."></span>
    {/if}
  </div>
</div>

<style>
  @import '../../styles/ingredientDesignSystem.css';
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-4);
    position: relative;
  }
  
  .card-title {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    flex: 1;
    line-height: 1.3;
    letter-spacing: -0.01em;
    text-wrap: balance;
    transition: color var(--duration-base) var(--ease-out);
  }
  
  /* Subtle gradient on hover */
  .card-header:hover .card-title {
    background: linear-gradient(135deg, 
      var(--color-text-primary) 0%, 
      rgba(var(--color-primary-rgb), 0.9) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .card-badges {
    display: flex;
    gap: 0.375rem;
    align-items: center;
    flex-shrink: 0;
  }
  
  .version-badge,
  .shared-badge,
  .share-badge,
  .variation-badge {
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
    border-radius: var(--radius-full);
    font-weight: var(--font-weight-semibold);
    border: 1px solid transparent;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all var(--duration-base) var(--ease-out);
    box-shadow: var(--shadow-elevation-low);
  }
  
  /* Shine effect on hover */
  .version-badge::before,
  .shared-badge::before,
  .share-badge::before,
  .variation-badge::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent, 
      rgba(255, 255, 255, 0.3), 
      transparent
    );
    transition: left var(--duration-slow) var(--ease-out);
  }
  
  .version-badge:hover::before,
  .shared-badge:hover::before,
  .share-badge:hover::before,
  .variation-badge:hover::before {
    left: 100%;
  }
  
  .version-badge {
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.1), 
      rgba(var(--color-primary-rgb), 0.2)
    );
    color: rgb(var(--color-primary-rgb));
    border-color: rgba(var(--color-primary-rgb), 0.2);
  }
  
  .version-badge:hover {
    background: linear-gradient(135deg, 
      rgba(var(--color-primary-rgb), 0.2), 
      rgba(var(--color-primary-rgb), 0.3)
    );
    transform: translateY(-2px) scale(1.05);
    box-shadow: 
      var(--shadow-elevation-medium),
      0 0 15px rgba(var(--color-primary-rgb), 0.3);
    border-color: rgba(var(--color-primary-rgb), 0.4);
  }
  
  .shared-badge {
    background: linear-gradient(135deg, 
      rgba(var(--color-success-rgb), 0.1), 
      rgba(var(--color-success-rgb), 0.2)
    );
    color: rgb(var(--color-success-rgb));
    border-color: rgba(var(--color-success-rgb), 0.2);
  }
  
  .shared-badge:hover {
    background: linear-gradient(135deg, 
      rgba(var(--color-success-rgb), 0.2), 
      rgba(var(--color-success-rgb), 0.3)
    );
    transform: translateY(-2px) scale(1.05);
    box-shadow: 
      var(--shadow-elevation-medium),
      0 0 15px rgba(var(--color-success-rgb), 0.3);
    border-color: rgba(var(--color-success-rgb), 0.4);
  }
  
  .share-badge {
    background-color: var(--color-neutral-100);
    color: var(--color-neutral-600);
  }
  
  .share-badge:hover {
    background-color: var(--color-neutral-200);
    transform: translateY(-1px);
  }
  
  .variation-badge {
    background-color: var(--color-secondary-100);
    color: var(--color-secondary-700);
  }
  
  .variation-badge:hover {
    background-color: var(--color-secondary-200);
    transform: translateY(-1px);
  }
  
  .diff-badge {
    padding: 0.125rem 0.375rem;
    font-size: 0.75rem;
    border-radius: 0.25rem;
    background-color: var(--color-warning-100);
    color: var(--color-warning-700);
    font-weight: 500;
  }
  
  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(var(--color-primary-rgb), 0.2);
    border-top-color: rgb(var(--color-primary-rgb));
    border-radius: 50%;
    animation: spin var(--duration-slower) linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Dark theme adaptations */
  :global([data-theme="dark"]) .version-badge,
  :global([data-theme="dark"]) .shared-badge,
  :global([data-theme="dark"]) .share-badge,
  :global([data-theme="dark"]) .variation-badge {
    box-shadow: 
      var(--shadow-elevation-low),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }
  
  /* Pulse animation for diff badge */
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }
  
  .diff-badge {
    animation: pulse 2s infinite;
  }
</style>