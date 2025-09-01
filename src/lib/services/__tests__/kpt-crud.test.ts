import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KPTCrudService } from '../KPTCrudService';
import type { CustomKPTFunction, KPTFunctionVersion } from '../KPTCrudService';

describe('KPTCrudService', () => {
  let service: KPTCrudService;

  beforeEach(() => {
    service = new KPTCrudService();
    vi.clearAllMocks();
  });

  describe('createFunction', () => {
    it('should create a new custom KPT function', async () => {
      const newFunction: Omit<CustomKPTFunction, 'id' | 'createdAt' | 'updatedAt' | 'version'> = {
        name: 'customCalc',
        category: 'math',
        signature: 'customCalc(a: number, b: number): number',
        description: 'Custom calculation function',
        example: 'const result = me.kpt.customCalc(5, 3);',
        code: 'return a + b;',
        parameters: [
          { name: 'a', type: 'number', description: 'First number' },
          { name: 'b', type: 'number', description: 'Second number' }
        ],
        returns: 'Sum of two numbers',
        isCustom: true,
        userId: 'test-user'
      };

      const created = await service.createFunction(newFunction);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.name).toBe('customCalc');
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
      expect(created.version).toBe(1);
    });

    it('should reject function with reserved JavaScript keywords', async () => {
      const invalidFunction = {
        name: 'function', // Reserved keyword
        category: 'math' as const,
        signature: 'function(): void',
        description: 'Invalid function',
        code: 'return;',
        isCustom: true,
        userId: 'test-user'
      };

      await expect(service.createFunction(invalidFunction)).rejects.toThrow('reserved keyword');
    });

    it('should reject function with invalid syntax', async () => {
      const invalidFunction = {
        name: 'badSyntax',
        category: 'math' as const,
        signature: 'badSyntax(): void',
        description: 'Bad syntax function',
        code: 'return {{{;', // Invalid syntax
        isCustom: true,
        userId: 'test-user'
      };

      await expect(service.createFunction(invalidFunction)).rejects.toThrow('Invalid function syntax');
    });

    it('should reject function exceeding size limit', async () => {
      const largeCode = 'x'.repeat(10 * 1024 + 1); // Over 10KB
      const largeFunction = {
        name: 'largeFunc',
        category: 'math' as const,
        signature: 'largeFunc(): void',
        description: 'Large function',
        code: largeCode,
        isCustom: true,
        userId: 'test-user'
      };

      await expect(service.createFunction(largeFunction)).rejects.toThrow('exceeds size limit');
    });
  });

  describe('updateFunction', () => {
    it('should update an existing custom function', async () => {
      // First create a function
      const original = await service.createFunction({
        name: 'updateTest',
        category: 'math',
        signature: 'updateTest(x: number): number',
        description: 'Test function',
        code: 'return x * 2;',
        isCustom: true,
        userId: 'test-user'
      });

      // Update it
      const updated = await service.updateFunction(original.id, {
        description: 'Updated description',
        code: 'return x * 3;'
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.code).toBe('return x * 3;');
      expect(updated.version).toBe(2);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime());
    });

    it('should prevent updating built-in functions', async () => {
      await expect(service.updateFunction('built-in-func', {
        description: 'Trying to modify built-in'
      })).rejects.toThrow('Cannot modify built-in function');
    });

    it('should create version history on update', async () => {
      const func = await service.createFunction({
        name: 'versionTest',
        category: 'math',
        signature: 'versionTest(): number',
        description: 'Version test',
        code: 'return 1;',
        isCustom: true,
        userId: 'test-user'
      });

      await service.updateFunction(func.id, { code: 'return 2;' });
      const history = await service.getFunctionHistory(func.id);

      expect(history).toHaveLength(2);
      expect(history[0].version).toBe(1);
      expect(history[1].version).toBe(2);
    });
  });

  describe('deleteFunction', () => {
    it('should delete a custom function', async () => {
      const func = await service.createFunction({
        name: 'deleteTest',
        category: 'math',
        signature: 'deleteTest(): void',
        description: 'Delete test',
        code: 'return;',
        isCustom: true,
        userId: 'test-user'
      });

      await service.deleteFunction(func.id);
      const functions = await service.getAllFunctions();
      
      expect(functions.find(f => f.id === func.id)).toBeUndefined();
    });

    it('should prevent deleting built-in functions', async () => {
      await expect(service.deleteFunction('built-in-func')).rejects.toThrow('Cannot delete built-in function');
    });
  });

  describe('persistence and retrieval', () => {
    it('should persist functions across service instances', async () => {
      const func = await service.createFunction({
        name: 'persistTest',
        category: 'math',
        signature: 'persistTest(): number',
        description: 'Persist test',
        code: 'return 42;',
        isCustom: true,
        userId: 'test-user'
      });

      // Create new service instance
      const newService = new KPTCrudService();
      const functions = await newService.getAllFunctions();
      
      const retrieved = functions.find(f => f.id === func.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('persistTest');
    });

    it('should retrieve all custom functions for a user', async () => {
      const userId = 'test-user-123';
      
      await service.createFunction({
        name: 'userFunc1',
        category: 'math',
        signature: 'userFunc1(): void',
        description: 'User function 1',
        code: 'return;',
        isCustom: true,
        userId
      });

      await service.createFunction({
        name: 'userFunc2',
        category: 'text',
        signature: 'userFunc2(): void',
        description: 'User function 2',
        code: 'return;',
        isCustom: true,
        userId
      });

      const userFunctions = await service.getUserFunctions(userId);
      expect(userFunctions).toHaveLength(2);
      expect(userFunctions.every(f => f.userId === userId)).toBe(true);
    });
  });

  describe('validation', () => {
    it('should validate function syntax before saving', async () => {
      const func = {
        name: 'syntaxTest',
        category: 'math' as const,
        signature: 'syntaxTest(): number',
        description: 'Syntax test',
        code: 'const x = 5; return x * 2;',
        isCustom: true,
        userId: 'test-user'
      };

      const isValid = await service.validateFunction(func);
      expect(isValid.valid).toBe(true);
    });

    it('should detect unsafe code patterns', async () => {
      const unsafeFunc = {
        name: 'unsafeTest',
        category: 'math' as const,
        signature: 'unsafeTest(): void',
        description: 'Unsafe test',
        code: 'eval("alert(1)");', // Unsafe eval
        isCustom: true,
        userId: 'test-user'
      };

      const validation = await service.validateFunction(unsafeFunc);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('unsafe');
    });

    it('should validate function name uniqueness', async () => {
      await service.createFunction({
        name: 'uniqueTest',
        category: 'math',
        signature: 'uniqueTest(): void',
        description: 'Unique test',
        code: 'return;',
        isCustom: true,
        userId: 'test-user'
      });

      const duplicate = {
        name: 'uniqueTest', // Duplicate name
        category: 'text' as const,
        signature: 'uniqueTest(): void',
        description: 'Duplicate test',
        code: 'return;',
        isCustom: true,
        userId: 'test-user'
      };

      await expect(service.createFunction(duplicate)).rejects.toThrow('already exists');
    });

    it('should complete validation within 500ms', async () => {
      const complexCode = `
        function calculate(x, y, z) {
          const result = x * y + z;
          const squared = result * result;
          const cubed = squared * result;
          return Math.sqrt(cubed);
        }
        return calculate(a, b, c);
      `;

      const func = {
        name: 'performanceTest',
        category: 'math' as const,
        signature: 'performanceTest(a: number, b: number, c: number): number',
        description: 'Performance test',
        code: complexCode,
        isCustom: true,
        userId: 'test-user'
      };

      const start = Date.now();
      await service.validateFunction(func);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('versioning', () => {
    it('should track version history for functions', async () => {
      const func = await service.createFunction({
        name: 'versionedFunc',
        category: 'math',
        signature: 'versionedFunc(): number',
        description: 'Version 1',
        code: 'return 1;',
        isCustom: true,
        userId: 'test-user'
      });

      await service.updateFunction(func.id, {
        description: 'Version 2',
        code: 'return 2;'
      });

      await service.updateFunction(func.id, {
        description: 'Version 3',
        code: 'return 3;'
      });

      const history = await service.getFunctionHistory(func.id);
      
      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(1);
      expect(history[0].description).toBe('Version 1');
      expect(history[2].version).toBe(3);
      expect(history[2].description).toBe('Version 3');
    });

    it('should restore previous version of function', async () => {
      const func = await service.createFunction({
        name: 'restoreTest',
        category: 'math',
        signature: 'restoreTest(): number',
        description: 'Original',
        code: 'return 1;',
        isCustom: true,
        userId: 'test-user'
      });

      await service.updateFunction(func.id, {
        description: 'Modified',
        code: 'return 2;'
      });

      await service.restoreVersion(func.id, 1);
      const restored = await service.getFunction(func.id);

      expect(restored?.description).toBe('Original');
      expect(restored?.code).toBe('return 1;');
      expect(restored?.version).toBe(3); // New version after restore
    });
  });

  describe('export/import', () => {
    it('should export functions to JSON format', async () => {
      await service.createFunction({
        name: 'exportFunc1',
        category: 'math',
        signature: 'exportFunc1(): number',
        description: 'Export function 1',
        code: 'return 1;',
        isCustom: true,
        userId: 'test-user'
      });

      await service.createFunction({
        name: 'exportFunc2',
        category: 'text',
        signature: 'exportFunc2(): string',
        description: 'Export function 2',
        code: 'return "test";',
        isCustom: true,
        userId: 'test-user'
      });

      const exported = await service.exportFunctions('test-user');
      
      expect(exported.version).toBe('1.0.0');
      expect(exported.functions).toHaveLength(2);
      expect(exported.metadata.exportedAt).toBeDefined();
      expect(exported.metadata.userId).toBe('test-user');
    });

    it('should import functions from JSON', async () => {
      const importData = {
        version: '1.0.0',
        functions: [
          {
            name: 'importFunc1',
            category: 'math' as const,
            signature: 'importFunc1(): number',
            description: 'Import function 1',
            code: 'return 1;',
            isCustom: true
          },
          {
            name: 'importFunc2',
            category: 'text' as const,
            signature: 'importFunc2(): string',
            description: 'Import function 2',
            code: 'return "test";',
            isCustom: true
          }
        ],
        metadata: {
          exportedAt: new Date().toISOString(),
          userId: 'original-user'
        }
      };

      const result = await service.importFunctions(importData, 'new-user');
      
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      const functions = await service.getUserFunctions('new-user');
      expect(functions).toHaveLength(2);
    });

    it('should handle import conflicts gracefully', async () => {
      // Create existing function
      await service.createFunction({
        name: 'conflictFunc',
        category: 'math',
        signature: 'conflictFunc(): number',
        description: 'Existing function',
        code: 'return 1;',
        isCustom: true,
        userId: 'test-user'
      });

      const importData = {
        version: '1.0.0',
        functions: [
          {
            name: 'conflictFunc', // Same name - conflict
            category: 'text' as const,
            signature: 'conflictFunc(): string',
            description: 'Imported function',
            code: 'return "imported";',
            isCustom: true
          }
        ],
        metadata: {
          exportedAt: new Date().toISOString(),
          userId: 'other-user'
        }
      };

      const result = await service.importFunctions(importData, 'test-user', {
        conflictResolution: 'skip'
      });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.conflicts).toContain('conflictFunc');
    });

    it('should validate import data structure', async () => {
      const invalidData = {
        version: '2.0.0', // Unsupported version
        functions: 'not-an-array', // Invalid structure
        metadata: {}
      };

      await expect(service.importFunctions(invalidData as any, 'test-user'))
        .rejects.toThrow('Invalid import format');
    });
  });
});