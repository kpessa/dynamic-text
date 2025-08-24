<script lang="ts">
  import { getToastStore } from './stores/toastStore.ts';
  import Modal from './components/Modal.svelte';
  import Toast from './components/Toast.svelte';
  import { onMount } from 'svelte';
  
  let { children } = $props();
  
  // Get toast store for global access
  const toastStore = getToastStore();
  
  // Example toast utility functions
  export function showToast(message: string, preset = 'primary') {
    toastStore.trigger({
      message,
      preset,
      timeout: 3000
    });
  }
  
  export function showSuccess(message: string) {
    toastStore.trigger({
      message,
      preset: 'success',
      timeout: 3000
    });
  }
  
  export function showError(message: string) {
    toastStore.trigger({
      message,
      preset: 'error',
      timeout: 5000
    });
  }
  
  export function showWarning(message: string) {
    toastStore.trigger({
      message,
      preset: 'warning',
      timeout: 4000
    });
  }
  
  onMount(() => {
    // Make toast utilities globally available
    if (typeof window !== 'undefined') {
      (window as any).skeletonToast = {
        show: showToast,
        success: showSuccess,
        error: showError,
        warning: showWarning
      };
    }
  });
</script>

<!-- Toast notifications -->
<Toast position="tr" />

<!-- Modal provider -->
<Modal />

<!-- Drawer provider - not implemented yet -->

<!-- Render children -->
{@render children?.()}