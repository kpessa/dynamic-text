<script lang="ts">
  import { onMount } from 'svelte';
  import { logUI } from '$lib/logger';
  
  interface Props {
    loader: () => Promise<any>;
    placeholder?: string;
    errorMessage?: string;
  }
  
  let { loader, placeholder = 'Loading...', errorMessage = 'Failed to load component' }: Props = $props();
  
  let Component: any = $state(null);
  let loading = $state(true);
  let error = $state<Error | null>(null);
  
  onMount(async () => {
    try {
      const module = await loader();
      Component = module.default || module;
      loading = false;
    } catch (err) {
      error = err as Error;
      loading = false;
      logUI.error('Failed to load lazy component', err as Error);
    }
  });
</script>

{#if loading}
  <div class="lazy-loading">
    {placeholder}
  </div>
{:else if error}
  <div class="lazy-error">
    {errorMessage}
  </div>
{:else if Component}
  <svelte:component this={Component} {...$$restProps} />
{/if}

<style>
  .lazy-loading {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
  }
  
  .lazy-error {
    padding: 1rem;
    text-align: center;
    color: var(--color-error);
    background: var(--color-error-bg);
    border-radius: 4px;
  }
</style>