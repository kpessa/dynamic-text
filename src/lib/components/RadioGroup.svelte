<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let { value = $bindable() } = $props();
  
  function handleChange(newValue: string) {
    value = newValue;
    dispatch('change', { value });
  }
</script>

<div class="space-y-2" role="radiogroup">
  <slot {value} {handleChange} />
</div>
