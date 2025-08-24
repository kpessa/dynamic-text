<script>
  import { getModalStore } from './stores/modalStore.js';
import { getToastStore } from './stores/toastStore.ts';
import LightSwitch from './components/LightSwitch.svelte';
import RadioGroup from './components/RadioGroup.svelte';
import RadioItem from './components/RadioItem.svelte';
import SlideToggle from './components/SlideToggle.svelte';
  import { onMount } from 'svelte';
  
  const modalStore = getModalStore();
  
  let theme = $state('auto');
  let fontSize = $state('medium');
  let autoSave = $state(true);
  let showLineNumbers = $state(true);
  let enableSyntaxHighlighting = $state(true);
  let wrapLines = $state(false);
  let enableAnimations = $state(true);
  let enableShortcuts = $state(true);

  export function open() {
    loadPreferences();
    modalStore.trigger({
      type: 'component',
      component: 'preferencesModal'
    });
  }

  function handleSave() {
    // Save preferences to localStorage
    const preferences = {
      theme,
      fontSize,
      autoSave,
      showLineNumbers,
      enableSyntaxHighlighting,
      wrapLines,
      enableAnimations,
      enableShortcuts
    };
    
    localStorage.setItem('dynamicTextPreferences', JSON.stringify(preferences));
    
    // Apply font size
    document.documentElement.style.setProperty('--editor-font-size', 
      fontSize === 'small' ? '12px' : 
      fontSize === 'large' ? '16px' : '14px'
    );
    
    // Show success toast
    const toastStore = getToastStore();
    toastStore?.trigger({
      message: 'Preferences saved successfully',
      preset: 'success',
      timeout: 3000
    });
    
    modalStore.close();
  }

  function loadPreferences() {
    try {
      const saved = localStorage.getItem('dynamicTextPreferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        theme = prefs.theme || 'auto';
        fontSize = prefs.fontSize || 'medium';
        autoSave = prefs.autoSave ?? true;
        showLineNumbers = prefs.showLineNumbers ?? true;
        enableSyntaxHighlighting = prefs.enableSyntaxHighlighting ?? true;
        wrapLines = prefs.wrapLines ?? false;
        enableAnimations = prefs.enableAnimations ?? true;
        enableShortcuts = prefs.enableShortcuts ?? true;
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
  }

  function resetToDefaults() {
    theme = 'auto';
    fontSize = 'medium';
    autoSave = true;
    showLineNumbers = true;
    enableSyntaxHighlighting = true;
    wrapLines = false;
    enableAnimations = true;
    enableShortcuts = true;
  }

  onMount(() => {
    loadPreferences();
  });
</script>

<div class="card p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
  <header class="mb-6">
    <h2 class="h3 font-bold">⚙️ Preferences</h2>
    <p class="text-surface-600-300-token">Customize your Dynamic Text Editor experience</p>
  </header>
  
  <div class="space-y-8">
    <!-- Appearance Section -->
    <section class="space-y-4">
      <h3 class="h4 font-semibold border-b border-surface-300-600-token pb-2">
        🎨 Appearance
      </h3>
      
      <!-- Theme Switcher -->
      <div class="card variant-soft p-4">
        <label class="label mb-2">
          <span>Theme Mode</span>
        </label>
        <LightSwitch />
        <p class="text-sm text-surface-600-300-token mt-2">
          Toggle between light and dark theme
        </p>
      </div>
      
      <!-- Font Size -->
      <div>
        <label class="label">
          <span>Editor Font Size</span>
        </label>
        <RadioGroup>
          <RadioItem bind:group={fontSize} name="fontSize" value="small">
            <span>Small (12px)</span>
          </RadioItem>
          <RadioItem bind:group={fontSize} name="fontSize" value="medium">
            <span>Medium (14px)</span>
          </RadioItem>
          <RadioItem bind:group={fontSize} name="fontSize" value="large">
            <span>Large (16px)</span>
          </RadioItem>
        </RadioGroup>
      </div>
      
      <!-- Animations -->
      <SlideToggle 
        name="enable-animations" 
        bind:checked={enableAnimations}
        active="bg-primary-500"
      >
        Enable UI animations
      </SlideToggle>
    </section>
    
    <!-- Editor Section -->
    <section class="space-y-4">
      <h3 class="h4 font-semibold border-b border-surface-300-600-token pb-2">
        ✏️ Editor Settings
      </h3>
      
      <div class="space-y-3">
        <SlideToggle 
          name="show-line-numbers" 
          bind:checked={showLineNumbers}
          active="bg-primary-500"
        >
          Show line numbers
        </SlideToggle>
        
        <SlideToggle 
          name="syntax-highlighting" 
          bind:checked={enableSyntaxHighlighting}
          active="bg-primary-500"
        >
          Enable syntax highlighting
        </SlideToggle>
        
        <SlideToggle 
          name="wrap-lines" 
          bind:checked={wrapLines}
          active="bg-primary-500"
        >
          Wrap long lines
        </SlideToggle>
      </div>
    </section>
    
    <!-- Behavior Section -->
    <section class="space-y-4">
      <h3 class="h4 font-semibold border-b border-surface-300-600-token pb-2">
        ⚡ Behavior
      </h3>
      
      <div class="space-y-3">
        <SlideToggle 
          name="auto-save" 
          bind:checked={autoSave}
          active="bg-primary-500"
        >
          <span>Auto-save changes</span>
          <span class="text-sm text-surface-600-300-token ml-2">
            (Saves automatically every 30 seconds)
          </span>
        </SlideToggle>
        
        <SlideToggle 
          name="enable-shortcuts" 
          bind:checked={enableShortcuts}
          active="bg-primary-500"
        >
          <span>Enable keyboard shortcuts</span>
          <span class="text-sm text-surface-600-300-token ml-2">
            (Ctrl+S to save, Ctrl+N for new, etc.)
          </span>
        </SlideToggle>
      </div>
    </section>
    
    <!-- Keyboard Shortcuts Reference -->
    {#if enableShortcuts}
      <section class="space-y-4">
        <h3 class="h4 font-semibold border-b border-surface-300-600-token pb-2">
          ⌨️ Keyboard Shortcuts
        </h3>
        
        <div class="table-container">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>Action</th>
                <th>Windows/Linux</th>
                <th>macOS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Save</td>
                <td><kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">S</kbd></td>
                <td><kbd class="kbd">⌘</kbd> + <kbd class="kbd">S</kbd></td>
              </tr>
              <tr>
                <td>New Document</td>
                <td><kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">N</kbd></td>
                <td><kbd class="kbd">⌘</kbd> + <kbd class="kbd">N</kbd></td>
              </tr>
              <tr>
                <td>Export</td>
                <td><kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">E</kbd></td>
                <td><kbd class="kbd">⌘</kbd> + <kbd class="kbd">E</kbd></td>
              </tr>
              <tr>
                <td>Search</td>
                <td><kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">F</kbd></td>
                <td><kbd class="kbd">⌘</kbd> + <kbd class="kbd">F</kbd></td>
              </tr>
              <tr>
                <td>Preferences</td>
                <td><kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">,</kbd></td>
                <td><kbd class="kbd">⌘</kbd> + <kbd class="kbd">,</kbd></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    {/if}
  </div>
  
  <footer class="flex justify-between items-center mt-8 pt-6 border-t border-surface-300-600-token">
    <button 
      class="btn variant-ghost-warning"
      onclick={resetToDefaults}
    >
      Reset to Defaults
    </button>
    
    <div class="flex gap-3">
      <button 
        class="btn variant-ghost"
        onclick={() => modalStore.close()}
      >
        Cancel
      </button>
      <button 
        class="btn variant-filled-primary"
        onclick={handleSave}
      >
        Save Preferences
      </button>
    </div>
  </footer>
</div>