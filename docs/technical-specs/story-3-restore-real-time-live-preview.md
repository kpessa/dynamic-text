# Story 3: Restore Real-Time Live Preview

## Technical Requirements

### 3.1 Preview Update Pipeline

```typescript
// types/preview.types.ts
interface PreviewState {
  mode: 'realtime' | 'debounced' | 'manual';
  content: string;               // Current rendered content
  isRendering: boolean;
  lastRenderTime: number;        // Performance tracking
  error: PreviewError | null;
  
  // Performance metrics
  metrics: {
    renderCount: number;
    averageRenderTime: number;
    lastRenderTimestamp: number;
    memoryUsage: number;
  };
}

interface PreviewUpdate {
  sectionId: string;
  content: string;
  type: 'static' | 'dynamic';
  context?: ExecutionContext;    // For dynamic sections
  priority: 'immediate' | 'high' | 'normal' | 'low';
}

interface PreviewRenderer {
  render(update: PreviewUpdate): Promise<string>;
  cancel(): void;
  getMetrics(): RenderMetrics;
}
```

### 3.2 Real-time Preview Implementation

```typescript
// services/previewService.ts
class PreviewService {
  private renderer: PreviewRenderer;
  private updateQueue: PriorityQueue<PreviewUpdate>;
  private renderCache: LRUCache<string, string>;
  private debouncers: Map<string, DebouncedFunction>;
  
  constructor() {
    this.renderer = new OptimizedRenderer();
    this.updateQueue = new PriorityQueue();
    this.renderCache = new LRUCache(50); // Cache last 50 renders
    this.debouncers = new Map();
  }
  
  async updatePreview(update: PreviewUpdate): Promise<void> {
    // Check if real-time is enabled
    const mode = get(previewStore).mode;
    
    switch (mode) {
      case 'realtime':
        await this.updateRealtime(update);
        break;
      case 'debounced':
        await this.updateDebounced(update);
        break;
      case 'manual':
        this.queueManualUpdate(update);
        break;
    }
  }
  
  private async updateRealtime(update: PreviewUpdate): Promise<void> {
    // Cancel any pending debounced updates for this section
    this.cancelDebounced(update.sectionId);
    
    // Check cache first
    const cacheKey = this.getCacheKey(update);
    const cached = this.renderCache.get(cacheKey);
    
    if (cached) {
      this.applyPreviewUpdate(update.sectionId, cached);
      return;
    }
    
    // Add to priority queue
    this.updateQueue.enqueue(update, this.getPriority(update));
    
    // Process queue
    await this.processUpdateQueue();
  }
  
  private async updateDebounced(update: PreviewUpdate): Promise<void> {
    const sectionId = update.sectionId;
    
    // Get or create debouncer for this section
    if (!this.debouncers.has(sectionId)) {
      this.debouncers.set(sectionId, debounce(
        (update: PreviewUpdate) => this.performUpdate(update),
        this.getDebounceDelay(update)
      ));
    }
    
    const debounced = this.debouncers.get(sectionId)!;
    debounced(update);
  }
  
  private async performUpdate(update: PreviewUpdate): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Set rendering state
      previewStore.setRendering(true);
      
      // Render based on type
      let rendered: string;
      
      if (update.type === 'static') {
        rendered = await this.renderStatic(update);
      } else {
        rendered = await this.renderDynamic(update);
      }
      
      // Update cache
      const cacheKey = this.getCacheKey(update);
      this.renderCache.set(cacheKey, rendered);
      
      // Apply to preview
      this.applyPreviewUpdate(update.sectionId, rendered);
      
      // Update metrics
      this.updateMetrics(performance.now() - startTime);
      
      // Check performance and auto-degrade if needed
      this.checkPerformanceAndDegrade();
      
    } catch (error) {
      console.error('Preview render failed:', error);
      previewStore.setError({
        sectionId: update.sectionId,
        message: error.message,
        type: 'RenderError'
      });
    } finally {
      previewStore.setRendering(false);
    }
  }
  
  private async renderStatic(update: PreviewUpdate): Promise<string> {
    // Sanitize HTML
    const sanitized = DOMPurify.sanitize(update.content, {
      ALLOWED_TAGS: ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                     'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'strong',
                     'em', 'br', 'hr', 'a', 'img', 'pre', 'code'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'style']
    });
    
    return sanitized;
  }
  
  private async renderDynamic(update: PreviewUpdate): Promise<string> {
    if (!update.context) {
      throw new Error('Dynamic section requires execution context');
    }
    
    // Execute code in sandbox
    const codeService = new SecureCodeExecutionService();
    const result = await codeService.execute(update.content, update.context);
    
    // Sanitize output
    return DOMPurify.sanitize(result);
  }
  
  private applyPreviewUpdate(sectionId: string, content: string): void {
    // Get preview container
    const container = document.querySelector(`[data-preview-section="${sectionId}"]`);
    if (!container) {
      console.warn(`Preview container not found for section ${sectionId}`);
      return;
    }
    
    // Use morphdom for efficient DOM updates
    morphdom(container, `<div data-preview-section="${sectionId}">${content}</div>`, {
      onBeforeElUpdated: (fromEl, toEl) => {
        // Preserve scroll position
        if (fromEl.scrollTop > 0) {
          toEl.scrollTop = fromEl.scrollTop;
        }
        return true;
      }
    });
    
    // Trigger preview updated event
    window.dispatchEvent(new CustomEvent('preview-updated', {
      detail: { sectionId, timestamp: Date.now() }
    }));
  }
  
  private checkPerformanceAndDegrade(): void {
    const metrics = get(previewStore).metrics;
    
    // Auto-degrade if performance is poor
    if (metrics.averageRenderTime > 200) {
      console.warn('Preview performance degraded, switching to debounced mode');
      previewStore.setMode('debounced');
      
      // Notify user
      notificationStore.show({
        type: 'warning',
        message: 'Preview switched to debounced mode for better performance',
        duration: 5000
      });
    }
    
    // Check memory usage
    if (performance.memory && performance.memory.usedJSHeapSize > 500_000_000) {
      console.warn('High memory usage detected');
      this.renderCache.clear();
    }
  }
}
```

