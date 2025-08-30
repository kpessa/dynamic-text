# Technical Implementation Specifications for P0 Stories

## Overview

This document provides detailed technical specifications for implementing the P0 restoration stories. Each specification includes data structures, API contracts, implementation patterns, and integration requirements.

---

## Story 1: Stabilize Firebase Save/Load Functionality

### Technical Requirements

#### 1.1 Firebase Data Structure

```typescript
// types/firebase.types.ts
interface SavedConfiguration {
  // Metadata
  id: string;                    // UUID v4
  version: number;               // Schema version for migrations
  createdAt: Timestamp;          // Firebase Timestamp
  updatedAt: Timestamp;          // Firebase Timestamp
  createdBy: string;             // User UID from Firebase Auth
  lastModifiedBy: string;        // User UID from Firebase Auth
  
  // Core Data
  name: string;                  // Configuration name
  description?: string;          // Optional description
  
  // Section Data
  sections: Section[];           // Array of sections
  sectionOrder: string[];        // Array of section IDs for ordering
  
  // Test Data
  testCases: TestCaseMap;        // Map of sectionId -> TestCase[]
  globalTestContext?: TestContext; // Shared test values
  
  // TPN Configuration
  tpnSettings: {
    populationType: 'child' | 'adolescent' | 'adult' | 'neonate';
    defaultValues: Record<string, any>;
    ingredients?: IngredientConfig[];
  };
  
  // State Management
  checksum: string;              // SHA-256 of serialized data
  isDraft: boolean;              // Draft vs published state
  tags?: string[];               // Organization tags
}

interface Section {
  id: string;                    // UUID v4
  title: string;                 // Display title
  type: 'static' | 'dynamic';    // Section type
  content: string;               // HTML or JavaScript code
  enabled: boolean;              // Active/inactive state
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastEditedBy: string;
    version: number;             // For conflict resolution
  };
  
  // Dynamic Section Specific
  dynamicConfig?: {
    timeout: number;             // Execution timeout in ms
    requiredContext: string[];  // Required me.getValue() keys
    exports?: string[];          // Exported variables
  };
}

interface TestCase {
  id: string;                    // UUID v4
  sectionId: string;             // Parent section reference
  name: string;                  // Test case name
  description?: string;          // Test purpose
  
  // Test Configuration
  input: Record<string, any>;    // Input values for me object
  expectedOutput: string;        // Expected HTML output
  
  // Test Metadata
  status?: 'passed' | 'failed' | 'pending';
  lastRun?: Timestamp;
  lastRunDuration?: number;      // Execution time in ms
  errorMessage?: string;         // Failure details
  
  // AI Generation Metadata
  isAIGenerated?: boolean;
  aiModel?: string;
  aiPrompt?: string;
}

type TestCaseMap = Record<string, TestCase[]>;

interface TestContext {
  globalValues: Record<string, any>;
  populationType: string;
  ingredients: any[];
}
```

#### 1.2 Save Implementation

