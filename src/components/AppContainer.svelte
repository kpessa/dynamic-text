<script>
  import { uiStore } from '../stores/uiStore.js';
  import NavbarRefactored from './NavbarRefactored.svelte';
  import SidebarRefactored from './SidebarRefactored.svelte';
  
  let { 
    children
  } = $props();
  
  const sidebarOpen = $derived(uiStore.getSidebarOpen());
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