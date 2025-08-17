<script>
  import { uiStore } from '../stores/uiStore.svelte.js';
  import NavbarRefactored from '../lib/NavbarRefactored.svelte';
  import SidebarRefactored from '../lib/SidebarRefactored.svelte';
  import { get } from 'svelte/store';
  
  let { 
    children
  } = $props();
  
  const sidebarOpen = $derived(get(uiStore.showSidebar));
</script>

<div class="app">
  <NavbarRefactored />
  
  <div class="main-content" class:sidebar-open={sidebarOpen}>
    <SidebarRefactored />
    
    <div class="main-panel">
      {@render children?.()}
    </div>
  </div>
</div>

<style lang="scss">
  // All layout styles are in src/styles/layout/_app.scss
  // This component focuses purely on structure
</style>