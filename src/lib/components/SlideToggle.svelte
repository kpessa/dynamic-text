<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let { 
    checked = $bindable(false),
    disabled = false,
    label = ''
  } = $props();
  
  function handleToggle() {
    if (!disabled) {
      checked = !checked;
      dispatch('change', { checked });
    }
  }
</script>

<label 
  class="flex items-center space-x-2 cursor-pointer {disabled ? 'opacity-50 cursor-not-allowed' : ''}"
  on:click={handleToggle}
>
  <div 
    class="relative w-10 h-6 rounded-full transition-colors duration-200 {checked ? 'bg-primary-500' : 'bg-surface-300'}"
  >
    <div 
      class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 {checked ? 'translate-x-4' : ''}"
    ></div>
  </div>
  {#if label}
    <span>{label}</span>
  {/if}
</label>