```typescript
// services/firebaseSaveService.ts
class FirebaseSaveService {
  private readonly COLLECTION = 'configurations';
  private readonly BATCH_SIZE = 500; // Firestore batch limit
  
  async saveConfiguration(config: SavedConfiguration): Promise<SaveResult> {
    try {
      // 1. Validate data structure
      const validation = await this.validateConfiguration(config);
      if (!validation.isValid) {
        throw new ValidationError(validation.errors);
      }
      
      // 2. Calculate checksum
      config.checksum = await this.calculateChecksum(config);
      
      // 3. Prepare for save with optimistic locking
      const existingDoc = await this.getExistingDocument(config.id);
      if (existingDoc && existingDoc.checksum !== config.checksum) {
        // Conflict detection
        const resolution = await this.resolveConflict(existingDoc, config);
        if (resolution.action === 'abort') {
          throw new ConflictError('Save aborted due to conflicts');
        }
        config = resolution.merged;
      }
      
      // 4. Use transaction for atomic save
      const result = await firestore.runTransaction(async (transaction) => {
        const docRef = firestore.collection(this.COLLECTION).doc(config.id);
        
        // Save main configuration
        transaction.set(docRef, {
          ...config,
          updatedAt: serverTimestamp(),
          version: increment(1)
        });
        
        // Save large sections separately if needed (> 1MB limit)
        if (this.isLargeConfiguration(config)) {
          await this.saveLargeSections(transaction, config);
        }
        
        // Update user's configuration index
        const userRef = firestore.collection('users')
          .doc(config.lastModifiedBy)
          .collection('configurations')
          .doc(config.id);
          
        transaction.set(userRef, {
          name: config.name,
          updatedAt: serverTimestamp(),
          role: 'owner'
        });
        
        return { success: true, id: config.id };
      });
      
      // 5. Verify save with read-back
      const saved = await this.verifyConfiguration(config.id, config.checksum);
      if (!saved.verified) {
        throw new VerificationError('Save verification failed');
      }
      
      return {
        success: true,
        id: config.id,
        timestamp: saved.timestamp,
        checksum: config.checksum
      };
      
    } catch (error) {
      // Log to monitoring
      console.error('Save failed:', error);
      
      // Attempt local backup
      await this.saveLocalBackup(config);
      
      throw new SaveError('Failed to save configuration', { cause: error });
    }
  }
  
  private async validateConfiguration(config: any): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Required fields
    if (!config.id) errors.push('Missing configuration ID');
    if (!config.sections || !Array.isArray(config.sections)) {
      errors.push('Invalid sections array');
    }
    
    // Section validation
    for (const section of config.sections || []) {
      if (!section.id) errors.push(`Section missing ID`);
      if (!section.type || !['static', 'dynamic'].includes(section.type)) {
        errors.push(`Invalid section type: ${section.type}`);
      }
      if (section.type === 'dynamic' && !section.dynamicConfig) {
        errors.push(`Dynamic section ${section.id} missing config`);
      }
    }
    
    // Size validation
    const size = JSON.stringify(config).length;
    if (size > 10_000_000) { // 10MB limit
      errors.push(`Configuration too large: ${size} bytes`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private async calculateChecksum(config: SavedConfiguration): Promise<string> {
    // Deterministic serialization
    const normalized = this.normalizeForChecksum(config);
    const json = JSON.stringify(normalized, Object.keys(normalized).sort());
    
    // Use Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(json);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
```

#### 1.3 Load Implementation

```typescript
// services/firebaseLoadService.ts
class FirebaseLoadService {
  async loadConfiguration(id: string): Promise<SavedConfiguration> {
    try {
      // 1. Fetch main document
      const docRef = firestore.collection('configurations').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new NotFoundError(`Configuration ${id} not found`);
      }
      
      const data = doc.data() as SavedConfiguration;
      
      // 2. Handle large configurations
      if (data.sections?.length === 0 && data.sectionOrder?.length > 0) {
        // Sections stored separately
        data.sections = await this.loadLargeSections(id, data.sectionOrder);
      }
      
      // 3. Verify data integrity
      const calculatedChecksum = await this.calculateChecksum(data);
      if (calculatedChecksum !== data.checksum) {
        console.warn('Checksum mismatch detected');
        
        // Attempt recovery
        const recovered = await this.attemptRecovery(id);
        if (recovered) {
          data = recovered;
        } else {
          throw new IntegrityError('Data integrity check failed');
        }
      }
      
      // 4. Migrate if needed
      if (data.version < CURRENT_SCHEMA_VERSION) {
        data = await this.migrateConfiguration(data);
      }
      
      // 5. Restore to application state
      await this.restoreToState(data);
      
      return data;
      
    } catch (error) {
      console.error('Load failed:', error);
      
      // Attempt cache recovery
      const cached = await this.loadFromCache(id);
      if (cached) {
        console.warn('Loaded from cache due to error');
        return cached;
      }
      
      throw new LoadError('Failed to load configuration', { cause: error });
    }
  }
  
  private async restoreToState(config: SavedConfiguration): Promise<void> {
    // Update stores in correct order
    
    // 1. Clear existing state
    sectionStore.clear();
    testStore.clear();
    tpnStore.reset();
    
    // 2. Restore TPN settings first (needed for context)
    tpnStore.setPopulationType(config.tpnSettings.populationType);
    tpnStore.setDefaultValues(config.tpnSettings.defaultValues);
    
    // 3. Restore sections
    for (const section of config.sections) {
      sectionStore.addSection(section);
    }
    
    // 4. Restore section order
    sectionStore.reorderSections(config.sectionOrder);
    
    // 5. Restore test cases
    for (const [sectionId, tests] of Object.entries(config.testCases)) {
      testStore.setTestsForSection(sectionId, tests);
    }
    
    // 6. Update UI state
    uiStore.setConfigurationName(config.name);
    uiStore.setLastSaved(config.updatedAt);
    uiStore.setSaveStatus('saved');
  }
}
```

