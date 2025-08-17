<script>
  import { onMount } from 'svelte';
  
  let theme = $state('auto');
  let mounted = $state(false);
  
  onMount(() => {
    // Get saved theme preference or default to auto
    const savedTheme = localStorage.getItem('theme') || 'auto';
    theme = savedTheme;
    applyTheme(savedTheme);
    mounted = true;
  });
  
  function applyTheme(newTheme) {
    // Remove all theme classes
    document.documentElement.removeAttribute('data-theme');
    
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (newTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    // Auto mode relies on prefers-color-scheme media query
  }
  
  function toggleTheme() {
    const themes = ['auto', 'light', 'dark'];
    const currentIndex = themes.indexOf(theme);
    const newTheme = themes[(currentIndex + 1) % themes.length];
    
    theme = newTheme;
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }
  
  // Listen for system theme changes
  $effect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'auto') {
        applyTheme('auto');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  });
  
  // Compute the icon based on current theme
  const icon = $derived(() => {
    switch (theme) {
      case 'dark':
        return '🌙';
      case 'light':
        return '☀️';
      case 'auto':
        return '🔄';
      default:
        return '🔄';
    }
  });
  
  // Compute the label based on current theme
  const label = $derived(() => {
    switch (theme) {
      case 'dark':
        return 'Dark Mode';
      case 'light':
        return 'Light Mode';
      case 'auto':
        return 'Auto Mode';
      default:
        return 'Auto Mode';
    }
  });
</script>

<button
  class="dark-mode-toggle"
  onclick={toggleTheme}
  aria-label="Toggle theme: {label()}"
  title="Current: {label()}"
>
  <span class="icon" aria-hidden="true">{icon()}</span>
  <span class="label">{label()}</span>
</button>

<style lang="scss">
  .dark-mode-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-normal);
    
    &:hover {
      background-color: var(--color-surface-secondary);
      border-color: var(--color-border-dark);
    }
    
    &:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
    }
    
    .icon {
      font-size: 1.125rem;
      line-height: 1;
    }
    
    .label {
      @media (max-width: 640px) {
        display: none;
      }
    }
  }
</style>