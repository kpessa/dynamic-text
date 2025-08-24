<script>
  import { getToastStore } from './stores/toastStore.ts';
  import { onMount } from 'svelte';
  
  const toastStore = getToastStore();
  
  // Export notification functions for use by other components
  export function showSuccess(message, duration = 3000) {
    toastStore.trigger({
      message,
      preset: 'success',
      timeout: duration,
      hideDismiss: false
    });
  }
  
  export function showError(message, duration = 5000) {
    toastStore.trigger({
      message,
      preset: 'error',
      timeout: duration,
      hideDismiss: false
    });
  }
  
  export function showWarning(message, duration = 4000) {
    toastStore.trigger({
      message,
      preset: 'warning',
      timeout: duration,
      hideDismiss: false
    });
  }
  
  export function showInfo(message, duration = 3000) {
    toastStore.trigger({
      message,
      preset: 'primary',
      timeout: duration,
      hideDismiss: false
    });
  }
  
  export function showCustom(options) {
    toastStore.trigger({
      message: options.message || '',
      background: options.background || 'variant-filled-surface',
      timeout: options.timeout || 3000,
      hideDismiss: options.hideDismiss || false,
      action: options.action || undefined,
      callback: options.callback || undefined,
      classes: options.classes || ''
    });
  }
  
  // Medical-specific notification presets
  export function showMedicalAlert(message, severity = 'medium') {
    const severityConfig = {
      low: {
        background: 'variant-filled-success',
        icon: '✓',
        timeout: 3000
      },
      medium: {
        background: 'variant-filled-warning',
        icon: '⚠',
        timeout: 5000
      },
      high: {
        background: 'variant-filled-error',
        icon: '⚠️',
        timeout: 10000
      },
      critical: {
        background: 'bg-red-900 text-white',
        icon: '🚨',
        timeout: 0 // Don't auto-dismiss critical alerts
      }
    };
    
    const config = severityConfig[severity] || severityConfig.medium;
    
    toastStore.trigger({
      message: `${config.icon} ${message}`,
      background: config.background,
      timeout: config.timeout,
      hideDismiss: severity === 'critical' ? false : true,
      classes: severity === 'critical' ? 'animate-pulse' : ''
    });
  }
  
  // Show validation results
  export function showValidationResults(passed, failed, warnings = 0) {
    let message = '';
    let preset = 'primary';
    
    if (failed > 0) {
      message = `❌ Validation Failed: ${failed} error${failed !== 1 ? 's' : ''}`;
      preset = 'error';
    } else if (warnings > 0) {
      message = `⚠️ Validation Passed with ${warnings} warning${warnings !== 1 ? 's' : ''}`;
      preset = 'warning';
    } else if (passed > 0) {
      message = `✅ All ${passed} validation${passed !== 1 ? 's' : ''} passed!`;
      preset = 'success';
    }
    
    if (message) {
      toastStore.trigger({
        message,
        preset,
        timeout: 4000
      });
    }
  }
  
  // Show save status
  export function showSaveStatus(success = true, itemName = 'Document') {
    if (success) {
      showSuccess(`${itemName} saved successfully`);
    } else {
      showError(`Failed to save ${itemName}. Please try again.`);
    }
  }
  
  // Show sync status
  export function showSyncStatus(status) {
    const statusMessages = {
      syncing: '🔄 Syncing with server...',
      synced: '✅ All changes synced',
      offline: '📴 Working offline - changes will sync when connected',
      error: '❌ Sync failed - retrying...'
    };
    
    const message = statusMessages[status] || statusMessages.syncing;
    const preset = status === 'error' ? 'error' : status === 'offline' ? 'warning' : 'primary';
    
    toastStore.trigger({
      message,
      preset,
      timeout: status === 'syncing' ? 0 : 3000
    });
  }
  
  // Firebase operation notifications
  export function showFirebaseOperation(operation, success = true) {
    const operations = {
      create: success ? '✨ Created successfully' : '❌ Creation failed',
      update: success ? '✅ Updated successfully' : '❌ Update failed',
      delete: success ? '🗑️ Deleted successfully' : '❌ Deletion failed',
      import: success ? '📥 Import completed' : '❌ Import failed',
      export: success ? '📤 Export completed' : '❌ Export failed'
    };
    
    const message = operations[operation] || (success ? '✅ Operation completed' : '❌ Operation failed');
    
    if (success) {
      showSuccess(message);
    } else {
      showError(message);
    }
  }
  
  // Test execution notifications
  export function showTestResults(tests) {
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const skipped = tests.filter(t => t.status === 'skipped').length;
    const total = tests.length;
    
    let message = `Test Results: `;
    let parts = [];
    
    if (passed > 0) parts.push(`✅ ${passed} passed`);
    if (failed > 0) parts.push(`❌ ${failed} failed`);
    if (skipped > 0) parts.push(`⊘ ${skipped} skipped`);
    
    message += parts.join(', ');
    
    const preset = failed > 0 ? 'error' : passed === total ? 'success' : 'warning';
    
    toastStore.trigger({
      message,
      preset,
      timeout: 5000
    });
  }
  
  // Connection status monitor
  let isOnline = $state(true);
  
  onMount(() => {
    // Monitor online/offline status
    function handleOnline() {
      isOnline = true;
      showInfo('✅ Back online');
    }
    
    function handleOffline() {
      isOnline = false;
      showWarning('📴 Connection lost - working offline');
    }
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial status
    isOnline = navigator.onLine;
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });
</script>

<!-- Component is headless - all functionality is exported -->
<!-- The Toast component from Skeleton handles the UI rendering -->

<style>
  /* Custom styles for medical alerts if needed */
  :global(.toast-medical-critical) {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
</style>