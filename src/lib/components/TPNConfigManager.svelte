<script lang="ts">
  import { onMount } from 'svelte';
  import { tpnConfigFirebaseService, type TPNConfigListItem } from '../services/tpnConfigFirebaseService';
  import type { PopulationType } from '../services/tpnConfigService';
  
  const props = $props<{
    onLoad?: (configId: string) => void;
    onClose?: () => void;
  }>();
  
  let onLoad = props.onLoad;
  let onClose = props.onClose;
  
  let configurations = $state<TPNConfigListItem[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedConfigId = $state<string | null>(null);
  let deleteConfirmId = $state<string | null>(null);
  let filterPopulationType = $state<PopulationType | 'all'>('all');
  
  onMount(async () => {
    await loadConfigurations();
  });
  
  async function loadConfigurations() {
    loading = true;
    error = null;
    
    try {
      const result = await tpnConfigFirebaseService.listTPNConfigurations();
      
      if (result.success && result.configurations) {
        configurations = result.configurations;
      } else {
        error = result.error || 'Failed to load configurations';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }
  
  async function handleLoadConfig(configId: string) {
    selectedConfigId = configId;
    if (onLoad) {
      onLoad(configId);
    }
  }
  
  async function handleDeleteConfig(configId: string) {
    if (!deleteConfirmId) {
      deleteConfirmId = configId;
      return;
    }
    
    if (deleteConfirmId !== configId) {
      deleteConfirmId = configId;
      return;
    }
    
    try {
      const result = await tpnConfigFirebaseService.deleteTPNConfiguration(configId);
      
      if (result.success) {
        configurations = configurations.filter(c => c.id !== configId);
        deleteConfirmId = null;
      } else {
        error = result.error || 'Failed to delete configuration';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    }
  }
  
  function cancelDelete() {
    deleteConfirmId = null;
  }
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  
  function getPopulationTypeLabel(type: PopulationType): string {
    const labels: Record<PopulationType, string> = {
      neo: 'Neonatal',
      child: 'Child',
      adolescent: 'Adolescent',
      adult: 'Adult'
    };
    return labels[type] || type;
  }
  
  function getPopulationTypeColor(type: PopulationType): string {
    const colors: Record<PopulationType, string> = {
      neo: 'badge-primary',
      child: 'badge-secondary',
      adolescent: 'badge-tertiary',
      adult: 'badge-success'
    };
    return colors[type] || 'badge-surface';
  }
  
  const filteredConfigurations = $derived(filterPopulationType === 'all' 
    ? configurations 
    : configurations.filter(c => c.populationType === filterPopulationType));
</script>

<div class="tpn-config-manager">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-xl font-semibold">TPN Configurations</h2>
    {#if onClose}
      <button 
        onclick={onClose}
        class="btn btn-sm variant-ghost-surface"
        aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    {/if}
  </div>
  
  {#if error}
    <div class="alert variant-filled-error mb-4">
      <div class="alert-message">
        <p>{error}</p>
      </div>
      <div class="alert-actions">
        <button onclick={() => error = null} class="btn btn-sm variant-filled">
          Dismiss
        </button>
      </div>
    </div>
  {/if}
  
  <div class="mb-4">
    <label class="label">
      <span>Filter by Population Type</span>
      <select 
        bind:value={filterPopulationType}
        class="select">
        <option value="all">All Types</option>
        <option value="neo">Neonatal</option>
        <option value="child">Child</option>
        <option value="adolescent">Adolescent</option>
        <option value="adult">Adult</option>
      </select>
    </label>
  </div>
  
  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="placeholder animate-pulse w-full">
        <div class="placeholder-content">Loading configurations...</div>
      </div>
    </div>
  {:else if filteredConfigurations.length === 0}
    <div class="text-center py-8">
      <p class="text-surface-600 dark:text-surface-400">
        {filterPopulationType === 'all' 
          ? 'No saved configurations found.'
          : `No ${getPopulationTypeLabel(filterPopulationType as PopulationType)} configurations found.`}
      </p>
      <p class="text-sm text-surface-500 dark:text-surface-500 mt-2">
        Save a configuration to see it here.
      </p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each filteredConfigurations as config (config.id)}
        <div class="card p-4 hover:variant-soft-primary transition-colors">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-lg">{config.name}</h3>
                <span class="badge {getPopulationTypeColor(config.populationType)}">
                  {getPopulationTypeLabel(config.populationType)}
                </span>
              </div>
              
              {#if config.description}
                <p class="text-sm text-surface-600 dark:text-surface-400 mb-2">
                  {config.description}
                </p>
              {/if}
              
              <div class="flex flex-wrap gap-4 text-sm text-surface-500">
                <span>
                  <strong>{config.ingredientCount}</strong> ingredients
                </span>
                <span>
                  <strong>{config.flexCount}</strong> flex configs
                </span>
                <span>
                  Updated: {formatDate(config.updatedAt)}
                </span>
              </div>
            </div>
            
            <div class="flex gap-2 ml-4">
              <button
                onclick={() => handleLoadConfig(config.id)}
                class="btn btn-sm variant-filled-primary"
                class:variant-soft-success={selectedConfigId === config.id}
                aria-label="Load configuration">
                {selectedConfigId === config.id ? 'Loaded' : 'Load'}
              </button>
              
              {#if deleteConfirmId === config.id}
                <button
                  onclick={() => handleDeleteConfig(config.id)}
                  class="btn btn-sm variant-filled-error"
                  aria-label="Confirm delete">
                  Confirm
                </button>
                <button
                  onclick={cancelDelete}
                  class="btn btn-sm variant-ghost-surface"
                  aria-label="Cancel delete">
                  Cancel
                </button>
              {:else}
                <button
                  onclick={() => handleDeleteConfig(config.id)}
                  class="btn btn-sm variant-ghost-error"
                  aria-label="Delete configuration">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <div class="mt-6 flex justify-end">
    <button 
      onclick={loadConfigurations}
      class="btn btn-sm variant-ghost-surface">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
      </svg>
      Refresh
    </button>
  </div>
</div>

<style>
  .tpn-config-manager {
    @apply w-full;
  }
</style>