# Story 2: Ensure Correct and Secure Dynamic Text Execution

## Technical Requirements

### 2.1 Web Worker Communication Protocol

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

### 2.2 Secure Execution Implementation

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

### 2.3 Worker Implementation

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
