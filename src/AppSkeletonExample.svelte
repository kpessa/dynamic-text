<script>
  import { onMount } from 'svelte';
  import { Modal } from '@skeletonlabs/skeleton-svelte';
  import { getModalStore } from './lib/stores/modalStore.js';
  

  
  // Get store instances
  const modalStore = getModalStore();
  
  // Import new Skeleton components
  import SkeletonProvider from '$lib/SkeletonProvider.svelte';
  import NavbarActions from '$lib/NavbarActions.svelte';
  import SidebarSkeleton from '$lib/SidebarSkeleton.svelte';
  import IngredientManagerSkeleton from '$lib/IngredientManagerSkeleton.svelte';
  import ValidationStatusSkeleton from '$lib/ValidationStatusSkeleton.svelte';
  import NotificationSystemSkeleton, * as notifications from '$lib/NotificationSystemSkeleton.svelte';
  
  // Import modal registry
  import { modalRegistry, MODAL_IDS, triggerModal } from '$lib/modalRegistry.js';
  
  // Import other necessary components
  import CodeEditor from '$lib/CodeEditor.svelte';
  import { isFirebaseConfigured } from '$lib/firebase.js';
  
  // State management
  let currentSections = $state([]);
  let currentIngredient = $state(null);
  let hasUnsavedChanges = $state(false);
  let lastSavedTime = $state(null);
  let copied = $state(false);
  let sidebarOpen = $state(true);
  let activeTab = $state('editor');
  let validationStatus = $state('untested');
  
  // Example sections for demo
  onMount(() => {
    // Initialize with demo content
    currentSections = [
      {
        id: '1',
        type: 'static',
        name: 'Introduction',
        content: '<h2>Welcome to Dynamic Text Editor</h2><p>Built with Skeleton UI</p>'
      },
      {
        id: '2', 
        type: 'dynamic',
        name: 'Calculation',
        content: 'return me.weight * 2;',
        testCases: []
      }
    ];
    
    // Show welcome notification
    notifications.showInfo('Welcome to Dynamic Text Editor with Skeleton UI!');
  });
  
  // Event handlers
  function handleNewDocument() {
    if (hasUnsavedChanges) {
      modalStore.trigger({
        type: 'confirm',
        title: 'Unsaved Changes',
        body: 'You have unsaved changes. Are you sure you want to create a new document?',
        response: (r) => {
          if (r) {
            currentSections = [];
            hasUnsavedChanges = false;
            notifications.showSuccess('New document created');
          }
        }
      });
    } else {
      currentSections = [];
      notifications.showSuccess('New document created');
    }
  }
  
  function handleSave() {
    // Simulate save operation
    setTimeout(() => {
      hasUnsavedChanges = false;
      lastSavedTime = new Date();
      notifications.showSaveStatus(true, 'Document');
    }, 500);
  }
  
  function handleExport() {
    // Open export modal
    triggerModal(modalStore, MODAL_IDS.EXPORT, {
      sections: currentSections,
      currentIngredient
    });
  }
  
  function openPreferences() {
    triggerModal(modalStore, MODAL_IDS.PREFERENCES);
  }
  
  function handleLoadReference(ref, ingredient) {
    currentSections = ref.sections || [];
    currentIngredient = ingredient;
    notifications.showSuccess(`Loaded reference: ${ref.name}`);
  }
  
  function handleSelectIngredient(ingredient) {
    currentIngredient = ingredient;
    activeTab = 'editor';
  }
  
  function handleValidationUpdate(data) {
    validationStatus = data.status;
    notifications.showInfo(`Validation status updated to: ${data.status}`);
  }
  
  // Keyboard shortcuts
  function handleKeydown(e) {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    // Ctrl/Cmd + N for new
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      handleNewDocument();
    }
    // Ctrl/Cmd + E to export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      handleExport();
    }
    // Ctrl/Cmd + , for preferences
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      openPreferences();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<SkeletonProvider>
  <!-- Notification System (headless) -->
  <NotificationSystemSkeleton />
  
  <!-- App Shell -->
  <AppShell>
    <!-- Header -->
    <svelte:fragment slot="header">
      <AppBar>
        <svelte:fragment slot="lead">
          <button 
            class="btn btn-sm variant-ghost-surface lg:hidden"
            onclick={() => sidebarOpen = !sidebarOpen}
          >
            <span class="text-xl">☰</span>
          </button>
          <strong class="text-xl uppercase">Dynamic Text Editor</strong>
        </svelte:fragment>
        
        <svelte:fragment slot="trail">
          <NavbarActions 
            {hasUnsavedChanges}
            {lastSavedTime}
            {copied}
            onNewDocument={handleNewDocument}
            onSave={handleSave}
            onExport={handleExport}
          />
          
          <button 
            class="btn btn-sm variant-ghost-surface"
            onclick={openPreferences}
            title="Preferences (Ctrl+,)"
          >
            ⚙️
          </button>
        </svelte:fragment>
      </AppBar>
    </svelte:fragment>
    
    <!-- Sidebar -->
    <svelte:fragment slot="sidebarLeft">
      <div class="h-full {sidebarOpen ? 'block' : 'hidden lg:block'}">
        <SidebarSkeleton 
          onLoadReference={handleLoadReference}
          onSaveReference={handleSave}
          {currentSections}
          activeConfigId={null}
          activeConfigIngredients={[]}
        />
      </div>
    </svelte:fragment>
    
    <!-- Main Content -->
    <div class="container mx-auto p-4">
      <!-- Tab Navigation -->
      <div class="tabs mb-4">
        <button 
          class="tab {activeTab === 'editor' ? 'variant-filled-primary' : 'variant-soft'}"
          onclick={() => activeTab = 'editor'}
        >
          ✏️ Editor
        </button>
        <button 
          class="tab {activeTab === 'ingredients' ? 'variant-filled-primary' : 'variant-soft'}"
          onclick={() => activeTab = 'ingredients'}
        >
          📦 Ingredients
        </button>
        <button 
          class="tab {activeTab === 'validation' ? 'variant-filled-primary' : 'variant-soft'}"
          onclick={() => activeTab = 'validation'}
        >
          ✓ Validation
        </button>
      </div>
      
      <!-- Tab Content -->
      {#if activeTab === 'editor'}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Code Editor -->
          <div class="card p-4">
            <h3 class="h4 mb-3">Code Editor</h3>
            <CodeEditor 
              bind:sections={currentSections}
              onchange={() => hasUnsavedChanges = true}
            />
          </div>
          
          <!-- Preview -->
          <div class="card p-4">
            <h3 class="h4 mb-3">Preview</h3>
            <div class="prose dark:prose-invert">
              {#each currentSections as section}
                <div class="mb-4 p-3 bg-surface-100-800-token rounded">
                  <h4 class="font-semibold">{section.name}</h4>
                  {#if section.type === 'static'}
                    {@html section.content}
                  {:else}
                    <pre class="text-sm"><code>{section.content}</code></pre>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
      {:else if activeTab === 'ingredients'}
        <IngredientManagerSkeleton 
          onSelectIngredient={handleSelectIngredient}
          bind:currentIngredient
        />
      {:else if activeTab === 'validation'}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidationStatusSkeleton 
            status={validationStatus}
            onUpdate={handleValidationUpdate}
          />
          
          <div class="card p-4">
            <h3 class="h4 mb-3">Test Statistics</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span>Total Tests:</span>
                <span class="font-mono">24</span>
              </div>
              <div class="flex justify-between text-success-500">
                <span>Passed:</span>
                <span class="font-mono">20</span>
              </div>
              <div class="flex justify-between text-error-500">
                <span>Failed:</span>
                <span class="font-mono">4</span>
              </div>
              <div class="mt-3">
                <button 
                  class="btn variant-filled-primary w-full"
                  onclick={() => notifications.showTestResults([
                    {status: 'passed'}, {status: 'passed'}, {status: 'failed'}, {status: 'skipped'}
                  ])}
                >
                  Run All Tests
                </button>
              </div>
            </div>
          </div>
        </div>
      {/if}
      
      <!-- Demo Buttons for Notifications -->
      <div class="mt-8 card p-4">
        <h3 class="h4 mb-3">Demo Notifications</h3>
        <div class="flex flex-wrap gap-2">
          <button 
            class="btn variant-filled-success"
            onclick={() => notifications.showSuccess('Success notification!')}
          >
            Success
          </button>
          <button 
            class="btn variant-filled-error"
            onclick={() => notifications.showError('Error notification!')}
          >
            Error
          </button>
          <button 
            class="btn variant-filled-warning"
            onclick={() => notifications.showWarning('Warning notification!')}
          >
            Warning
          </button>
          <button 
            class="btn variant-filled-primary"
            onclick={() => notifications.showInfo('Info notification!')}
          >
            Info
          </button>
          <button 
            class="btn variant-filled-secondary"
            onclick={() => notifications.showMedicalAlert('Critical medical alert!', 'critical')}
          >
            Medical Alert
          </button>
          <button 
            class="btn variant-soft"
            onclick={() => notifications.showFirebaseOperation('create', true)}
          >
            Firebase Op
          </button>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <svelte:fragment slot="footer">
      <div class="bg-surface-100-800-token p-4 text-center text-sm text-surface-600-300-token">
        <p>Dynamic Text Editor with Skeleton UI • Medical-Grade TPN Configuration System</p>
        <p class="mt-1">
          {#if isFirebaseConfigured()}
            <span class="badge variant-filled-success">Firebase Connected</span>
          {:else}
            <span class="badge variant-filled-warning">Firebase Not Configured</span>
          {/if}
        </p>
      </div>
    </svelte:fragment>
  </AppShell>
  
  <!-- Skeleton UI Modals, Toasts, and Drawers -->
  <Modal components={modalRegistry} />
  <Toast />
  <Drawer />
</SkeletonProvider>

<style>
  .tabs {
    @apply flex gap-2 border-b border-surface-300-600-token pb-2;
  }
  
  .tab {
    @apply px-4 py-2 rounded-t-lg font-medium transition-colors;
  }
  
  .container {
    @apply max-w-7xl;
  }
</style>