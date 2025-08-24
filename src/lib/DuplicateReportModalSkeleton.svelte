<script>
  import { getModalStore } from './stores/modalStore.js';
import { Accordion } from '@skeletonlabs/skeleton-svelte';
  
  const modalStore = getModalStore();
  
  let { 
    report = null,
    onProceed = () => {}
  } = $props();
  
  export function open(importReport, proceedCallback) {
    report = importReport;
    onProceed = proceedCallback;
    
    modalStore.trigger({
      type: 'component',
      component: 'duplicateReportModal'
    });
  }
  
  function handleProceed() {
    onProceed();
    modalStore.close();
  }
  
  function getStatColor(type) {
    switch(type) {
      case 'new': return 'variant-filled-success';
      case 'updated': return 'variant-filled-warning';
      case 'identical': return 'variant-filled-surface';
      case 'deduped': return 'variant-filled-primary';
      default: return 'variant-soft';
    }
  }
</script>

{#if report}
<div class="card p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto">
  <header class="mb-6">
    <h2 class="h3 font-bold">📊 Import Analysis Report</h2>
    <p class="text-surface-600-300-token mt-1">
      Review the analysis before proceeding with the import
    </p>
  </header>
  
  <!-- Summary Statistics -->
  <section class="mb-6">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card variant-ghost-surface p-4 text-center">
        <span class="text-3xl font-bold text-primary-500">{report.totalChecked}</span>
        <p class="text-sm text-surface-600-300-token mt-1">Total Ingredients</p>
      </div>
      
      <div class="card variant-ghost-success p-4 text-center">
        <span class="text-3xl font-bold text-success-500">
          {report.importStats?.newIngredients || 0}
        </span>
        <p class="text-sm text-surface-600-300-token mt-1">New</p>
      </div>
      
      <div class="card variant-ghost-warning p-4 text-center">
        <span class="text-3xl font-bold text-warning-500">
          {report.importStats?.updatedIngredients || 0}
        </span>
        <p class="text-sm text-surface-600-300-token mt-1">Updated</p>
      </div>
      
      <div class="card variant-ghost-surface p-4 text-center">
        <span class="text-3xl font-bold text-surface-500">
          {report.identicalIngredients.length}
        </span>
        <p class="text-sm text-surface-600-300-token mt-1">Unchanged</p>
      </div>
    </div>
    
    {#if report.autoDedupeEnabled && report.autoDedupeActions?.length > 0}
      <div class="mt-4 p-3 bg-primary-500/10 dark:bg-primary-500/20 rounded-lg">
        <div class="flex items-center gap-2">
          <span class="badge variant-filled-primary">
            🔗 {report.autoDedupeActions.length} Auto-deduplicated
          </span>
          <span class="text-sm text-surface-600-300-token">
            Automatically linked to existing shared ingredients
          </span>
        </div>
      </div>
    {/if}
  </section>
  
  <!-- Detailed Sections -->
  <Accordion>
    <!-- Auto-Deduplication Section -->
    {#if report.autoDedupeEnabled && report.autoDedupeActions?.length > 0}
      <AccordionItem open>
        <svelte:fragment slot="summary">
          <div class="flex items-center gap-2">
            <span class="text-lg">🔗 Auto-Deduplication Applied</span>
            <span class="badge variant-filled-primary">
              {report.autoDedupeActions.length}
            </span>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="content">
          <p class="text-sm text-surface-600-300-token mb-4">
            These ingredients were automatically linked to existing shared ingredients:
          </p>
          <div class="space-y-2">
            {#each report.autoDedupeActions as action}
              <div class="flex items-center justify-between p-3 bg-surface-100-800-token rounded">
                <span class="font-medium">{action.name}</span>
                <div class="flex items-center gap-2">
                  <span class="badge variant-soft-success">Auto-linked</span>
                  <span class="text-sm text-surface-600-300-token">
                    Shared with {action.existingConfigs.length} config{action.existingConfigs.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </svelte:fragment>
      </AccordionItem>
    {/if}
    
    <!-- Duplicates Within Import -->
    {#if report.duplicatesFound.length > 0}
      <AccordionItem>
        <svelte:fragment slot="summary">
          <div class="flex items-center gap-2">
            <span class="text-lg">⚠️ Duplicates Within Import</span>
            <span class="badge variant-filled-warning">
              {report.duplicatesFound.length}
            </span>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="content">
          <p class="text-sm text-surface-600-300-token mb-4">
            These ingredients appear multiple times in the config being imported:
          </p>
          <div class="space-y-2">
            {#each report.duplicatesFound as duplicate}
              <div class="flex items-center justify-between p-3 bg-surface-100-800-token rounded">
                <span class="text-sm">
                  {duplicate.ingredients.join(', ')}
                </span>
                <span class="badge variant-filled-warning">
                  {duplicate.count} copies
                </span>
              </div>
            {/each}
          </div>
        </svelte:fragment>
      </AccordionItem>
    {/if}
    
    <!-- Identical Ingredients -->
    {#if report.identicalIngredients.length > 0}
      <AccordionItem>
        <svelte:fragment slot="summary">
          <div class="flex items-center gap-2">
            <span class="text-lg">✅ Identical Ingredients</span>
            <span class="badge variant-soft">
              {report.identicalIngredients.length}
            </span>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="content">
          <p class="text-sm text-surface-600-300-token mb-4">
            These ingredients already exist with identical content (no changes needed):
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            {#each report.identicalIngredients as item}
              <div class="flex items-center justify-between p-2 bg-surface-100-800-token rounded">
                <span class="text-sm font-medium">{item.name}</span>
                {#if item.existingConfigs.length > 0}
                  <span class="badge variant-ghost text-xs">
                    {item.existingConfigs.length} config{item.existingConfigs.length !== 1 ? 's' : ''}
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        </svelte:fragment>
      </AccordionItem>
    {/if}
    
    <!-- Updated Ingredients -->
    {#if report.updatedIngredients?.length > 0}
      <AccordionItem>
        <svelte:fragment slot="summary">
          <div class="flex items-center gap-2">
            <span class="text-lg">🔄 Updated Ingredients</span>
            <span class="badge variant-filled-warning">
              {report.updatedIngredients.length}
            </span>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="content">
          <p class="text-sm text-surface-600-300-token mb-4">
            These ingredients will be updated with new content:
          </p>
          <div class="space-y-2">
            {#each report.updatedIngredients as item}
              <div class="p-3 bg-surface-100-800-token rounded">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium">{item.name}</span>
                  <span class="badge variant-filled-warning">Will Update</span>
                </div>
                {#if item.changes}
                  <div class="text-xs text-surface-600-300-token">
                    {item.changes}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </svelte:fragment>
      </AccordionItem>
    {/if}
    
    <!-- New Ingredients -->
    {#if report.newIngredients?.length > 0}
      <AccordionItem>
        <svelte:fragment slot="summary">
          <div class="flex items-center gap-2">
            <span class="text-lg">✨ New Ingredients</span>
            <span class="badge variant-filled-success">
              {report.newIngredients.length}
            </span>
          </div>
        </svelte:fragment>
        <svelte:fragment slot="content">
          <p class="text-sm text-surface-600-300-token mb-4">
            These ingredients will be added as new:
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            {#each report.newIngredients as item}
              <div class="flex items-center p-2 bg-surface-100-800-token rounded">
                <span class="badge variant-ghost-success mr-2">NEW</span>
                <span class="text-sm font-medium">{item.name}</span>
              </div>
            {/each}
          </div>
        </svelte:fragment>
      </AccordionItem>
    {/if}
  </Accordion>
  
  <!-- Import Summary -->
  <div class="mt-6 p-4 bg-surface-100-800-token rounded-lg">
    <h3 class="font-semibold mb-2">Import Summary</h3>
    <ul class="text-sm space-y-1 text-surface-600-300-token">
      {#if report.importStats?.newIngredients > 0}
        <li>✨ {report.importStats.newIngredients} new ingredient{report.importStats.newIngredients !== 1 ? 's' : ''} will be added</li>
      {/if}
      {#if report.importStats?.updatedIngredients > 0}
        <li>🔄 {report.importStats.updatedIngredients} ingredient{report.importStats.updatedIngredients !== 1 ? 's' : ''} will be updated</li>
      {/if}
      {#if report.identicalIngredients.length > 0}
        <li>✅ {report.identicalIngredients.length} ingredient{report.identicalIngredients.length !== 1 ? 's' : ''} unchanged</li>
      {/if}
      {#if report.autoDedupeActions?.length > 0}
        <li>🔗 {report.autoDedupeActions.length} ingredient{report.autoDedupeActions.length !== 1 ? 's' : ''} auto-deduplicated</li>
      {/if}
    </ul>
  </div>
  
  <!-- Footer Actions -->
  <footer class="flex justify-end gap-3 mt-6 pt-6 border-t border-surface-300-600-token">
    <button 
      class="btn variant-ghost"
      onclick={() => modalStore.close()}
    >
      Cancel
    </button>
    <button 
      class="btn variant-filled-primary"
      onclick={handleProceed}
    >
      Proceed with Import
    </button>
  </footer>
</div>
{/if}