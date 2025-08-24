import { mount } from 'svelte'
import './styles/global.css' // Import global theme styles
import './app.css'  // Import Tailwind/Skeleton styles
import './app.scss' // Then our custom SCSS
import { healthMonitor } from './lib/services/healthMonitor'
import { logError, logWarn } from '$lib/logger';

// Initialize theme from localStorage
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Default to light theme
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

// Initialize theme before app loads
initializeTheme();

// Simple, non-blocking app initialization to fix freezing issues
async function initializeApp() {
  try {
    console.log('[App] Starting initialization...')
    
    // Import and mount the app directly without complex initialization
    const { default: App } = await import('./App.svelte')
    
    const target = document.getElementById('app')
    if (!target) {
      throw new Error('Could not find app element')
    }
    
    console.log('[App] Mounting app component...')
    const app = mount(App, { target })
    
    console.log('[App] App mounted successfully')
    
    // Initialize non-critical services in background (after app loads)
    setTimeout(() => {
      initializeBackgroundServices()
    }, 1000)
    
    return app
    
  } catch (error) {
    logError('[App] Failed to initialize application:', error instanceof Error ? error : new Error(String(error)))
    
    // Report to health monitor
    healthMonitor.reportComponentError('App', error as Error)
    
    // Show simple error message
    const target = document.getElementById('app')
    if (target) {
      target.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; color: #721c24; background: #f8d7da; padding: 2rem;">
          <h1>Application Error</h1>
          <p>The TPN Dynamic Text Editor failed to load.</p>
          <button onclick="window.location.reload()" style="padding: 0.75rem 2rem; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Reload Application
          </button>
          <details style="margin-top: 1rem;">
            <summary>Technical Details</summary>
            <pre style="background: white; padding: 1rem; border-radius: 4px; overflow: auto; font-size: 0.85rem;">${(error as Error).stack || (error as Error).message}</pre>
          </details>
        </div>
      `
    }
    
    throw error
  }
}

// Background initialization of non-critical services
async function initializeBackgroundServices() {
  try {
    // Initialize KPT namespace on window
    if (typeof window !== 'undefined') {
      const { initializeKPTCustomFunctions, createKPTNamespace } = await import('./lib/kptNamespace');
      
      // Initialize custom functions from localStorage
      initializeKPTCustomFunctions();
      
      // Create the base KPT namespace if it doesn't exist
      if (!window.kpt) {
        window.kpt = createKPTNamespace();
      }
      
      console.log('[KPT] Custom functions initialized successfully');
    }
  } catch (error) {
    logWarn('[KPT] Failed to initialize custom functions:', String(error));
  }
  
  console.log('[App] Background services initialization complete')
}

// Initialize app
const app = await initializeApp()

export default app

// Hot module replacement for development
if (import.meta.hot) {
  import.meta.hot.accept()
}
