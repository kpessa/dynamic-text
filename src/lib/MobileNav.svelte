<script>
  import { sectionStore, tpnStore, uiStore } from '../stores/index.js';
  
  let {
    onToggleSidebar = () => {},
    onToggleTpnMode = () => {},
    onToggleKeyReference = () => {},
    onNewDocument = () => {},
    onSave = () => {},
    onExport = () => {},
    hasUnsavedChanges = false,
    tpnMode = false,
    showKeyReference = false
  } = $props();
  
  // Mobile navigation items
  const navItems = $derived([
    {
      id: 'sections',
      icon: '=�',
      label: 'Sections',
      active: !tpnMode,
      action: () => tpnStore.setTPNMode(false)
    },
    {
      id: 'tpn',
      icon: '>�',
      label: 'TPN',
      active: tpnMode,
      action: () => tpnStore.setTPNMode(true)
    },
    {
      id: 'keys',
      icon: '=',
      label: 'Keys',
      active: showKeyReference,
      action: () => tpnStore.setShowKeyReference(!showKeyReference),
      visible: tpnMode
    },
    {
      id: 'save',
      icon: hasUnsavedChanges ? '=�' : '',
      label: hasUnsavedChanges ? 'Save' : 'Saved',
      action: onSave,
      highlight: hasUnsavedChanges,
      visible: hasUnsavedChanges
    },
    {
      id: 'menu',
      icon: '0',
      label: 'Menu',
      action: onToggleSidebar
    }
  ]);
  
  // Visible items (filtered for current state)
  const visibleItems = $derived(
    navItems.filter(item => item.visible !== false)
  );
</script>

<nav class="mobile-nav" aria-label="Mobile navigation">
  {#each visibleItems as item (item.id)}
    <button
      class="mobile-nav-item {item.active ? 'active' : ''} {item.highlight ? 'highlight' : ''}"
      onclick={item.action}
      aria-pressed={item.active}
      aria-label={item.label}
    >
      <span class="nav-icon" aria-hidden="true">{item.icon}</span>
      <span class="nav-label">{item.label}</span>
    </button>
  {/each}
</nav>

<style>
  .mobile-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(248, 249, 250, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid var(--color-border);
    padding: var(--spacing-sm) var(--safe-area-inset-right) calc(var(--spacing-sm) + var(--safe-area-inset-bottom)) var(--safe-area-inset-left);
    z-index: var(--z-fixed);
    display: none;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 767px) {
    .mobile-nav {
      display: flex;
      justify-content: space-around;
      align-items: center;
      gap: var(--spacing-xs);
    }
  }
  
  .mobile-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-height: var(--touch-target-medium);
    min-width: var(--touch-target-medium);
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
    max-width: 80px;
    
    /* Touch optimization */
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  
  .mobile-nav-item:active {
    transform: scale(0.95);
    transition-duration: 0.1s;
  }
  
  .mobile-nav-item.active {
    background: var(--color-primary);
    color: white;
  }
  
  .mobile-nav-item.highlight {
    background: var(--color-danger);
    color: white;
    animation: pulse 2s infinite;
  }
  
  .nav-icon {
    font-size: 1.2rem;
    line-height: 1;
  }
  
  .nav-label {
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1;
    text-align: center;
  }
  
  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .mobile-nav {
      background: rgba(26, 26, 26, 0.95);
      border-top-color: rgba(255, 255, 255, 0.1);
    }
    
    .mobile-nav-item {
      color: #ffffff;
    }
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .mobile-nav {
      border-top-width: 2px;
    }
    
    .mobile-nav-item {
      border: 1px solid transparent;
    }
    
    .mobile-nav-item.active,
    .mobile-nav-item.highlight {
      border-color: currentColor;
    }
  }
  
  /* Pulse animation for highlight items */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
  
  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .mobile-nav-item {
      transition: none;
    }
    
    .mobile-nav-item:active {
      transform: none;
    }
    
    .mobile-nav-item.highlight {
      animation: none;
    }
  }
</style>