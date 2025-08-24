<script lang="ts">
  import { toastStore } from '../stores/toastStore.ts';
  import { get } from 'svelte/store';
  
  let { position = 'tr' } = $props();
  
  // Use $state to manage the toasts reactively
  let toasts = $state(get(toastStore));
  
  // Subscribe to store changes
  $effect(() => {
    const unsubscribe = toastStore.subscribe(value => {
      toasts = value;
    });
    
    return unsubscribe;
  });
  
  function dismissToast(id: string) {
    toastStore.dismiss(id);
  }
  
  function getPresetClasses(preset: string) {
    switch (preset) {
      case 'success':
        return 'alert variant-filled-success';
      case 'error':
        return 'alert variant-filled-error';
      case 'warning':
        return 'alert variant-filled-warning';
      default:
        return 'alert variant-filled-primary';
    }
  }
  
  function getPositionClasses() {
    switch (position) {
      case 'tr':
        return 'top-4 right-4';
      case 'tl':
        return 'top-4 left-4';
      case 'br':
        return 'bottom-4 right-4';
      case 'bl':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  }
</script>

<div class="fixed z-50 {getPositionClasses()} space-y-2">
  {#each toasts as toast (toast.id)}
    <div class="{getPresetClasses(toast.preset)} p-4 max-w-sm">
      <div class="flex items-center justify-between">
        <span>{toast.message}</span>
        <button 
          class="btn-icon variant-ghost-surface ml-2"
          onclick={() => dismissToast(toast.id)}
          aria-label="Dismiss toast"
        >
          <span class="material-icons">close</span>
        </button>
      </div>
    </div>
  {/each}
</div>
