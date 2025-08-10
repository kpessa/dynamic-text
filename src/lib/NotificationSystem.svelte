<script>
  let { notifications = [] } = $props();
  
  let notificationContainer;
  
  // Auto-dismiss notifications after 5 seconds
  $effect(() => {
    notifications.forEach((notification, index) => {
      if (!notification.persistent) {
        setTimeout(() => {
          removeNotification(index);
        }, 5000);
      }
    });
  });
  
  function removeNotification(index) {
    if (notifications[index]) {
      // Add exit animation class
      const element = notificationContainer?.children[index];
      if (element) {
        element.classList.add('notification-exit');
        setTimeout(() => {
          notifications.splice(index, 1);
          notifications = [...notifications];
        }, 300);
      }
    }
  }
  
  function getIconForType(type) {
    const icons = {
      success: '✓',
      warning: '⚠',
      error: '✗',
      info: 'ℹ',
      medical: '🏥'
    };
    return icons[type] || 'ℹ';
  }
</script>

<div class="notification-container" bind:this={notificationContainer}>
  {#each notifications as notification, index}
    <div class="notification notification--{notification.type} animate-slide-left">
      <div class="notification-content">
        <div class="notification-icon icon-badge icon-badge--{notification.type}">
          {getIconForType(notification.type)}
        </div>
        
        <div class="notification-body">
          <div class="notification-title">{notification.title}</div>
          {#if notification.message}
            <div class="notification-message">{notification.message}</div>
          {/if}
        </div>
        
        {#if notification.action}
          <button 
            class="notification-action"
            onclick={notification.action.handler}
          >
            {notification.action.label}
          </button>
        {/if}
        
        <button 
          class="notification-close"
          onclick={() => removeNotification(index)}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
      
      {#if !notification.persistent}
        <div class="notification-progress">
          <div class="notification-progress-bar"></div>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .notification-container {
    position: fixed;
    top: var(--space-6);
    right: var(--space-6);
    z-index: var(--z-notification);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 420px;
    width: 100%;
    pointer-events: none;
  }
  
  .notification {
    pointer-events: auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-2xl);
    overflow: hidden;
    position: relative;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transition: all var(--duration-normal) var(--ease-out);
  }
  
  .notification.notification-exit {
    animation: notification-exit var(--duration-normal) var(--ease-out) forwards;
  }
  
  @keyframes notification-exit {
    to {
      opacity: 0;
      transform: translateX(100%) scale(0.9);
    }
  }
  
  .notification-content {
    padding: var(--space-4);
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }
  
  .notification-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
  }
  
  .notification-body {
    flex: 1;
    min-width: 0;
  }
  
  .notification-title {
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-1) 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
  }
  
  .notification-message {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
  }
  
  .notification-action {
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border: none;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }
  
  .notification-action:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
  }
  
  .notification-close {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-1);
    color: var(--color-text-tertiary);
    border-radius: var(--radius-base);
    transition: all var(--transition-fast);
    flex-shrink: 0;
    font-size: var(--font-size-lg);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .notification-close:hover {
    background: var(--color-state-hover);
    color: var(--color-text-primary);
  }
  
  .notification-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--color-surface-elevated);
    overflow: hidden;
  }
  
  .notification-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, 
      var(--color-primary) 0%, 
      var(--color-primary-400) 100%);
    animation: notification-progress 5s linear forwards;
  }
  
  @keyframes notification-progress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
  
  /* Notification variants */
  .notification--success {
    border-left: 4px solid var(--color-success-500);
  }
  
  .notification--warning {
    border-left: 4px solid var(--color-warning-500);
  }
  
  .notification--error {
    border-left: 4px solid var(--color-danger-500);
  }
  
  .notification--info {
    border-left: 4px solid var(--color-info-500);
  }
  
  .notification--medical {
    border-left: 4px solid var(--color-primary-500);
    background: linear-gradient(135deg, 
      var(--color-surface) 0%, 
      var(--color-primary-50) 100%);
  }
  
  .notification--success .notification-progress-bar {
    background: linear-gradient(90deg, 
      var(--color-success-500) 0%, 
      var(--color-success-400) 100%);
  }
  
  .notification--warning .notification-progress-bar {
    background: linear-gradient(90deg, 
      var(--color-warning-500) 0%, 
      var(--color-warning-400) 100%);
  }
  
  .notification--error .notification-progress-bar {
    background: linear-gradient(90deg, 
      var(--color-danger-500) 0%, 
      var(--color-danger-400) 100%);
  }
  
  .notification--info .notification-progress-bar {
    background: linear-gradient(90deg, 
      var(--color-info-500) 0%, 
      var(--color-info-400) 100%);
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .notification-container {
      top: var(--space-4);
      left: var(--space-4);
      right: var(--space-4);
      max-width: none;
    }
    
    .notification-content {
      padding: var(--space-3);
    }
    
    .notification-title,
    .notification-message {
      font-size: var(--font-size-sm);
    }
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .notification {
      border-width: 2px;
    }
    
    .notification--success {
      border-left-width: 6px;
    }
    
    .notification--warning {
      border-left-width: 6px;
    }
    
    .notification--error {
      border-left-width: 6px;
    }
    
    .notification--info {
      border-left-width: 6px;
    }
    
    .notification--medical {
      border-left-width: 6px;
    }
  }
</style>