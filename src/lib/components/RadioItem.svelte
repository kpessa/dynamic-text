<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let { 
    value = '', 
    label = '', 
    checked = false,
    disabled = false 
  } = $props();
  
  function handleClick() {
    if (!disabled) {
      dispatch('change', { value });
    }
  }
</script>

<label 
  class="flex items-center space-x-2 cursor-pointer {disabled ? 'opacity-50 cursor-not-allowed' : ''}"
  on:click={handleClick}
>
  <input 
    type="radio" 
    {value} 
    {checked} 
    {disabled}
    class="radio"
  />
  <span>{label}</span>
</label>
