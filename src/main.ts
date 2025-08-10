import { mount } from 'svelte'
import './app.css'

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
    console.error('[App] Failed to initialize application:', error)
    
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
            <pre style="background: white; padding: 1rem; border-radius: 4px; overflow: auto; font-size: 0.85rem;">${error.stack || error.message}</pre>
          </details>
        </div>
      `
    }
    
    throw error
  }
}

// Background initialization of non-critical services
async function initializeBackgroundServices() {
  // Disabled for debugging - all background services removed
  console.log('[App] Background services disabled for debugging')
}

// Initialize app
const app = await initializeApp()

export default app

// Hot module replacement for development
if (import.meta.hot) {
  import.meta.hot.accept()
}
