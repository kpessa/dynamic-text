/**
 * Tests for Lazy Babel Loading
 * Validates dynamic loading and performance optimization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  loadBabel, 
  isBabelLoaded, 
  transformCode, 
  preloadBabel, 
  getBabelLoadingStatus 
} from '../lazyBabel';

// Mock Babel module
const mockBabel = {
  transform: vi.fn((code: string, _options: any) => ({
    code: `transformed: ${code}`,
    map: null,
    ast: null
  }))
};

// Mock dynamic import
vi.mock('@babel/standalone', () => mockBabel);

describe('Lazy Babel Loader', () => {
  beforeEach(() => {
    // Reset module state between tests
    vi.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should start in not-loaded state', () => {
      expect(getBabelLoadingStatus()).toBe('not-loaded');
      expect(isBabelLoaded()).toBe(false);
    });

    it('should transition through loading states', async () => {
      expect(getBabelLoadingStatus()).toBe('not-loaded');
      
      const loadPromise = loadBabel();
      expect(getBabelLoadingStatus()).toBe('loading');
      
      await loadPromise;
      expect(getBabelLoadingStatus()).toBe('loaded');
      expect(isBabelLoaded()).toBe(true);
    });

    it('should return same instance when loaded multiple times', async () => {
      const babel1 = await loadBabel();
      const babel2 = await loadBabel();
      
      expect(babel1).toBe(babel2);
      expect(babel1).toBe(mockBabel);
    });

    it('should return same promise when called during loading', async () => {
      const promise1 = loadBabel();
      const promise2 = loadBabel();
      
      expect(promise1).toBe(promise2);
      
      const [babel1, babel2] = await Promise.all([promise1, promise2]);
      expect(babel1).toBe(babel2);
    });
  });

  describe('Code Transformation', () => {
    it('should transform code after loading', async () => {
      const code = 'const x = 5;';
      const result = await transformCode(code);
      
      expect(mockBabel.transform).toHaveBeenCalledWith(
        code,
        expect.objectContaining({
          presets: ['env'],
          plugins: []
        })
      );
      expect(result).toBe(`transformed: ${code}`);
    });

    it('should pass custom options to Babel', async () => {
      const code = 'const y = 10;';
      const options = { 
        presets: ['react'], 
        plugins: ['transform-arrow-functions'] 
      };
      
      await transformCode(code, options);
      
      expect(mockBabel.transform).toHaveBeenCalledWith(
        code,
        expect.objectContaining(options)
      );
    });

    it('should handle transformation errors', async () => {
      mockBabel.transform.mockImplementationOnce(() => {
        throw new Error('Syntax error');
      });
      
      await expect(transformCode('invalid {{{')).rejects.toThrow('Syntax error');
    });

    it('should handle empty code result', async () => {
      mockBabel.transform.mockReturnValueOnce({
        code: '',
        map: null,
        ast: null
      });
      
      const result = await transformCode('');
      expect(result).toBe('');
    });
  });

  describe('Preloading', () => {
    it('should preload Babel in background', () => {
      expect(getBabelLoadingStatus()).toBe('not-loaded');
      
      preloadBabel();
      expect(getBabelLoadingStatus()).toBe('loading');
    });

    it('should not throw errors during preload', () => {
      // Even if loading fails, preload should not throw
      vi.mock('@babel/standalone', () => {
        throw new Error('Module not found');
      });
      
      expect(() => preloadBabel()).not.toThrow();
    });

    it('should not preload if already loaded', async () => {
      await loadBabel();
      vi.clearAllMocks();
      
      preloadBabel();
      expect(mockBabel.transform).not.toHaveBeenCalled();
    });

    it('should not preload if already loading', () => {
      loadBabel();
      preloadBabel();
      
      // Should return the same loading promise
      expect(getBabelLoadingStatus()).toBe('loading');
    });
  });

  describe('Performance Optimization', () => {
    it('should load Babel only once for multiple transformations', async () => {
      const importSpy = vi.spyOn(await import('@babel/standalone'), 'default', 'get');
      
      await transformCode('code1');
      await transformCode('code2');
      await transformCode('code3');
      
      // Dynamic import should only happen once
      expect(importSpy).toHaveBeenCalledTimes(1);
    });

    it('should cache loading promise during concurrent requests', async () => {
      const promises = [
        transformCode('code1'),
        transformCode('code2'),
        transformCode('code3')
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toContain('transformed');
      expect(results[1]).toContain('transformed');
      expect(results[2]).toContain('transformed');
    });
  });

  describe('Error Handling', () => {
    it('should handle import failures gracefully', async () => {
      // Mock failed import
      const originalImport = (global as any).import;
      (global as any).import = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      
      await expect(loadBabel()).rejects.toThrow('Network error');
      
      // Should reset loading state on failure
      expect(getBabelLoadingStatus()).toBe('not-loaded');
      
      (global as any).import = originalImport;
    });

    it('should retry loading after failure', async () => {
      // First attempt fails
      const originalImport = (global as any).import;
      (global as any).import = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce(mockBabel);
      
      await expect(loadBabel()).rejects.toThrow('First failure');
      
      // Second attempt succeeds
      const babel = await loadBabel();
      expect(babel).toBe(mockBabel);
      expect(getBabelLoadingStatus()).toBe('loaded');
      
      (global as any).import = originalImport;
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory with repeated loads', async () => {
      // Simulate multiple load cycles
      for (let i = 0; i < 10; i++) {
        await loadBabel();
      }
      
      // Should still have single instance
      expect(isBabelLoaded()).toBe(true);
      expect(getBabelLoadingStatus()).toBe('loaded');
    });
  });
});

describe('Integration with Code Execution', () => {
  it('should work with actual transpilation needs', async () => {
    const modernCode = `
      const arrow = () => 'result';
      const template = \`Hello \${name}\`;
      const { x, y } = coords;
    `;
    
    const result = await transformCode(modernCode);
    expect(result).toContain('transformed');
  });

  it('should handle TPN-specific code patterns', async () => {
    const tpnCode = `
      const weight = me.getValue('DoseWeightKG');
      const protein = weight * 2.5;
      return protein.toFixed(2);
    `;
    
    const result = await transformCode(tpnCode);
    expect(result).toBeDefined();
    expect(result).toContain('transformed');
  });
});