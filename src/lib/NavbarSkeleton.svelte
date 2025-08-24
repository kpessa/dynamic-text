<script>
  import LightSwitch from './components/LightSwitch.svelte';
  
  let { 
    isEditing = false,
    previewMode = false,
    currentView = 'editor',
    onViewChange = () => {},
    onPreviewToggle = () => {},
    onSave = () => {},
    onExport = () => {},
    onImport = () => {}
  } = $props();

  // Simple dropdown state
  let userMenuOpen = $state(false);
</script>

<nav class="bg-surface-100-800-token shadow-xl p-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center">
      <strong class="text-xl uppercase">TPN Editor</strong>
    </div>
    
    <div class="flex items-center space-x-2">
    <!-- View Mode Buttons -->
    <div class="btn-group variant-ghost-surface">
      <button 
        class:variant-filled-primary={currentView === 'editor'}
        on:click={() => onViewChange('editor')}
      >
        <span class="material-icons">edit</span>
        <span class="hidden sm:inline ml-2">Editor</span>
      </button>
      <button 
        class:variant-filled-primary={currentView === 'ingredients'}
        on:click={() => onViewChange('ingredients')}
      >
        <span class="material-icons">inventory_2</span>
        <span class="hidden sm:inline ml-2">Ingredients</span>
      </button>
      <button 
        class:variant-filled-primary={currentView === 'test'}
        on:click={() => onViewChange('test')}
      >
        <span class="material-icons">science</span>
        <span class="hidden sm:inline ml-2">Test</span>
      </button>
    </div>

    <div class="divider-vertical h-8 mx-2"></div>

    <!-- Action Buttons -->
    <button 
      class="btn variant-ghost-surface"
      class:variant-filled-success={previewMode}
      on:click={() => onPreviewToggle()}
    >
      <span class="material-icons">
        {previewMode ? 'visibility' : 'visibility_off'}
      </span>
      <span class="hidden sm:inline ml-2">Preview</span>
    </button>

    <button 
      class="btn variant-ghost-surface"
      on:click={() => onSave()}
      disabled={!isEditing}
    >
      <span class="material-icons">save</span>
      <span class="hidden sm:inline ml-2">Save</span>
    </button>

    <button 
      class="btn variant-ghost-surface"
      on:click={() => onExport()}
    >
      <span class="material-icons">download</span>
      <span class="hidden sm:inline ml-2">Export</span>
    </button>

    <button 
      class="btn variant-ghost-surface"
      on:click={() => onImport()}
    >
      <span class="material-icons">upload</span>
      <span class="hidden sm:inline ml-2">Import</span>
    </button>

    <div class="divider-vertical h-8 mx-2"></div>

    <!-- Theme Switcher -->
    <LightSwitch />

    <!-- User Menu -->
    <button 
      class="btn-icon variant-ghost-surface"
      on:click={() => userMenuOpen = !userMenuOpen}
    >
      <span class="material-icons">account_circle</span>
    </button>
    
    {#if userMenuOpen}
      <div class="absolute top-full right-0 mt-2 bg-surface-100-800-token rounded-lg shadow-lg p-2">
        <button class="btn variant-ghost-surface w-full text-left">
          <span class="material-icons">settings</span>
          Settings
        </button>
        <button class="btn variant-ghost-surface w-full text-left">
          <span class="material-icons">logout</span>
          Logout
        </button>
      </div>
    {/if}
  </div>
</nav>

<!-- User Menu Popup -->
<div class="card p-4 w-48 shadow-xl" data-popup="userMenu">
  <nav class="list-nav">
    <ul>
      <li>
        <a href="#/profile">
          <span class="material-icons">person</span>
          <span>Profile</span>
        </a>
      </li>
      <li>
        <a href="#/settings">
          <span class="material-icons">settings</span>
          <span>Settings</span>
        </a>
      </li>
      <li>
        <a href="#/help">
          <span class="material-icons">help</span>
          <span>Help</span>
        </a>
      </li>
      <hr class="my-2">
      <li>
        <a href="#/logout">
          <span class="material-icons">logout</span>
          <span>Logout</span>
        </a>
      </li>
    </ul>
  </nav>
  <div class="arrow bg-surface-100-800-token"></div>
</div>

<style>
  /* Add Material Icons if not already included */
  @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
</style>