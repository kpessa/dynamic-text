<script lang="ts">
  import { modalStore } from '../stores/modalStore.js';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  function closeModal() {
    modalStore.close();
    dispatch('close');
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
</script>

{#if $modalStore.isOpen}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    on:click={handleBackdropClick}
    role="dialog"
    aria-modal="true"
  >
    <div class="card p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="h3 font-bold">Modal</h2>
        <button 
          class="btn-icon variant-ghost-surface"
          on:click={closeModal}
          aria-label="Close modal"
        >
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <div class="space-y-4">
        {#if $modalStore.component}
          <svelte:component this={$modalStore.component as any} {...$modalStore.props} />
        {:else}
          <p>No component specified</p>
        {/if}
      </div>
    </div>
  </div>
{/if}
