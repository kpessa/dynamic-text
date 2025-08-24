<script>
  import SkeletonProvider from './lib/SkeletonProvider.svelte';
  import SkeletonLayout from './lib/SkeletonLayout.svelte';
  import SkeletonDemo from './lib/SkeletonDemo.svelte';
  import { getToastStore } from '@skeletonlabs/skeleton-svelte';
  import { onMount } from 'svelte';
  
  let showDemo = $state(true);
  let currentView = $state('demo');
  
  // Initialize stores after mount
  let toastStore;
  onMount(() => {
    toastStore = getToastStore();
  });
  
  // Navigation handlers
  function handleViewChange(view) {
    currentView = view;
    if (toastStore) {
      toastStore.trigger({
        message: `Switched to ${view} view`,
        preset: 'secondary',
        timeout: 2000
      });
    }
  }
</script>

<SkeletonProvider>
  <SkeletonLayout>
    {#snippet headerContent()}
      <div class="app-bar p-4 variant-glass-surface">
        <div class="flex items-center justify-between">
          <h1 class="h2">TPN Editor - Skeleton UI</h1>
          <div class="btn-group variant-ghost-surface">
            <button 
              class:variant-filled={currentView === 'demo'}
              on:click={() => handleViewChange('demo')}
            >
              Demo
            </button>
            <button 
              class:variant-filled={currentView === 'editor'}
              on:click={() => handleViewChange('editor')}
            >
              Editor
            </button>
            <button 
              class:variant-filled={currentView === 'ingredients'}
              on:click={() => handleViewChange('ingredients')}
            >
              Ingredients
            </button>
          </div>
        </div>
      </div>
    {/snippet}
    
    {#snippet sidebarContent()}
      <aside class="space-y-4">
        <div class="card variant-soft p-4">
          <h3 class="h4 mb-2">Quick Actions</h3>
          <nav class="list-nav">
            <ul>
              <li>
                <button class="w-full text-left">
                  <span>📄</span>
                  <span>New Document</span>
                </button>
              </li>
              <li>
                <button class="w-full text-left">
                  <span>💾</span>
                  <span>Save Changes</span>
                </button>
              </li>
              <li>
                <button class="w-full text-left">
                  <span>📤</span>
                  <span>Export Config</span>
                </button>
              </li>
              <li>
                <button class="w-full text-left">
                  <span>⚙️</span>
                  <span>Settings</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
        
        <div class="card variant-soft p-4">
          <h3 class="h4 mb-2">Recent Files</h3>
          <ul class="space-y-1 text-sm">
            <li class="p-2 hover:variant-soft rounded">config-2024-01.json</li>
            <li class="p-2 hover:variant-soft rounded">tpn-neonatal.json</li>
            <li class="p-2 hover:variant-soft rounded">pediatric-calc.json</li>
          </ul>
        </div>
      </aside>
    {/snippet}
    
    <!-- Main content based on current view -->
    {#if currentView === 'demo'}
      <SkeletonDemo />
    {:else if currentView === 'editor'}
      <div class="card p-4">
        <h2 class="h2 mb-4">Editor View</h2>
        <p>Your existing editor components will go here.</p>
        <p class="text-surface-600-300-token mt-2">
          Import your existing components and they'll work seamlessly with Skeleton UI.
        </p>
      </div>
    {:else if currentView === 'ingredients'}
      <div class="card p-4">
        <h2 class="h2 mb-4">Ingredients View</h2>
        <p>Your existing ingredient manager will go here.</p>
        <p class="text-surface-600-300-token mt-2">
          The Firebase-backed ingredient system integrates perfectly with Skeleton's components.
        </p>
      </div>
    {/if}
    
    {#snippet footerContent()}
      <div class="flex items-center justify-between text-sm text-surface-600-300-token">
        <span>TPN Dynamic Text Editor v1.0</span>
        <span>Powered by Skeleton UI v3 + Svelte 5</span>
      </div>
    {/snippet}
  </SkeletonLayout>
</SkeletonProvider>

<style>
  :global(.app-bar) {
    @apply shadow-xl;
  }
</style>