---

## Story 2: Ensure Correct and Secure Dynamic Text Execution

### Technical Requirements

#### 2.1 Web Worker Communication Protocol

```typescript
// types/worker.types.ts
interface WorkerRequest {
  id: string;                    // Request ID for correlation
  type: 'execute' | 'validate' | 'terminate';
  payload: ExecutionPayload | ValidationPayload;
  timeout?: number;              // Max execution time in ms
}

interface ExecutionPayload {
  code: string;                  // JavaScript code to execute
  context: ExecutionContext;     // The 'me' object and other context
  options: {
    enableConsoleLog?: boolean;  // Allow console.log
    enableDebugger?: boolean;    // Allow debugger statements
    strictMode?: boolean;        // Use strict mode
  };
}

interface ExecutionContext {
  // TPN Context (me object)
  values: Record<string, any>;   // Key-value pairs for me.getValue()
  ingredients: Ingredient[];     // Ingredient data
  populationType: string;        // Current population
  
  // Helper functions available
  helpers: {
    formatNumber: boolean;
    formatDate: boolean;
    calculate: boolean;
  };
  
  // Execution metadata
  sectionId: string;
  testMode: boolean;
  userId?: string;
}

interface WorkerResponse {
  id: string;                    // Matching request ID
  type: 'success' | 'error' | 'timeout';
  result?: string;               // HTML output
  error?: WorkerError;
  executionTime: number;         // Time taken in ms
  memoryUsed?: number;          // Memory consumption
  console?: string[];           // Captured console output
}

interface WorkerError {
  message: string;
  type: 'SyntaxError' | 'RuntimeError' | 'SecurityError' | 'TimeoutError';
  line?: number;
  column?: number;
  stack?: string;
}
```

#### 2.2 Secure Execution Implementation

