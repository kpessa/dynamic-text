<script>
  import { Modal } from '@skeletonlabs/skeleton-svelte';
  import NavbarSkeleton from './NavbarSkeleton.svelte';
  
  // Initialize Skeleton stores
  initializeStores();
  
  let { 
    children,
    showSidebar = true,
    sidebarContent = null,
    headerContent = null,
    footerContent = null
  } = $props();
</script>

<!-- Toast notifications (top right) -->
<Toast position="tr" />

<!-- Modal provider -->
<Modal />

<!-- Drawer provider -->
<Drawer>
  {#if sidebarContent}
    {@render sidebarContent()}
  {/if}
</Drawer>

<!-- Main Layout using semantic HTML -->
<div class="h-screen overflow-hidden flex flex-col">
  <!-- Header -->
  <header class="sticky top-0 z-40 w-full">
    {#if headerContent}
      {@render headerContent()}
    {:else}
      <NavbarSkeleton />
    {/if}
  </header>

  <!-- Main Content Area -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Sidebar (responsive) -->
    {#if showSidebar && sidebarContent}
      <aside class="hidden lg:block w-64 xl:w-80 bg-surface-50-900-token border-r border-surface-300-600-token overflow-y-auto">
        <div class="p-4">
          {@render sidebarContent()}
        </div>
      </aside>
    {/if}

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto bg-surface-100-800-token">
      <div class="container mx-auto p-4 space-y-4">
        {@render children?.()}
      </div>
    </main>
  </div>

  <!-- Footer (optional) -->
  {#if footerContent}
    <footer class="bg-surface-100-800-token border-t border-surface-300-600-token">
      <div class="container mx-auto p-4">
        {@render footerContent()}
      </div>
    </footer>
  {/if}
</div>

<style>
  /* Ensure proper scrolling behavior */
  :global(html, body) {
    height: 100%;
    overflow: hidden;
  }
</style>