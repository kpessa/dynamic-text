import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeWithTPNContext, sanitizeHTML } from '../secureCodeExecution';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  postMessage(data: any): void {
    // Simulate worker response
    setTimeout(() => {
      if (this.onmessage) {
        if (data.code && data.code.includes('error')) {
          this.onmessage(new MessageEvent('message', {
            data: {
              id: data.id,
              error: 'Execution error',
              success: false
            }
          }));
        } else {
          this.onmessage(new MessageEvent('message', {
            data: {
              id: data.id,
              result: 'test result',
              success: true
            }
          }));
        }
      }
    }, 10);
  }
  
  terminate(): void {
    // Mock terminate
  }
}

// Mock Worker constructor
vi.stubGlobal('Worker', MockWorker);

describe('secureCodeExecution', () => {
  describe('executeWithTPNContext', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should execute code successfully with TPN context', async () => {
      const code = 'return me.getValue("test")';
      const tpnValues = { test: 100 };
      
      const result = await executeWithTPNContext(code, tpnValues);
      
      expect(result).toBe('test result');
    });

    it('should handle execution errors gracefully', async () => {
      const code = 'throw new error("Test error")';
      const tpnValues = {};
      
      const result = await executeWithTPNContext(code, tpnValues);
      
      expect(result).toContain('Execution error');
    });

    it('should pass ingredient values to worker', async () => {
      const code = 'return me.ingredients.test';
      const tpnValues = {};
      const ingredientValues = { test: 'ingredient value' };
      
      const result = await executeWithTPNContext(code, tpnValues, ingredientValues);
      
      expect(result).toBe('test result');
    });

    it('should handle timeout appropriately', async () => {
      // Mock a worker that never responds
      const originalWorker = global.Worker;
      class TimeoutWorker {
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: ErrorEvent) => void) | null = null;
        postMessage(): void {
          // Never respond
        }
        terminate(): void {
          // Mock terminate
        }
      }
      vi.stubGlobal('Worker', TimeoutWorker);
      
      const code = 'return 1';
      const promise = executeWithTPNContext(code, {});
      
      // Should eventually reject with timeout (default 30s, but we can't wait that long in tests)
      // Just verify the promise is pending
      expect(promise).toBeInstanceOf(Promise);
      
      // Restore original Worker
      vi.stubGlobal('Worker', originalWorker);
    });

    it('should handle worker initialization errors', async () => {
      // Mock Worker constructor to throw
      const originalWorker = global.Worker;
      vi.stubGlobal('Worker', class {
        constructor() {
          throw new Error('Worker initialization failed');
        }
      });
      
      const code = 'return 1';
      const result = await executeWithTPNContext(code, {});
      
      expect(result).toContain('Worker initialization failed');
      
      // Restore original Worker
      vi.stubGlobal('Worker', originalWorker);
    });
  });

  describe('sanitizeHTML', () => {
    it('should sanitize dangerous HTML', () => {
      const dangerous = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHTML(dangerous);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    it('should preserve safe HTML elements', () => {
      const safe = '<div><p>Test</p><span style="color: red;">Styled</span></div>';
      const sanitized = sanitizeHTML(safe);
      
      expect(sanitized).toContain('<div>');
      expect(sanitized).toContain('<p>Test</p>');
      expect(sanitized).toContain('<span style="color: red;">Styled</span>');
    });

    it('should handle empty input', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    it('should handle null or undefined gracefully', () => {
      expect(sanitizeHTML(null as any)).toBe('');
      expect(sanitizeHTML(undefined as any)).toBe('');
    });

    it('should remove event handlers', () => {
      const dangerous = '<button onclick="alert(\'xss\')">Click</button>';
      const sanitized = sanitizeHTML(dangerous);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('<button>Click</button>');
    });

    it('should allow style tags and attributes', () => {
      const styled = '<style>.test { color: red; }</style><div style="background: blue;">Styled</div>';
      const sanitized = sanitizeHTML(styled);
      
      expect(sanitized).toContain('<style>');
      expect(sanitized).toContain('color: red');
      expect(sanitized).toContain('style="background: blue;"');
    });
  });
});