```typescript
// services/secureCodeExecution.ts
class SecureCodeExecutionService {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly MAX_WORKERS = 4;
  private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  
  async initialize(): Promise<void> {
    // Load worker with security headers
    this.worker = new Worker('/workers/codeExecutor.js', {
      type: 'module',
      credentials: 'omit',  // No cookies sent to worker
      name: 'secure-executor'
    });
    
    // Set up message handling
    this.worker.onmessage = (event) => this.handleWorkerMessage(event);
    this.worker.onerror = (error) => this.handleWorkerError(error);
    
    // Initialize worker with security constraints
    await this.configureWorkerSecurity();
  }
  
  async execute(code: string, context: ExecutionContext): Promise<string> {
    const requestId = crypto.randomUUID();
    
    try {
      // 1. Pre-execution validation
      const validation = await this.validateCode(code);
      if (!validation.safe) {
        throw new SecurityError(validation.reason);
      }
      
      // 2. Transform code with Babel
      const transformed = await this.transformCode(code);
      
      // 3. Prepare sandboxed context
      const sandboxedContext = this.createSandboxedContext(context);
      
      // 4. Create execution request
      const request: WorkerRequest = {
        id: requestId,
        type: 'execute',
        payload: {
          code: transformed,
          context: sandboxedContext,
          options: {
            strictMode: true,
            enableConsoleLog: true,
            enableDebugger: false
          }
        },
        timeout: context.testMode ? 10000 : this.DEFAULT_TIMEOUT
      };
      
      // 5. Send to worker with timeout
      const response = await this.sendToWorker(request);
      
      // 6. Post-process result
      return this.processExecutionResult(response);
      
    } catch (error) {
      // Enhanced error reporting
      return this.formatExecutionError(error, code, context);
    }
  }
  
  private async transformCode(code: string): Promise<string> {
    // Wrap in IIFE with injected context
    const wrapped = `
      (function(me, console, undefined) {
        'use strict';
        
        // Prevent global access
        const window = undefined;
        const document = undefined;
        const global = undefined;
        const process = undefined;
        const require = undefined;
        const module = undefined;
        const exports = undefined;
        
        // User code
        ${code}
      })(sandboxedMe, sandboxedConsole);
    `;
    
    // Transform with Babel
    const babel = await this.loadBabel();
    const result = babel.transform(wrapped, {
      presets: ['env'],
      plugins: [
        'transform-strict-mode',
        'transform-block-scoping'
      ]
    });
    
    return result.code;
  }
  
  private createSandboxedContext(context: ExecutionContext): any {
    // Create frozen me object
    const me = Object.freeze({
      getValue: (key: string) => {
        if (!context.values.hasOwnProperty(key)) {
          throw new Error(`Unknown key: ${key}`);
        }
        // Return deep copy to prevent mutation
        return JSON.parse(JSON.stringify(context.values[key]));
      },
      
      getIngredient: (name: string) => {
        const ingredient = context.ingredients.find(i => i.name === name);
        if (!ingredient) {
          throw new Error(`Unknown ingredient: ${name}`);
        }
        return Object.freeze({ ...ingredient });
      },
      
      populationType: context.populationType,
      
      // Safe math functions
      calculate: Object.freeze({
        sum: (...args: number[]) => args.reduce((a, b) => a + b, 0),
        average: (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length,
        round: (num: number, decimals: number = 2) => {
          return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
        }
      })
    });
    
    // Safe console
    const sandboxedConsole = {
      log: (...args: any[]) => {
        // Capture but don't execute
        this.captureConsoleOutput('log', args);
      },
      error: (...args: any[]) => {
        this.captureConsoleOutput('error', args);
      },
      warn: (...args: any[]) => {
        this.captureConsoleOutput('warn', args);
      }
    };
    
    return { me, console: sandboxedConsole };
  }
}
```

#### 2.3 Worker Implementation

```javascript
// public/workers/codeExecutor.js
'use strict';

// Worker-side execution sandbox
let executionTimeout = null;

self.addEventListener('message', async (event) => {
  const { id, type, payload, timeout } = event.data;
  
  if (type === 'execute') {
    executeCode(id, payload, timeout);
  } else if (type === 'terminate') {
    clearTimeout(executionTimeout);
    self.close();
  }
});

function executeCode(id, payload, timeout = 5000) {
  const startTime = performance.now();
  let result = null;
  let error = null;
  
  // Set execution timeout
  executionTimeout = setTimeout(() => {
    self.postMessage({
      id,
      type: 'timeout',
      error: {
        message: `Execution exceeded ${timeout}ms timeout`,
        type: 'TimeoutError'
      },
      executionTime: timeout
    });
    
    // Terminate worker to stop execution
    self.close();
  }, timeout);
  
  try {
    // Create isolated execution context
    const sandbox = {
      sandboxedMe: payload.context.me,
      sandboxedConsole: payload.context.console,
      result: ''
    };
    
    // Execute in strict mode
    const executeFunction = new Function(
      'sandboxedMe',
      'sandboxedConsole',
      `
      'use strict';
      let output = '';
      
      // Capture return value
      const returnValue = (function() {
        ${payload.code}
      })();
      
      // Convert to string
      if (returnValue !== undefined) {
        if (typeof returnValue === 'object') {
          output = JSON.stringify(returnValue, null, 2);
        } else {
          output = String(returnValue);
        }
      }
      
      return output;
      `
    );
    
    // Execute with timeout monitoring
    result = executeFunction(sandbox.sandboxedMe, sandbox.sandboxedConsole);
    
    // Clear timeout on successful execution
    clearTimeout(executionTimeout);
    
    // Send success response
    self.postMessage({
      id,
      type: 'success',
      result: result || '',
      executionTime: performance.now() - startTime,
      memoryUsed: performance.memory?.usedJSHeapSize
    });
    
  } catch (err) {
    clearTimeout(executionTimeout);
    
    // Parse error details
    const errorDetails = {
      message: err.message,
      type: err.name || 'RuntimeError',
      stack: err.stack
    };
    
    // Extract line/column if available
    const lineMatch = err.stack?.match(/:(\d+):(\d+)/);
    if (lineMatch) {
      errorDetails.line = parseInt(lineMatch[1]);
      errorDetails.column = parseInt(lineMatch[2]);
    }
    
    // Send error response
    self.postMessage({
      id,
      type: 'error',
      error: errorDetails,
      executionTime: performance.now() - startTime
    });
  }
}

// Prevent worker from accessing restricted APIs
delete self.importScripts;
delete self.XMLHttpRequest;
delete self.fetch;
delete self.WebSocket;
delete self.localStorage;
delete self.sessionStorage;
```