### 3.3 Preview Store Integration

```typescript
// stores/previewStore.svelte.ts
class PreviewStore {
  // Svelte 5 runes
  mode = $state<'realtime' | 'debounced' | 'manual'>('debounced');
  content = $state<string>('');
  isRendering = $state<boolean>(false);
  error = $state<PreviewError | null>(null);
  metrics = $state<PreviewMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTimestamp: 0,
    memoryUsage: 0
  });
  
  // Derived state
  canRender = $derived(() => !this.isRendering && this.mode !== 'manual');
  performanceScore = $derived(() => {
    if (this.metrics.averageRenderTime < 50) return 'excellent';
    if (this.metrics.averageRenderTime < 100) return 'good';
    if (this.metrics.averageRenderTime < 200) return 'fair';
    return 'poor';
  });
  
  // Methods
  setMode(mode: 'realtime' | 'debounced' | 'manual') {
    this.mode = mode;
    localStorage.setItem('preview.mode', mode);
  }
  
  setContent(content: string) {
    this.content = content;
  }
  
  setRendering(rendering: boolean) {
    this.isRendering = rendering;
  }
  
  setError(error: PreviewError | null) {
    this.error = error;
  }
  
  updateMetrics(renderTime: number) {
    const count = this.metrics.renderCount + 1;
    const avgTime = (this.metrics.averageRenderTime * this.metrics.renderCount + renderTime) / count;
    
    this.metrics = {
      renderCount: count,
      averageRenderTime: Math.round(avgTime),
      lastRenderTimestamp: Date.now(),
      memoryUsage: performance.memory?.usedJSHeapSize || 0
    };
  }
  
  reset() {
    this.content = '';
    this.error = null;
    this.metrics = {
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderTimestamp: 0,
      memoryUsage: 0
    };
  }
}

export const previewStore = new PreviewStore();
```

---
