import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KPTCrudService } from '../KPTCrudService';
import type { CustomKPTFunction } from '../KPTCrudService';

describe('KPT Custom Function Integration', () => {
  let service: KPTCrudService;
  let worker: Worker;

  beforeEach(() => {
    service = new KPTCrudService();
    // Mock worker for testing
    worker = {
      postMessage: vi.fn(),
      onmessage: null,
      terminate: vi.fn()
    } as any;
  });

  afterEach(() => {
    if (worker) {
      worker.terminate();
    }
  });

  describe('custom function execution in worker context', () => {
    it('should execute custom function alongside built-in functions', async () => {
      // Create custom function
      const customFunc = await service.createFunction({
        name: 'customDouble',
        category: 'math',
        signature: 'customDouble(n: number): number',
        description: 'Doubles a number',
        code: 'return n * 2;',
        isCustom: true,
        userId: 'test-user'
      });

      // Simulate worker execution context
      const workerContext = {
        me: {
          kpt: {},
          getValue: (key: string) => 100
        }
      };

      // Merge custom functions into namespace
      const mergedNamespace = await service.mergeCustomFunctions(workerContext.me.kpt, 'test-user');
      
      expect(mergedNamespace.customDouble).toBeDefined();
      expect(typeof mergedNamespace.customDouble).toBe('function');
      
      // Execute the custom function
      const result = mergedNamespace.customDouble(5);
      expect(result).toBe(10);
    });

    it('should handle custom functions with TPN context access', async () => {
      const customFunc = await service.createFunction({
        name: 'tpnCalculator',
        category: 'tpn',
        signature: 'tpnCalculator(multiplier: number): number',
        description: 'Calculates based on TPN values',
        code: `
          const baseValue = this.getValue('protein');
          return baseValue * multiplier;
        `,
        isCustom: true,
        userId: 'test-user'
      });

      const workerContext = {
        me: {
          kpt: {},
          getValue: (key: string) => key === 'protein' ? 50 : 0
        }
      };

      const mergedNamespace = await service.mergeCustomFunctions(workerContext.me.kpt, 'test-user');
      
      // Bind context for function execution
      const boundFunction = mergedNamespace.tpnCalculator.bind(workerContext.me);
      const result = boundFunction(2);
      
      expect(result).toBe(100);
    });

    it('should isolate custom functions from each other', async () => {
      await service.createFunction({
        name: 'func1',
        category: 'math',
        signature: 'func1(): number',
        description: 'Function 1',
        code: 'const x = 10; return x;',
        isCustom: true,
        userId: 'test-user'
      });

      await service.createFunction({
        name: 'func2',
        category: 'math',
        signature: 'func2(): number',
        description: 'Function 2',
        code: 'const x = 20; return x;', // Same variable name, different value
        isCustom: true,
        userId: 'test-user'
      });

      const workerContext = { me: { kpt: {} } };
      const namespace = await service.mergeCustomFunctions(workerContext.me.kpt, 'test-user');
      
      expect(namespace.func1()).toBe(10);
      expect(namespace.func2()).toBe(20);
    });
  });

  describe('namespace merging', () => {
    it('should merge custom functions with built-in functions', async () => {
      // Mock built-in functions
      const builtInNamespace = {
        redText: (text: string) => `<span style="color:red">${text}</span>`,
        roundTo: (num: number, decimals: number = 2) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
      };

      await service.createFunction({
        name: 'customFormat',
        category: 'text',
        signature: 'customFormat(text: string): string',
        description: 'Custom formatter',
        code: 'return text.toUpperCase();',
        isCustom: true,
        userId: 'test-user'
      });

      const merged = await service.mergeCustomFunctions(builtInNamespace, 'test-user');
      
      // Check built-in functions still exist
      expect(merged.redText).toBeDefined();
      expect(merged.roundTo).toBeDefined();
      
      // Check custom function was added
      expect(merged.customFormat).toBeDefined();
      
      // Test all functions work
      expect(merged.redText('test')).toContain('color:red');
      expect(merged.roundTo(3.14159, 2)).toBe(3.14);
      expect(merged.customFormat('hello')).toBe('HELLO');
    });

    it('should handle custom function overriding built-in function names', async () => {
      const builtInNamespace = {
        calculate: (a: number, b: number) => a + b
      };

      await service.createFunction({
        name: 'calculate', // Same name as built-in
        category: 'math',
        signature: 'calculate(a: number, b: number): number',
        description: 'Override built-in',
        code: 'return a * b;', // Different implementation
        isCustom: true,
        userId: 'test-user'
      });

      const merged = await service.mergeCustomFunctions(builtInNamespace, 'test-user', {
        allowOverride: false
      });

      // Built-in should be preserved when override is not allowed
      expect(merged.calculate(2, 3)).toBe(5); // Addition, not multiplication
      
      const mergedWithOverride = await service.mergeCustomFunctions(builtInNamespace, 'test-user', {
        allowOverride: true
      });

      // Custom should override when allowed
      expect(mergedWithOverride.calculate(2, 3)).toBe(6); // Multiplication
    });

    it('should handle namespace conflicts with warning', async () => {
      const builtInNamespace = {
        existingFunc: () => 'built-in'
      };

      await service.createFunction({
        name: 'existingFunc',
        category: 'text',
        signature: 'existingFunc(): string',
        description: 'Conflicting function',
        code: 'return "custom";',
        isCustom: true,
        userId: 'test-user'
      });

      const conflicts: string[] = [];
      const merged = await service.mergeCustomFunctions(builtInNamespace, 'test-user', {
        onConflict: (name) => conflicts.push(name)
      });

      expect(conflicts).toContain('existingFunc');
    });
  });

  describe('error handling in custom functions', () => {
    it('should catch and report errors in custom functions', async () => {
      await service.createFunction({
        name: 'errorFunc',
        category: 'math',
        signature: 'errorFunc(): void',
        description: 'Function with error',
        code: 'throw new Error("Custom error");',
        isCustom: true,
        userId: 'test-user'
      });

      const namespace = await service.mergeCustomFunctions({}, 'test-user');
      
      expect(() => namespace.errorFunc()).toThrow('Custom error');
    });

    it('should sandbox custom function execution', async () => {
      await service.createFunction({
        name: 'sandboxTest',
        category: 'utility',
        signature: 'sandboxTest(): void',
        description: 'Sandboxed function',
        code: `
          // These should not be accessible in sandboxed environment
          try {
            window.alert('test');
          } catch (e) {
            return 'window blocked';
          }
        `,
        isCustom: true,
        userId: 'test-user'
      });

      const namespace = await service.mergeCustomFunctions({}, 'test-user');
      const result = namespace.sandboxTest();
      
      expect(result).toBe('window blocked');
    });

    it('should handle async custom functions', async () => {
      await service.createFunction({
        name: 'asyncFunc',
        category: 'utility',
        signature: 'asyncFunc(): Promise<string>',
        description: 'Async function',
        code: `
          return new Promise(resolve => {
            setTimeout(() => resolve('async result'), 10);
          });
        `,
        isCustom: true,
        userId: 'test-user'
      });

      const namespace = await service.mergeCustomFunctions({}, 'test-user');
      const result = await namespace.asyncFunc();
      
      expect(result).toBe('async result');
    });
  });

  describe('performance', () => {
    it('should handle large number of custom functions efficiently', async () => {
      // Create 50 custom functions
      const createPromises = [];
      for (let i = 0; i < 50; i++) {
        createPromises.push(service.createFunction({
          name: `func${i}`,
          category: 'math',
          signature: `func${i}(x: number): number`,
          description: `Function ${i}`,
          code: `return x * ${i};`,
          isCustom: true,
          userId: 'test-user'
        }));
      }
      
      await Promise.all(createPromises);

      const start = Date.now();
      const namespace = await service.mergeCustomFunctions({}, 'test-user');
      const mergeTime = Date.now() - start;

      expect(mergeTime).toBeLessThan(100); // Should merge quickly
      expect(Object.keys(namespace).length).toBe(50);
      
      // Test a few functions
      expect(namespace.func10(5)).toBe(50);
      expect(namespace.func25(2)).toBe(50);
    });

    it('should cache compiled functions for performance', async () => {
      await service.createFunction({
        name: 'cachedFunc',
        category: 'math',
        signature: 'cachedFunc(x: number): number',
        description: 'Cached function',
        code: 'return x * x;',
        isCustom: true,
        userId: 'test-user'
      });

      // First merge - compiles function
      const start1 = Date.now();
      const namespace1 = await service.mergeCustomFunctions({}, 'test-user');
      const time1 = Date.now() - start1;

      // Second merge - should use cached version
      const start2 = Date.now();
      const namespace2 = await service.mergeCustomFunctions({}, 'test-user');
      const time2 = Date.now() - start2;

      expect(time2).toBeLessThan(time1); // Cached should be faster
      expect(namespace2.cachedFunc(5)).toBe(25);
    });
  });
});