---

## Story 3: Restore Real-Time Live Preview

### Technical Requirements

#### 3.1 Preview Update Pipeline

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

#### 3.2 Real-time Preview Implementation

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

#### 3.3 Preview Store Integration

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

## Integration Requirements

### Store Synchronization

```typescript
// stores/storeSync.ts
class StoreSynchronizer {
  private unsubscribers: (() => void)[] = [];
  
  initialize() {
    // Section changes trigger preview updates
    this.unsubscribers.push(
      sectionStore.subscribe((sections) => {
        sections.forEach(section => {
          if (section.isDirty) {
            previewService.updatePreview({
              sectionId: section.id,
              content: section.content,
              type: section.type,
              context: section.type === 'dynamic' ? tpnStore.getContext() : undefined,
              priority: 'normal'
            });
          }
        });
      })
    );
    
    // TPN context changes trigger dynamic section re-render
    this.unsubscribers.push(
      tpnStore.subscribe((tpn) => {
        const dynamicSections = sectionStore.getDynamicSections();
        dynamicSections.forEach(section => {
          previewService.updatePreview({
            sectionId: section.id,
            content: section.content,
            type: 'dynamic',
            context: tpn.context,
            priority: 'high'
          });
        });
      })
    );
    
    // Test execution updates preview with test context
    this.unsubscribers.push(
      testStore.subscribe((tests) => {
        const runningTest = tests.find(t => t.status === 'running');
        if (runningTest) {
          previewService.updatePreview({
            sectionId: runningTest.sectionId,
            content: sectionStore.getSection(runningTest.sectionId).content,
            type: 'dynamic',
            context: runningTest.input,
            priority: 'immediate'
          });
        }
      })
    );
  }
  
  destroy() {
    this.unsubscribers.forEach(fn => fn());
  }
}
```

### Error Recovery

```typescript
// services/errorRecovery.ts
class ErrorRecoveryService {
  async handleSaveError(error: Error, config: SavedConfiguration): Promise<void> {
    // 1. Log to monitoring
    await this.logError('save_failed', error, { configId: config.id });
    
    // 2. Attempt local storage backup
    try {
      localStorage.setItem(`backup_${config.id}`, JSON.stringify(config));
      localStorage.setItem(`backup_${config.id}_timestamp`, Date.now().toString());
      
      notificationStore.show({
        type: 'warning',
        message: 'Save failed. Data backed up locally.',
        action: {
          label: 'Retry',
          callback: () => this.retrySave(config)
        }
      });
    } catch (e) {
      // Local storage also failed
      this.offerDownload(config);
    }
  }
  
  async handleLoadError(error: Error, configId: string): Promise<void> {
    // 1. Check for local backup
    const backup = localStorage.getItem(`backup_${configId}`);
    if (backup) {
      const timestamp = localStorage.getItem(`backup_${configId}_timestamp`);
      const age = Date.now() - parseInt(timestamp || '0');
      
      if (age < 86400000) { // Less than 24 hours old
        notificationStore.show({
          type: 'info',
          message: 'Loading from local backup',
          duration: 3000
        });
        
        return JSON.parse(backup);
      }
    }
    
    // 2. Offer to create new or load different
    notificationStore.show({
      type: 'error',
      message: 'Failed to load configuration',
      actions: [
        {
          label: 'Create New',
          callback: () => this.createNew()
        },
        {
          label: 'Load Different',
          callback: () => this.showLoadDialog()
        }
      ]
    });
  }
}
```

