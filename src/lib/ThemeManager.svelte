<script>
  import { onMount } from 'svelte';
  import Icons from './Icons.svelte';
  
  // Theme state
  let currentTheme = $state('light');
  let isThemeTransitioning = $state(false);
  
  // Initialize theme from localStorage or system preference
  onMount(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      currentTheme = savedTheme;
    } else {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      currentTheme = prefersDark ? 'dark' : 'light';
    }
    
    // Apply theme immediately
    applyTheme(currentTheme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      if (!localStorage.getItem('app-theme')) {
        currentTheme = e.matches ? 'dark' : 'light';
        applyTheme(currentTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // Listen for storage changes (cross-tab sync)
    const handleStorageChange = (e) => {
      if (e.key === 'app-theme' && e.newValue) {
        currentTheme = e.newValue;
        applyTheme(currentTheme);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  });
  
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = theme === 'dark' ? '#1a1a1a' : '#ffffff';
    }
  }
  
  function toggleTheme() {
    isThemeTransitioning = true;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    currentTheme = newTheme;
    
    // Save preference
    localStorage.setItem('app-theme', newTheme);
    
    // Apply theme
    applyTheme(newTheme);
    
    // Reset transition state
    setTimeout(() => {
      isThemeTransitioning = false;
    }, 300);
  }
  
  
  function getThemeLabel() {
    return currentTheme === 'light' ? 'Dark mode' : 'Light mode';
  }
</script>

<button 
  class="theme-toggle {isThemeTransitioning ? 'transitioning' : ''}"
  onclick={toggleTheme}
  title="Switch to {currentTheme === 'light' ? 'dark' : 'light'} mode"
  aria-label="Toggle {currentTheme === 'light' ? 'dark' : 'light'} mode"
  aria-describedby="theme-description"
  data-theme={currentTheme}
>
  <span class="theme-icon" aria-hidden="true">
    <Icons icon={currentTheme === 'light' ? 'sun' : 'moon'} size={20} />
  </span>
  <span class="theme-label" aria-hidden="true">{getThemeLabel()}</span>
</button>

<span id="theme-description" class="sr-only">
  Currently in {currentTheme} mode. Click to switch to {currentTheme === 'light' ? 'dark' : 'light'} mode.
</span>

<style>
  .theme-toggle {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100));
    border: 1px solid var(--color-primary-200);
    color: var(--color-primary-900);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 40px; /* Desktop standard */
    white-space: nowrap;
  }
  
  .theme-toggle[data-theme="dark"] {
    background: linear-gradient(135deg, var(--color-gray-800), var(--color-gray-700));
    border-color: var(--color-gray-600);
    color: var(--color-gray-100);
  }
  
  .theme-toggle:hover:not(.transitioning) {
    transform: translateY(-1px) scale(1.02);
    box-shadow: var(--shadow-md);
  }
  
  .theme-toggle:active:not(.transitioning) {
    transform: translateY(0) scale(0.98);
  }
  
  .theme-toggle.transitioning {
    pointer-events: none;
    animation: theme-switching 300ms ease-out;
  }
  
  @keyframes theme-switching {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; transform: scale(0.95); }
  }
  
  .theme-icon {
    font-size: 1.25rem;
    display: inline-flex;
    align-items: center;
    transition: transform var(--transition-fast);
  }
  
  .theme-toggle:hover .theme-icon {
    transform: rotate(-10deg) scale(1.1);
  }
  
  .theme-toggle.transitioning .theme-icon {
    animation: theme-icon-flip 300ms ease-out;
  }
  
  @keyframes theme-icon-flip {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(0.8); }
    100% { transform: rotate(360deg) scale(1); }
  }
  
  .theme-label {
    font-size: var(--font-size-sm);
    opacity: 0.9;
    transition: opacity var(--transition-fast);
  }
  
  .theme-toggle:hover .theme-label {
    opacity: 1;
  }
  
  /* Dark mode indicator */
  .theme-toggle[data-theme="dark"]::after {
    content: '';
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    background: radial-gradient(circle, #ffd700, #ffed4e);
    border-radius: 50%;
    animation: pulse 2s infinite;
    pointer-events: none;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
  }
  
  /* Accessibility */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  /* Mobile adjustments */
  @media (max-width: 768px) {
    .theme-toggle {
      min-height: 44px; /* iOS standard */
      min-width: 44px;
      padding: 0.5rem;
    }
    
    .theme-label {
      display: none; /* Hide label on mobile to save space */
    }
    
    .theme-icon {
      font-size: 1.5rem;
    }
  }
  
  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .theme-toggle,
    .theme-icon,
    .theme-toggle.transitioning {
      animation: none !important;
      transition-duration: 0.01ms !important;
    }
    
    .theme-toggle:hover .theme-icon {
      transform: none;
    }
  }
</style>