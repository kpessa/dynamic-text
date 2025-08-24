<script>
  import { onMount } from 'svelte';
  
  let isDark = $state(false);
  
  onMount(() => {
    // Check current theme
    const currentTheme = document.documentElement.getAttribute('data-theme');
    isDark = currentTheme === 'dark';
    
    // Listen for theme changes from other sources
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const newTheme = document.documentElement.getAttribute('data-theme');
          isDark = newTheme === 'dark';
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  });
  
  function toggleTheme() {
    isDark = !isDark;
    const newTheme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Store preference in localStorage
    localStorage.setItem('theme', newTheme);
  }
</script>

<button 
  class="btn-icon variant-ghost-surface"
  on:click={toggleTheme}
  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if isDark}
    <span class="material-icons">light_mode</span>
  {:else}
    <span class="material-icons">dark_mode</span>
  {/if}
</button>