---

## Testing Requirements

### Unit Tests

```typescript
// tests/stories/p0-implementation.test.ts
describe('P0 Story Implementation', () => {
  describe('Story 1: Firebase Save/Load', () => {
    test('saves complete configuration', async () => {
      const config = createMockConfiguration();
      const result = await firebaseSaveService.save(config);
      
      expect(result.success).toBe(true);
      expect(result.checksum).toBeDefined();
    });
    
    test('handles save conflicts', async () => {
      const config = createMockConfiguration();
      
      // Simulate concurrent edit
      await firebaseSaveService.save(config);
      config.sections[0].content = 'modified';
      
      const result = await firebaseSaveService.save(config);
      expect(result.conflictResolved).toBe(true);
    });
    
    test('loads and restores state correctly', async () => {
      const saved = await firebaseSaveService.save(mockConfig);
      const loaded = await firebaseLoadService.load(saved.id);
      
      expect(loaded).toEqual(mockConfig);
      expect(sectionStore.sections).toEqual(mockConfig.sections);
    });
  });
  
  describe('Story 2: Dynamic Execution', () => {
    test('executes code with context', async () => {
      const code = 'return me.getValue("test")';
      const context = { values: { test: 42 } };
      
      const result = await codeExecutionService.execute(code, context);
      expect(result).toBe('42');
    });
    
    test('enforces timeout', async () => {
      const code = 'while(true) {}';
      
      await expect(
        codeExecutionService.execute(code, {}, { timeout: 100 })
      ).rejects.toThrow('TimeoutError');
    });
    
    test('prevents global access', async () => {
      const code = 'return window.location';
      
      const result = await codeExecutionService.execute(code, {});
      expect(result).toContain('undefined');
    });
  });
  
  describe('Story 3: Live Preview', () => {
    test('updates preview in real-time', async () => {
      const update = {
        sectionId: 'test-1',
        content: '<h1>Test</h1>',
        type: 'static'
      };
      
      await previewService.updatePreview(update);
      
      const preview = get(previewStore);
      expect(preview.content).toContain('<h1>Test</h1>');
      expect(preview.metrics.renderCount).toBe(1);
    });
    
    test('degrades on poor performance', async () => {
      // Simulate slow renders
      for (let i = 0; i < 5; i++) {
        await previewService.updatePreview(slowUpdate);
      }
      
      const mode = get(previewStore).mode;
      expect(mode).toBe('debounced');
    });
  });
});
```

---

## Performance Benchmarks

### Target Metrics

| Operation | Target | Maximum | Degradation Trigger |
|-----------|--------|---------|-------------------|
| Firebase Save | < 1s | 3s | > 5s |
| Firebase Load | < 500ms | 2s | > 3s |
| Code Execution | < 100ms | 500ms | > 1s |
| Static Preview | < 50ms | 100ms | > 200ms |
| Dynamic Preview | < 200ms | 500ms | > 1s |
| Memory Usage | < 200MB | 400MB | > 500MB |

---

## Deployment Checklist

### Pre-deployment Validation

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Rollback procedures tested
- [ ] Feature flags configured
- [ ] Monitoring alerts configured
- [ ] Error recovery tested
- [ ] Documentation updated

---

*Document Version: 1.0*
*Last Updated: 2025-01-30*
*Author: Sarah (Product Owner)*
*Review Status: Ready for Development*