<script lang="ts">
  import WorkspaceManager from './WorkspaceManager.svelte';
  import FirebaseOperationsManager from './FirebaseOperationsManager.svelte';
  import TestExecutionOrchestrator from './TestExecutionOrchestrator.svelte';
  import { sectionStore } from '../../stores/sectionStore.svelte';
  import { workspaceStore } from '../../stores/workspaceStore.svelte';
  import { testStore } from '../../stores/testStore.svelte';
  import { eventBus } from '../utils/eventBus';
  
  interface Props {
    firebaseEnabled?: boolean;
    tpnMode?: boolean;
    currentTPNInstance?: any;
  }
  
  let {
    firebaseEnabled = false,
    tpnMode = false,
    currentTPNInstance = null
  }: Props = $props();
  
  // Get reactive state from stores
  let sections = $derived(sectionStore.getSections());
  let currentIngredient = $derived(workspaceStore.getLoadedIngredient());
  let activeConfigId = $derived(workspaceStore.getActiveConfigId());
  let activeTestCases = $derived(testStore.getActiveTestCases());
  
  // Handle workspace save
  async function handleWorkspaceSave(commitMessage?: string) {
    if (firebaseEnabled && currentIngredient) {
      // Save to Firebase through the operations manager
      eventBus.emit('firebase:save-reference');
    }
    
    // Save to local storage
    workspaceStore.saveState(sections);
    
    // Log the save
    console.log('Workspace saved', { 
      commitMessage, 
      sections: sections.length,
      ingredient: currentIngredient 
    });
  }
  
  // Handle workspace clear
  function handleWorkspaceClear() {
    sectionStore.clearSections();
    workspaceStore.clearState();
    testStore.clearTests();
  }
  
  // Handle reference load from Firebase
  function handleReferenceLoad(reference: any, ingredient?: any) {
    if (reference.sections) {
      sectionStore.setSections(reference.sections);
    }
    
    console.log('Reference loaded', { 
      reference: reference.id, 
      ingredient: ingredient?.name 
    });
  }
  
  // Handle reference save preparation
  async function handleReferenceSave(sections: any[]) {
    // Process sections before saving (e.g., clean up, validate)
    return sections.map(section => ({
      ...section,
      lastModified: Date.now()
    }));
  }
  
  // Handle config activation
  function handleConfigActivate(configId: string, ingredients: any[]) {
    console.log('Config activated', { 
      configId, 
      ingredientCount: ingredients.length 
    });
  }
  
  // Handle test completion
  function handleTestComplete(results: any) {
    console.log('Tests completed', { 
      total: results.summary.total,
      passed: results.summary.passed,
      failed: results.summary.failed
    });
  }
  
  // Handle test generation
  function handleTestGenerated(sectionId: number, tests: any[]) {
    console.log('Tests generated', { 
      sectionId, 
      testCount: tests.length 
    });
  }
</script>

<div class="app-orchestrator">
  <!-- Workspace Management -->
  <WorkspaceManager
    currentWorkspace={workspaceStore.getState()}
    {firebaseEnabled}
    {currentIngredient}
    onSave={handleWorkspaceSave}
    onClear={handleWorkspaceClear}
  />
  
  <!-- Firebase Operations -->
  {#if firebaseEnabled}
    <FirebaseOperationsManager
      {firebaseEnabled}
      {currentIngredient}
      {activeConfigId}
      onReferenceLoad={handleReferenceLoad}
      onReferenceSave={handleReferenceSave}
      onConfigActivate={handleConfigActivate}
    />
  {/if}
  
  <!-- Test Execution -->
  <TestExecutionOrchestrator
    {sections}
    activeTestCases={activeTestCases}
    {tpnMode}
    {currentTPNInstance}
    onTestComplete={handleTestComplete}
    onTestGenerated={handleTestGenerated}
  />
</div>

<style>
  .app-orchestrator {
    display: flex;
    flex-direction: column;
  }
</style>