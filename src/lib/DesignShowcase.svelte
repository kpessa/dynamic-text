<script>
  import { logger } from './logger';
  
  // Design system showcase component for testing and documentation
  let activeSection = $state('colors');
  
  const sections = [
    { id: 'colors', name: 'Colors', icon: '🎨' },
    { id: 'typography', name: 'Typography', icon: '✒️' },
    { id: 'components', name: 'Components', icon: '🧩' },
    { id: 'animations', name: 'Animations', icon: '✨' },
    { id: 'patterns', name: 'Patterns', icon: '📐' }
  ];
  
  const notifications = $state([]);
  
  function addNotification(type) {
    const notification = {
      id: Date.now(),
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
      message: `This is a sample ${type} notification with enhanced styling.`,
      action: type === 'info' ? {
        label: 'Learn More',
        handler: () => logger.info('[DesignShowcase] Action clicked')
      } : null
    };
    
    notifications.push(notification);
  }
</script>

<div class="design-showcase">
  <div class="showcase-header">
    <h1 class="text-display-1 text-gradient">Design System Showcase</h1>
    <p class="text-body-large text-balance">
      Explore the enhanced medical-grade design system with advanced animations, 
      accessibility features, and responsive components.
    </p>
  </div>
  
  <nav class="showcase-nav">
    {#each sections as section}
      <button 
        class="nav-item {activeSection === section.id ? 'active' : ''} hover-lift"
        onclick={() => activeSection = section.id}
      >
        <span class="nav-icon">{section.icon}</span>
        <span class="nav-text">{section.name}</span>
      </button>
    {/each}
  </nav>
  
  <div class="showcase-content">
    {#if activeSection === 'colors'}
      <section class="animate-fade-in">
        <h2 class="text-heading-1">Color System</h2>
        
        <div class="color-section">
          <h3 class="text-heading-2">Primary Colors</h3>
          <div class="color-grid">
            <div class="color-swatch" style="background: var(--color-primary-50)">
              <span class="color-label">Primary 50</span>
            </div>
            <div class="color-swatch" style="background: var(--color-primary-100)">
              <span class="color-label">Primary 100</span>
            </div>
            <div class="color-swatch" style="background: var(--color-primary-200)">
              <span class="color-label">Primary 200</span>
            </div>
            <div class="color-swatch" style="background: var(--color-primary-500); color: white;">
              <span class="color-label">Primary 500</span>
            </div>
            <div class="color-swatch" style="background: var(--color-primary-600); color: white;">
              <span class="color-label">Primary 600</span>
            </div>
            <div class="color-swatch" style="background: var(--color-primary-900); color: white;">
              <span class="color-label">Primary 900</span>
            </div>
          </div>
        </div>
        
        <div class="color-section">
          <h3 class="text-heading-2">Semantic Colors</h3>
          <div class="color-grid">
            <div class="color-swatch" style="background: var(--color-success-500); color: white;">
              <span class="color-label">Success</span>
            </div>
            <div class="color-swatch" style="background: var(--color-warning-500); color: var(--color-gray-900);">
              <span class="color-label">Warning</span>
            </div>
            <div class="color-swatch" style="background: var(--color-danger-500); color: white;">
              <span class="color-label">Error</span>
            </div>
            <div class="color-swatch" style="background: var(--color-info-500); color: white;">
              <span class="color-label">Info</span>
            </div>
          </div>
        </div>
      </section>
      
    {:else if activeSection === 'typography'}
      <section class="animate-slide-up">
        <h2 class="text-heading-1">Typography Scale</h2>
        
        <div class="typography-samples">
          <div class="type-sample">
            <div class="text-display-1">Display 1 - Hero Text</div>
            <code>.text-display-1</code>
          </div>
          
          <div class="type-sample">
            <div class="text-display-2">Display 2 - Large Headers</div>
            <code>.text-display-2</code>
          </div>
          
          <div class="type-sample">
            <div class="text-heading-1">Heading 1 - Section Headers</div>
            <code>.text-heading-1</code>
          </div>
          
          <div class="type-sample">
            <div class="text-heading-2">Heading 2 - Subsection Headers</div>
            <code>.text-heading-2</code>
          </div>
          
          <div class="type-sample">
            <div class="text-body">Body Text - This is the primary text used for content and descriptions. It maintains excellent readability across all devices.</div>
            <code>.text-body</code>
          </div>
          
          <div class="type-sample">
            <div class="text-caption">Caption Text - Used for metadata, timestamps, and supplementary information</div>
            <code>.text-caption</code>
          </div>
          
          <div class="type-sample">
            <div class="text-monospace">Monospace Text - Code and technical content</div>
            <code>.text-monospace</code>
          </div>
        </div>
      </section>
      
    {:else if activeSection === 'components'}
      <section class="animate-scale-in">
        <h2 class="text-heading-1">Enhanced Components</h2>
        
        <div class="component-showcase">
          <div class="component-group">
            <h3 class="text-heading-2">Buttons</h3>
            <div class="button-group">
              <button class="btn btn-primary ripple">Primary Button</button>
              <button class="btn btn-secondary hover-lift">Secondary Button</button>
              <button class="btn btn-success hover-grow">Success Button</button>
              <button class="btn btn-warning hover-glow">Warning Button</button>
              <button class="btn btn-danger animate-heartbeat">Critical Button</button>
            </div>
          </div>
          
          <div class="component-group">
            <h3 class="text-heading-2">Status Indicators</h3>
            <div class="status-grid">
              <div class="status-indicator-enhanced status-indicator-enhanced--success">
                <span class="icon">✓</span> Active
              </div>
              <div class="status-indicator-enhanced status-indicator-enhanced--processing">
                <span class="icon">○</span> Processing
              </div>
              <div class="status-indicator-enhanced status-indicator-enhanced--error">
                <span class="icon">✗</span> Error
              </div>
              <div class="status-indicator-enhanced status-indicator-enhanced--idle">
                <span class="icon">●</span> Idle
              </div>
            </div>
          </div>
          
          <div class="component-group">
            <h3 class="text-heading-2">Messages</h3>
            <div class="message-samples">
              <div class="message message--success">
                <div class="message-icon">✓</div>
                <div class="message-content">
                  <div class="message-title">Success Message</div>
                  <div class="message-description">Operation completed successfully with enhanced styling.</div>
                </div>
                <button class="message-action">Action</button>
              </div>
              
              <div class="message message--warning">
                <div class="message-icon">⚠</div>
                <div class="message-content">
                  <div class="message-title">Warning Message</div>
                  <div class="message-description">Please review the following items before proceeding.</div>
                </div>
              </div>
              
              <div class="message message--medical">
                <div class="message-icon">🏥</div>
                <div class="message-content">
                  <div class="message-title">Medical Alert</div>
                  <div class="message-description">Critical patient information requires immediate attention.</div>
                </div>
                <button class="message-action">Review</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
    {:else if activeSection === 'animations'}
      <section class="animate-bounce-in">
        <h2 class="text-heading-1">Animation System</h2>
        
        <div class="animation-showcase">
          <div class="animation-group">
            <h3 class="text-heading-2">Entrance Animations</h3>
            <div class="animation-grid">
              <div class="animation-demo card animate-fade-in">Fade In</div>
              <div class="animation-demo card animate-slide-up">Slide Up</div>
              <div class="animation-demo card animate-slide-left">Slide Left</div>
              <div class="animation-demo card animate-scale-in">Scale In</div>
            </div>
          </div>
          
          <div class="animation-group">
            <h3 class="text-heading-2">Hover Effects</h3>
            <div class="animation-grid">
              <div class="animation-demo card hover-lift">Hover Lift</div>
              <div class="animation-demo card hover-grow">Hover Grow</div>
              <div class="animation-demo card hover-glow">Hover Glow</div>
              <div class="animation-demo card hover-tilt">Hover Tilt</div>
            </div>
          </div>
          
          <div class="animation-group">
            <h3 class="text-heading-2">Medical Animations</h3>
            <div class="animation-grid">
              <div class="animation-demo card animate-heartbeat">Heartbeat</div>
              <div class="animation-demo card animate-critical-pulse">Critical Pulse</div>
              <div class="animation-demo card status-processing">Processing Scan</div>
              <div class="animation-demo card validation-state validation-state--validating">Validation</div>
            </div>
          </div>
        </div>
      </section>
      
    {:else if activeSection === 'patterns'}
      <section class="animate-slide-right">
        <h2 class="text-heading-1">Design Patterns</h2>
        
        <div class="pattern-showcase">
          <div class="pattern-group">
            <h3 class="text-heading-2">Loading States</h3>
            <div class="loading-patterns">
              <div class="skeleton skeleton-card">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-paragraph"></div>
                <div class="skeleton skeleton-paragraph"></div>
                <div class="skeleton skeleton-paragraph"></div>
                <div class="skeleton skeleton-button"></div>
              </div>
              
              <div class="loading-example">
                <div class="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p class="text-caption">Loading Dots</p>
              </div>
              
              <div class="loading-example">
                <div class="progress-container">
                  <div class="progress-bar" style="width: 65%"></div>
                </div>
                <p class="text-caption">Progress Bar</p>
              </div>
            </div>
          </div>
          
          <div class="pattern-group">
            <h3 class="text-heading-2">Empty States</h3>
            <div class="empty-state">
              <div class="empty-state-icon">📄</div>
              <h4 class="empty-state-title">No Content Available</h4>
              <p class="empty-state-description">
                There's nothing to display here yet. Create your first item to get started.
              </p>
              <a href="#" class="empty-state-action">
                <span class="icon">+</span>
                Create New Item
              </a>
            </div>
          </div>
          
          <div class="pattern-group">
            <h3 class="text-heading-2">Notifications</h3>
            <div class="notification-controls">
              <button class="btn btn-success" onclick={() => addNotification('success')}>Success Notification</button>
              <button class="btn btn-warning" onclick={() => addNotification('warning')}>Warning Notification</button>
              <button class="btn btn-danger" onclick={() => addNotification('error')}>Error Notification</button>
              <button class="btn btn-info" onclick={() => addNotification('info')}>Info Notification</button>
            </div>
          </div>
        </div>
      </section>
    {/if}
  </div>
</div>

<!-- Notification System -->
{#if notifications.length > 0}
  <!-- NotificationSystem component would go here -->
  <div class="notification-container">
    {#each notifications as notification}
      <div class="notification notification--{notification.type} animate-slide-left">
        <div class="notification-content">
          <div class="notification-icon icon-badge icon-badge--{notification.type}">
            {notification.type === 'success' ? '✓' : notification.type === 'warning' ? '⚠' : notification.type === 'error' ? '✗' : 'ℹ'}
          </div>
          <div class="notification-body">
            <div class="notification-title">{notification.title}</div>
            <div class="notification-message">{notification.message}</div>
          </div>
          {#if notification.action}
            <button class="notification-action" onclick={notification.action.handler}>
              {notification.action.label}
            </button>
          {/if}
          <button class="notification-close" onclick={() => {
            const index = notifications.indexOf(notification);
            notifications.splice(index, 1);
          }}>×</button>
        </div>
        <div class="notification-progress">
          <div class="notification-progress-bar"></div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .design-showcase {
    min-height: 100vh;
    background: var(--color-background);
    padding: var(--space-8) var(--space-6);
  }
  
  .showcase-header {
    text-align: center;
    margin-bottom: var(--space-16);
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }
  
  .showcase-header p {
    margin-top: var(--space-6);
  }
  
  .showcase-nav {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
    margin-bottom: var(--space-12);
    flex-wrap: wrap;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-xl);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-weight: var(--font-weight-medium);
  }
  
  .nav-item:hover {
    border-color: var(--color-primary-200);
    color: var(--color-text-primary);
  }
  
  .nav-item.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-text-inverse);
    box-shadow: var(--shadow-md);
  }
  
  .nav-icon {
    font-size: var(--font-size-lg);
  }
  
  .nav-text {
    font-size: var(--font-size-sm);
  }
  
  .showcase-content {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  /* Color System Styles */
  .color-section {
    margin-bottom: var(--space-12);
  }
  
  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-6);
  }
  
  .color-swatch {
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-lg);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast);
  }
  
  .color-swatch:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  /* Typography Styles */
  .typography-samples {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
  
  .type-sample {
    padding: var(--space-6);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .type-sample code {
    align-self: flex-start;
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }
  
  /* Component Showcase Styles */
  .component-showcase {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  .component-group {
    padding: var(--space-6);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }
  
  .button-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }
  
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-4);
  }
  
  .message-samples {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }
  
  /* Animation Showcase Styles */
  .animation-showcase {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  .animation-group {
    padding: var(--space-6);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }
  
  .animation-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-4);
  }
  
  .animation-demo {
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }
  
  /* Pattern Showcase Styles */
  .pattern-showcase {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }
  
  .pattern-group {
    padding: var(--space-6);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }
  
  .loading-patterns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-6);
    margin-top: var(--space-4);
  }
  
  .loading-example {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }
  
  .notification-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .design-showcase {
      padding: var(--space-4) var(--space-4);
    }
    
    .showcase-header {
      margin-bottom: var(--space-8);
    }
    
    .nav-item {
      padding: var(--space-2) var(--space-3);
    }
    
    .nav-text {
      font-size: var(--font-size-xs);
    }
    
    .color-grid,
    .animation-grid,
    .status-grid {
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }
    
    .loading-patterns {
      grid-template-columns: 1fr;
    }
    
    .button-group,
    .notification-controls {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>