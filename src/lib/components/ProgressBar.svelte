<script>
  let { 
    value = undefined,
    max = 100,
    indeterminate = false,
    height = 'h-2',
    meter = 'variant-filled-primary',
    track = 'bg-surface-200-700-token'
  } = $props();
</script>

<div class="w-full {track} {height} rounded-full overflow-hidden">
  {#if indeterminate || value === undefined}
    <div class="h-full {meter} animate-pulse"></div>
  {:else}
    <div 
      class="h-full {meter} transition-all duration-300"
      style="width: {(value / max) * 100}%"
    ></div>
  {/if}
</div>