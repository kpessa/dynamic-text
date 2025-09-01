<script lang="ts">
  import { onMount } from 'svelte';
  
  let isEmulatorMode = $state(false);
  let emulatorStatus = $state<{
    firestore: boolean;
    auth: boolean;
    storage: boolean;
  }>({
    firestore: false,
    auth: false,
    storage: false
  });

  onMount(() => {
    // Check if we're using the emulator
    isEmulatorMode = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
    
    if (isEmulatorMode) {
      checkEmulatorStatus();
      // Check status periodically
      const interval = setInterval(checkEmulatorStatus, 30000); // Every 30 seconds
      
      return () => clearInterval(interval);
    }
  });

  async function checkEmulatorStatus() {
    const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
    
    // Check Firestore
    try {
      const firestorePort = import.meta.env.VITE_FIREBASE_FIRESTORE_PORT || 8080;
      const response = await fetch(`http://${host}:${firestorePort}`, { 
        method: 'HEAD',
        mode: 'no-cors'
      }).catch(() => null);
      emulatorStatus.firestore = true;
    } catch {
      emulatorStatus.firestore = false;
    }
    
    // Check Auth
    try {
      const authPort = import.meta.env.VITE_FIREBASE_AUTH_PORT || 9099;
      const response = await fetch(`http://${host}:${authPort}`, {
        method: 'HEAD',
        mode: 'no-cors'
      }).catch(() => null);
      emulatorStatus.auth = true;
    } catch {
      emulatorStatus.auth = false;
    }
    
    // Check Storage
    try {
      const storagePort = import.meta.env.VITE_FIREBASE_STORAGE_PORT || 9199;
      const response = await fetch(`http://${host}:${storagePort}`, {
        method: 'HEAD',
        mode: 'no-cors'
      }).catch(() => null);
      emulatorStatus.storage = true;
    } catch {
      emulatorStatus.storage = false;
    }
  }

  function openEmulatorUI() {
    const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
    const uiPort = import.meta.env.VITE_FIREBASE_UI_PORT || 4000;
    window.open(`http://${host}:${uiPort}`, '_blank');
  }
</script>

{#if isEmulatorMode}
  <div 
    class="emulator-indicator"
    data-testid="emulator-indicator"
    role="status"
    aria-label="Firebase Emulator Status"
  >
    <div class="indicator-content">
      <span class="indicator-badge">
        🔧 EMULATOR MODE
      </span>
      
      <div class="service-status">
        <span 
          class="service"
          class:active={emulatorStatus.firestore}
          title={emulatorStatus.firestore ? 'Firestore connected' : 'Firestore offline'}
        >
          Firestore
        </span>
        <span 
          class="service"
          class:active={emulatorStatus.auth}
          title={emulatorStatus.auth ? 'Auth connected' : 'Auth offline'}
        >
          Auth
        </span>
        <span 
          class="service"
          class:active={emulatorStatus.storage}
          title={emulatorStatus.storage ? 'Storage connected' : 'Storage offline'}
        >
          Storage
        </span>
      </div>
      
      <button
        class="ui-button"
        onclick={openEmulatorUI}
        title="Open Firebase Emulator UI"
      >
        Open UI
      </button>
    </div>
    
    <div class="warning-message" data-testid="emulator-warning">
      ⚠️ Development mode - Data is not persisted to production
    </div>
  </div>
{/if}

<style>
  .emulator-indicator {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
    font-size: 12px;
    z-index: 9999;
    max-width: 280px;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .indicator-content {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .indicator-badge {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .service-status {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }

  .service {
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.2);
    font-size: 10px;
    opacity: 0.7;
    transition: all 0.3s ease;
  }

  .service.active {
    background: rgba(72, 187, 120, 0.9);
    opacity: 1;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3);
  }

  .ui-button {
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.25);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .ui-button:hover {
    background: rgba(255, 255, 255, 0.35);
    transform: translateY(-1px);
  }

  .warning-message {
    font-size: 11px;
    opacity: 0.95;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .emulator-indicator {
      background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
    }
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .emulator-indicator {
      bottom: 10px;
      right: 10px;
      left: 10px;
      max-width: none;
    }

    .indicator-content {
      flex-wrap: wrap;
    }

    .service-status {
      width: 100%;
      justify-content: space-around;
      margin-top: 8px;
    }
  }
</style>