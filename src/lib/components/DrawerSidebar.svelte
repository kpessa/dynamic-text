<script>
  import { fly, fade } from 'svelte/transition';
  
  let { 
    isOpen = $bindable(false),
    position = 'left',
    width = '300px',
    children
  } = $props();

  function handleBackdropClick() {
    isOpen = false;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="drawer-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="button"
    tabindex="-1"
    aria-label="Close drawer"
    transition:fade={{ duration: 200 }}
  />
  
  <!-- Drawer -->
  <aside 
    class="drawer drawer-{position}"
    style="width: {width}"
    transition:fly={{ 
      x: position === 'left' ? -300 : 300, 
      duration: 300 
    }}
  >
    <div class="drawer-content">
      {@render children()}
    </div>
  </aside>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 998;
    backdrop-filter: blur(2px);
  }

  .drawer {
    position: fixed;
    top: 0;
    bottom: 0;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    box-shadow: var(--shadow-xl);
    z-index: 999;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .drawer-left {
    left: 0;
    border-right: 2px solid var(--border-primary);
  }

  .drawer-right {
    right: 0;
    border-left: 2px solid var(--border-primary);
  }

  .drawer-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }

  /* Custom scrollbar for drawer */
  .drawer::-webkit-scrollbar {
    width: 8px;
  }

  .drawer::-webkit-scrollbar-track {
    background: var(--bg-primary);
  }

  .drawer::-webkit-scrollbar-thumb {
    background: var(--border-secondary);
    border-radius: var(--radius-sm);
  }

  .drawer::-webkit-scrollbar-thumb:hover {
    background: var(--border-light);
  }
</style>