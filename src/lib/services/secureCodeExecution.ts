/**
 * Secure Code Execution Service
 * Uses Web Workers to safely execute user-provided JavaScript code
 */

import { logError, logWarn } from '$lib/logger';
import DOMPurify from 'dompurify';

interface ExecutionResult {
  result: any;
  executionTime: number;
  success: boolean;
  error?: string;
}

interface WorkerMessage {
  id: string;
  type: string;
  payload?: any;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
  stack?: string;
}

class SecureCodeExecutor {
  private worker: Worker | null = null;
  private pendingExecutions = new Map<string, { resolve: Function; reject: Function }>();
  private messageId = 0;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the Web Worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Create the Web Worker
      this.worker = new Worker('/workers/codeWorker.js');

      // Set up message handling
      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        logError('Worker error:', new Error(error.message || 'Worker error occurred'));
        this.handleWorkerError(error);
      };

      // Initialize the worker
      await this.sendMessage('INITIALIZE', {});
      
      this.isInitialized = true;
    } catch (error) {
      logError('Failed to initialize code worker:', error as Error);
      throw error;
    }
  }

  /**
   * Execute JavaScript code securely in a Web Worker
   */
  async executeCode(code: string, context: any = {}): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await this.sendMessage('EXECUTE_CODE', {
        code,
        context
      });
      return result as ExecutionResult;
    } catch (error) {
      return {
        result: null,
        executionTime: 0,
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Execute code with TPN context
   */
  async executeWithTPN(code: string, tpnValues: Record<string, any> = {}, ingredientValues: Record<string, any> = {}): Promise<string> {
    try {
      const context = {
        tpnValues,
        ingredientValues
      };

      const result = await this.executeCode(code, context);
      
      if (result.success) {
        return result.result !== undefined ? String(result.result) : '';
      } else {
        return `<span style="color: red;">Error: ${result.error}</span>`;
      }
    } catch (error) {
      logError('Code execution failed:', error as Error);
      return `<span style="color: red;">Error: ${(error as Error).message}</span>`;
    }
  }

  /**
   * Validate code syntax without executing
   */
  async validateCode(code: string): Promise<{ valid: boolean; errors: any[] }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await this.sendMessage('VALIDATE_CODE', { code });
      return result as { valid: boolean; errors: any[] };
    } catch (error) {
      return {
        valid: false,
        errors: [{ message: (error as Error).message }]
      };
    }
  }

  /**
   * Send a message to the worker
   */
  private sendMessage(type: string, payload?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = `msg_${++this.messageId}`;
      const message: WorkerMessage = { id, type, payload };

      // Store the promise resolvers
      this.pendingExecutions.set(id, { resolve, reject });

      // Send the message
      this.worker.postMessage(message);

      // Set a timeout
      setTimeout(() => {
        if (this.pendingExecutions.has(id)) {
          this.pendingExecutions.delete(id);
          reject(new Error('Worker timeout'));
        }
      }, 10000); // 10 second timeout
    });
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(response: WorkerResponse) {
    const pending = this.pendingExecutions.get(response.id);
    if (!pending) {
      logWarn('Received response for unknown message:', response.id);
      return;
    }

    this.pendingExecutions.delete(response.id);

    if (response.success) {
      pending.resolve(response.result);
    } else {
      pending.reject(new Error(response.error || 'Worker operation failed'));
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(_error: ErrorEvent) {
    // Reject all pending executions
    this.pendingExecutions.forEach(({ reject }) => {
      reject(new Error('Worker crashed'));
    });
    this.pendingExecutions.clear();

    // Try to restart the worker
    this.restart();
  }

  /**
   * Restart the worker
   */
  private async restart() {
    this.terminate();
    this.isInitialized = false;
    this.initPromise = null;
    
    try {
      await this.initialize();
    } catch (error) {
      logError('Failed to restart worker:', error as Error);
    }
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingExecutions.clear();
    this.isInitialized = false;
  }

  /**
   * Get performance metrics from the worker
   */
  async getPerformanceMetrics(): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await this.sendMessage('GET_PERFORMANCE_METRICS');
    } catch (error) {
      logError('Failed to get performance metrics:', error as Error);
      return null;
    }
  }

  /**
   * Clear the worker's cache
   */
  async clearCache(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.sendMessage('CLEAR_CACHE');
    } catch (error) {
      logError('Failed to clear cache:', error as Error);
    }
  }
}

// Export singleton instance
let _instance: SecureCodeExecutor | null = null;

export function getSecureCodeExecutor(): SecureCodeExecutor {
  if (!_instance) {
    _instance = new SecureCodeExecutor();
  }
  return _instance;
}

// Convenience functions
export async function executeCodeSecurely(code: string, context: any = {}): Promise<ExecutionResult> {
  const executor = getSecureCodeExecutor();
  return executor.executeCode(code, context);
}

export async function executeWithTPNContext(code: string, tpnValues: Record<string, any> = {}, ingredientValues: Record<string, any> = {}): Promise<string> {
  const executor = getSecureCodeExecutor();
  return executor.executeWithTPN(code, tpnValues, ingredientValues);
}

export async function validateCodeSyntax(code: string): Promise<{ valid: boolean; errors: any[] }> {
  const executor = getSecureCodeExecutor();
  return executor.validateCode(code);
}

// HTML sanitization function
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['style'],
    ADD_ATTR: ['style']
  });
}

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const executor = getSecureCodeExecutor();
    executor.terminate();
  });
}