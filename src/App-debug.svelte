<script>
  import { onMount } from 'svelte';
  
  let mounted = false;
  let error = null;
  
  onMount(() => {
    console.log('[Debug] App component mounted');
    mounted = true;
  });
  
  function handleError(e) {
    console.error('[Debug] Component error:', e);
    error = e.message || 'Unknown error';
  }
</script>

<div>
  {#if error}
    <div style="padding: 2rem; background: #fee; color: #800; border: 1px solid #fcc;">
      <h2>Component Error</h2>
      <pre>{error}</pre>
    </div>
  {:else if !mounted}
    <div style="padding: 2rem;">
      <h2>Loading...</h2>
    </div>
  {:else}
    <div style="padding: 2rem;">
      <h1>Debug App</h1>
      <p>If you see this, the basic Svelte app is working.</p>
    </div>
  {/if}
</div>